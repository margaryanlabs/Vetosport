import {NextResponse} from "next/server";
import {getApiFootballInPlay,normalizeInPlayOdds} from "@/lib/providers/api-football-inplay";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {journalizeMarketQuotes} from "@/lib/data-plane/journalize";

export const dynamic="force-dynamic";
// 12 polls/day + 48 football-state requests = nominal 60/day of FREE 100/day.
// A single first page; do not fetch remaining pages without quota approval.
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)
   return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
 const enabled=process.env.VETO_API_FOOTBALL_INPLAY_ENABLED==="true";
 if(!enabled||!process.env.API_FOOTBALL_KEY||!persistenceConfiguration().supabaseConfigured)
   return NextResponse.json({ok:true,skipped:true,reason:!enabled?"OPERATOR_OPT_IN_REQUIRED":
     !process.env.API_FOOTBALL_KEY?"API_FOOTBALL_KEY_MISSING":"STORAGE_MISSING"}, {headers:{"Cache-Control":"no-store"}});
 try{
  const fetched=await getApiFootballInPlay();
  const reserve=20;
  const limited=fetched.quotaRemaining!==null&&fetched.quotaRemaining<=reserve;
  const persistence=getPersistence();
  let mapped=0,unmatched=0,quotesWritten=0,journalRows=0,failures=0,suspended=0;
  const fetchedFixtureIds=fetched.rows.map(r=>r.fixture?.id).filter((id):id is number=>typeof id==="number");
  if(!limited&&fetchedFixtureIds.length){
   const now=Date.parse(fetched.fetchedAt);
   const events=await persistence.listRecentEvents({
    from:new Date(now-6*3600000).toISOString(),
    to:new Date(now+60*60000).toISOString(),limit:100,
   });
   const football=events.filter(e=>e.event.sport==="football");
   const states=await persistence.listRecentEventStates({eventIds:football.map(e=>e.id),limit:1200});
   const index=new Map<number,string|null>();
   for(const state of states){
    if(state.sourceProvider!=="api-football")continue;
    const id=state.state?.providerEventId;
    if(typeof id!=="number"||!Number.isSafeInteger(id)||!fetchedFixtureIds.includes(id))continue;
    const prev=index.get(id);
    // Multiple canonical entities claiming the same provider fixture => refuse linking.
    if(prev!==undefined&&prev!==state.eventId)index.set(id,null);
    else if(prev===undefined)index.set(id,state.eventId);
   }
   const activeIds=[...new Set([...index.values()].filter((id):id is string=>typeof id==="string"))];
   const storedQuotes=activeIds.length?await persistence.listRecentQuotesForEvents({eventIds:activeIds,limit:1800}):[];
   const seen=new Set(storedQuotes.map(q=>[q.eventId,q.provider,q.marketKey,q.selectionKey,q.capturedAt].join("|")));
   for(const row of fetched.rows.slice(0,18)){
    const id=row.fixture?.id;
    if(typeof id!=="number")continue;
    const eventId=index.get(id);
    if(!eventId){unmatched++;continue;}
    mapped++;
    const normalized=normalizeInPlayOdds(row,eventId,new Date(fetched.fetchedAt));
    suspended+=normalized.filter(q=>q.suspended).length;
    const filtered=normalized.filter(q=>{
      const key=[eventId,q.sourceProvider,q.marketId,q.selection.id,q.capturedAt].join("|");
      if(seen.has(key))return false;
      seen.add(key);return true;
    }).slice(0,65);
    if(!filtered.length)continue;
    try{
      quotesWritten+=await persistence.appendQuotes(eventId,filtered);
      journalRows+=await persistence.appendTruthJournal(journalizeMarketQuotes({
        canonicalEventId:eventId,sourceProvider:"api-football-live-odds",
        gatewayReceivedAt:fetched.fetchedAt,quotes:filtered,
      }));
    }catch{failures++;}
   }
  }
  await persistence.appendProviderHealth({
   providerId:"api-football-live-odds",
   status:failures||limited?"degraded":"healthy",
   checkedAt:fetched.fetchedAt,quotaRemaining:fetched.quotaRemaining??undefined,
   message:limited?"FREE provider daily quota reserve reached; writes skipped.":failures?
     "Some price observations failed storage.":"Live-odds first-page snapshot stored where fixture identities exactly matched; no bookmaker IDs inferred.",
   metadata:{providerRows:fetched.rows.length,mapped,unmatched,quotesWritten,journalRows,failures,
     suspended,lowQuota:limited,requestedPage:1,totalPages:fetched.pagesTotal,
     bookmakerIdentityProvided:false,estimatedCallsPerDay:12},
  });
  return NextResponse.json({ok:failures===0&&!limited,source:"api-football-live-odds",
   providerRows:fetched.rows.length,pagesTotal:fetched.pagesTotal,pagesFetched:1,
   mappedFixtures:mapped,unmatched,quotesWritten,journalRows,failures,suspended,
   quotaRemaining:fetched.quotaRemaining,quotaReserve:reserve,
   bookmakerIdentitiesVerified:false,livePricesNotGuaranteed:true,
   capturedAt:fetched.fetchedAt,
  },{status:failures?502:200,headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({ok:false,error:"Unable to collect or persist live football odds. Check provider access, daily quota and storage; no dummy markets generated."},{status:502,headers:{"Cache-Control":"no-store"}});
 }
}
