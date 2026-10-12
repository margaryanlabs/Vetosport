import {NextResponse} from "next/server";
import {getApiFootballInPlay,normalizeInPlayOdds} from "@/lib/providers/api-football-inplay";
import {buildVerifiedOddsMatchIndex} from "@/lib/providers/api-football-odds-join";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {journalizeMarketQuotes} from "@/lib/data-plane/journalize";

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
 try {
  const persistence=getPersistence();
  const before=new Date(),asOf=before.toISOString();
  const events=await persistence.listRecentEvents({
   from:new Date(before.getTime()-6*3600000).toISOString(),
   to:new Date(before.getTime()+60*60000).toISOString(),limit:100,
  });
  const football=events.filter(e=>e.event.sport==="football");
  const states=football.length?await persistence.listRecentEventStates({eventIds:football.map(e=>e.id),limit:1200}):[];
  const verified=buildVerifiedOddsMatchIndex({events:football,states,asOf});
  if(verified.map.size===0){
   return NextResponse.json({ok:true,skipped:true,reason:"NO_RECENT_VERIFIED_SCORE_FIXTURES",
     verifiedMatches:0,providerCalled:false,freeQuotaSaved:true},
     {headers:{"Cache-Control":"no-store"}});
  }
  const fetched=await getApiFootballInPlay();
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
  await persistence.appendProviderHealth({
   providerId:"api-football-live-odds",
   status:failures||limited?"degraded":"healthy",
   checkedAt:fetched.fetchedAt,quotaRemaining:fetched.quotaRemaining??undefined,
   message:limited?"FREE quota reserve reached; no quote rows written":failures?
     "Some exact-matched odds failed storage":
     "Sparse 2-hour in-play snapshots, exact provider fixture match only; prices never claimed executable.",
   metadata:{providerRows:fetched.rows.length,mapped,unmatched,skippedStale,quotesWritten,journalRows,failures,
     suspended,lowQuota:limited,requestedPage:1,totalPages:fetched.pagesTotal,
     matchedSourceIdCount:verified.map.size,ambiguousCount:verified.ambiguous.length,
     bookmakerIdentityProvided:false,estimatedCallsPerDay:12},
  });
  return NextResponse.json({ok:failures===0&&!limited,
   source:"api-football-live-odds",mode:"SPARSE_RESEARCH_SNAPSHOTS",
   providerRows:fetched.rows.length,pagesTotal:fetched.pagesTotal,pagesFetched:1,
   mappedFixtures:mapped,unmatched,skippedStale,quotesWritten,journalRows,failures,suspended,
   exactMatchIndex:verified.map.size,ambiguous:verified.ambiguous.length,
   quotaRemaining:fetched.quotaRemaining,quotaReserve:reserve,
   bookmakerIdentitiesVerified:false,livePricesNotGuaranteed:true,
   capturedAt:fetched.fetchedAt,
  },{status:failures?502:200,headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({ok:false,error:"Unable to collect or persist verified in-play odds; no synthetic prices generated."},
    {status:502,headers:{"Cache-Control":"no-store"}});
 }
}
