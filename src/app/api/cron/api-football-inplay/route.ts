import {NextResponse} from "next/server";
import {getApiFootballInPlay,normalizeInPlayOdds} from "@/lib/providers/api-football-inplay";
import {buildVerifiedOddsMatchIndex} from "@/lib/providers/api-football-odds-join";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {journalizeMarketQuotes} from "@/lib/data-plane/journalize";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

export const dynamic="force-dynamic";
/**
 * FREE: 12 calls/day odds + 48 calls/day score; source quota 100/day.
 * Poll only when recent verified score snapshots exist: source does not retain
 * historical live odds, and we cannot safely map without exact fixture id.
 */
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)
   return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
 const enabled=process.env.VETO_API_FOOTBALL_INPLAY_ENABLED==="true";
 if(!enabled||!process.env.API_FOOTBALL_KEY||!persistenceConfiguration().supabaseConfigured)
   return NextResponse.json({ok:true,skipped:true,reason:!enabled?"OPERATOR_OPT_IN_REQUIRED":
     !process.env.API_FOOTBALL_KEY?"API_FOOTBALL_KEY_MISSING":"STORAGE_MISSING"},
     {headers:{"Cache-Control":"no-store"}});
 const persistence=getPersistence();
 let failedStage="LIST_ACTIVE_EVENTS";
 let providerCalled=false;
 try {
  const before=new Date(),asOf=before.toISOString();
  const HOUR=3600000;
  // Storage returns events in ascending kickoff order. Broad -6h/+1h
  // queries hit the 100-row cap with already ended football matches.
  const windows=[[-4,-2],[-2,0.01]] as const;
  const groups=await Promise.all(windows.map(([start,end])=>
   persistence.listRecentEvents({
    from:new Date(before.getTime()+start*HOUR).toISOString(),
    to:new Date(before.getTime()+end*HOUR).toISOString(),
    statuses:["live"],limit:100,
   })
  ));
  const candidateMayBeCapped=groups.some(group=>group.length>=100);
  const all=[...new Map(groups.flat()
   .filter(e=>e.event.sport==="football"&&!isSelfcheckEvent(e))
   .map(e=>[e.id,e])).values()];
  const football=all.filter(e=>{
    const kickoff=Date.parse(e.event.startsAt);
    return Number.isFinite(kickoff)&&kickoff<=before.getTime()&&
      before.getTime()-kickoff<=4*HOUR;
   }).sort((a,b)=>Date.parse(b.event.startsAt)-Date.parse(a.event.startsAt))
    .slice(0,48);
  const states=[] as Awaited<ReturnType<typeof persistence.listRecentEventStates>>;
  failedStage="LOAD_MATCH_SNAPSHOTS";
  for(let i=0;i<football.length;i+=16){
    const ids=football.slice(i,i+16).map(e=>e.id);
    const batch=await persistence.listRecentEventStates({eventIds:ids,limit:1800});
    states.push(...batch);
  }
  const verified=buildVerifiedOddsMatchIndex({events:football,states,asOf});
  if(verified.map.size===0){
   return NextResponse.json({ok:true,skipped:true,reason:"NO_RECENT_VERIFIED_SCORE_FIXTURES",
     verifiedMatches:0,providerCalled:false,freeQuotaSaved:true,
     scannedActiveFixtures:football.length,candidateMayBeCapped},
     {headers:{"Cache-Control":"no-store"}});
  }
  failedStage="FETCH_INPLAY_ODDS";
  providerCalled=true;
  const fetched=await getApiFootballInPlay();
  failedStage="PERSIST_MARKET_QUOTES";
  const reserve=20;
  const limited=fetched.quotaRemaining!==null&&fetched.quotaRemaining<=reserve;
  let mapped=0,unmatched=0,quotesWritten=0,journalRows=0,failures=0,suspended=0;
  let skippedStale=0;
  if(!limited&&fetched.rows.length){
   const matchIds=[...new Set(fetched.rows.map(r=>r.fixture?.id).filter((id):id is number=>typeof id==="number"))];
   const activeIds=matchIds.map(id=>verified.map.get(id)?.eventId).filter((id):id is string=>typeof id==="string");
   const stored=activeIds.length?await persistence.listRecentQuotesForEvents({eventIds:activeIds,limit:1800}):[];
   const seen=new Set(stored.map(q=>[q.eventId,q.provider,q.marketKey,q.selectionKey,q.capturedAt].join("|")));
   for(const row of fetched.rows.slice(0,40)){
    const id=row.fixture?.id;
    if(typeof id!=="number")continue;
    const linked=verified.map.get(id);
    if(!linked){unmatched++;continue;}
    mapped++;
    const normalized=normalizeInPlayOdds(row,linked.eventId,new Date(fetched.fetchedAt));
    if(!normalized.length){skippedStale++;continue;}
    suspended+=normalized.filter(q=>q.suspended).length;
    const filtered=normalized.filter(q=>{
      const key=[linked.eventId,q.sourceProvider,q.marketId,q.selection.id,q.capturedAt].join("|");
      if(seen.has(key))return false;
      seen.add(key);return true;
    }).slice(0,65);
    if(!filtered.length)continue;
    try {
     quotesWritten+=await persistence.appendQuotes(linked.eventId,filtered);
     journalRows+=await persistence.appendTruthJournal(journalizeMarketQuotes({
      canonicalEventId:linked.eventId,sourceProvider:"api-football-live-odds",
      gatewayReceivedAt:fetched.fetchedAt,quotes:filtered,
     }));
    }catch{failures++;}
   }
  }
  const reasonCode=limited?"QUOTA_RESERVE":failures?"STORAGE_WRITE_FAILURE":
    fetched.rows.length>0&&mapped===0?"NO_OVERLAPPING_FIXTURES":
    mapped>0&&quotesWritten===0?"NO_USABLE_BOOKMAKER_QUOTES":null;
  failedStage="WRITE_PROVIDER_HEALTH";
  await persistence.appendProviderHealth({
   providerId:"api-football-live-odds",
   status:reasonCode?"degraded":"healthy",
   checkedAt:fetched.fetchedAt,quotaRemaining:fetched.quotaRemaining??undefined,
   message:limited?"FREE quota reserve reached; no quote rows written":failures?
     "Some exact-matched odds failed storage":
     "Sparse 2-hour in-play snapshots, exact provider fixture match only; prices never claimed executable.",
   metadata:{providerRows:fetched.rows.length,mapped,unmatched,skippedStale,quotesWritten,journalRows,failures,
     suspended,lowQuota:limited,requestedPage:1,totalPages:fetched.pagesTotal,
     matchedSourceIdCount:verified.map.size,ambiguousCount:verified.ambiguous.length,
     bookmakerIdentityProvided:false,estimatedCallsPerDay:12,
     ...(reasonCode?{failureCode:reasonCode}:{}),candidateMayBeCapped,
     scannedActiveFixtures:football.length,providerCalled:true},
  });
  return NextResponse.json({ok:failures===0&&!limited,
   source:"api-football-live-odds",mode:"SPARSE_RESEARCH_SNAPSHOTS",
   providerRows:fetched.rows.length,pagesTotal:fetched.pagesTotal,pagesFetched:1,
   mappedFixtures:mapped,unmatched,skippedStale,quotesWritten,journalRows,failures,suspended,
   exactMatchIndex:verified.map.size,ambiguous:verified.ambiguous.length,
   scannedActiveFixtures:football.length,candidateMayBeCapped,
   ...(reasonCode?{reasonCode}:{}),
   quotaRemaining:fetched.quotaRemaining,quotaReserve:reserve,
   bookmakerIdentitiesVerified:false,livePricesNotGuaranteed:true,
   capturedAt:fetched.fetchedAt,
  },{status:failures?502:200,headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const knownCodes=new Set(["UPSTREAM_DAILY_QUOTA","UPSTREAM_MINUTE_QUOTA",
    "UPSTREAM_SUBSCRIPTION","UPSTREAM_AUTH","UPSTREAM_INVALID_PARAMETERS",
    "UPSTREAM_UNCLASSIFIED","API_FOOTBALL_LIVE_ODDS_BAD_BODY"]);
  const code=error instanceof Error&&knownCodes.has(error.message)?
    error.message:"STORAGE_OR_PROVIDER_FAILURE";
  try{
   await persistence.appendProviderHealth({
    providerId:"api-football-live-odds",status:"degraded",
    checkedAt:new Date().toISOString(),
    message:"In-play source or persistence failed. See sanitized failure code.",
    metadata:{failureCode:code,failedStage,providerCalled,estimatedCallsPerDay:12},
   });
  }catch{/* Do not reveal bridge or provider exceptions. */}
  return NextResponse.json({ok:false,error:code,failedStage,providerCalled,
    bookmakerIdentitiesVerified:false,noSyntheticQuotes:true},
    {status:502,headers:{"Cache-Control":"no-store"}});
 }
}
