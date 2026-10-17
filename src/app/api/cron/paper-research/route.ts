import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {runDailyPaperTick} from "@/lib/paper/daily-runner";
import {runHighOddsTick} from "@/lib/paper/high-odds-runner";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

export const dynamic="force-dynamic";
export const maxDuration=30;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Dedicated automated forward-only paper-research observer.
 *
 * Runs even if the unrelated VETO shadow model cron is slow or fails. Does
 * not request a sports API, does not place bets, and never backdates picks.
 * No public writes: bearer CRON_SECRET is mandatory.
 */
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)
  return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:false,reason:"PERSISTENCE_NOT_CONFIGURED",
   realBetsPlaced:0},{status:503,headers});
 const store=getPersistence();
 const now=new Date(),hour=3_600_000;
 try{
  // Process LIVE score snapshots and native EPL pre-match research
  // separately so a full 100-row live list cannot hide tomorrow's matches.
  const windows=[
   {from:new Date(now.getTime()-2*hour),to:now,statuses:["live" as const],canonicalKeyPrefix:undefined},
   {from:new Date(now.getTime()+30*60_000),to:new Date(now.getTime()+48*hour),
    statuses:["scheduled" as const],canonicalKeyPrefix:"football::epl::"},
  ];
  const results=await Promise.all(windows.map(w=>store.listRecentEvents({
   from:w.from.toISOString(),to:w.to.toISOString(),statuses:w.statuses,limit:100,
   canonicalKeyPrefix:w.canonicalKeyPrefix,
  })));
  const candidates=[...new Map(results.flat().filter(e=>
   e.event.sport==="football"&&!isSelfcheckEvent(e)&&
   (e.event.status==="live"||
     (e.event.status==="scheduled"&&e.canonicalKey.startsWith("football::epl::")&&
      /^[a-f0-9]{32}$/i.test(e.providerRefs?.["the-odds-api"]??""))))
   .map(e=>[e.id,e])).values()];
  // Both scientific bankrolls are distinct, with independent source gates.
  const [base,high]=await Promise.allSettled([
   runDailyPaperTick({observedEvents:candidates,asOf:new Date().toISOString(),capture:true}),
   runHighOddsTick({events:candidates,asOf:new Date().toISOString(),capture:true}),
  ]);
  const run=base.status==="fulfilled"?base.value:null;
  const highOdds=high.status==="fulfilled"?high.value:null;
  // Each run leaves observable operational evidence, even when no
  // selections qualify (eg. due to missing FT source or stale prices).
  await store.appendProviderHealth({
   providerId:"veto-paper-forward",
   status:run?.ok?"healthy":"degraded",checkedAt:new Date().toISOString(),
   message:run?.ok?"Forward-only paper observer ran; selection is not guaranteed.":
     "Paper observer storage or source unavailable.",
   metadata:{protocol:"veto.paper.forward-observed.v1",
    sampledEvents:candidates.length,liveWindowMayBeCapped:results[0].length>=100,
    scheduledWindowMayBeCapped:results[1].length>=100,
    recorded:run?.recorded??0,settled:run?.settled??0,eligible:run?.eligible??0,
    scanned:run?.scanned??0,blockedBy:run?.blockedBy??{},
    reason:run?.skipped??"BASE_UNAVAILABLE",errors:run?.errors??1,
    realBetsPlaced:0,externalProviderCalls:0},
  });
  await store.appendProviderHealth({
   providerId:"veto-paper-high-odds",status:highOdds?.ok?"healthy":"degraded",
   checkedAt:new Date().toISOString(),
   message:highOdds?.ok?"High-odds prospective simulation observer completed.":
    "High-odds simulation research unavailable.",
   metadata:{paperOnly:true,realBetsPlaced:0,
    scanned:highOdds?.scanned??0,candidates:highOdds?.candidates??0,
    recorded:highOdds?.recorded??0,settled:highOdds?.settled??0,
    skipped:highOdds?.skipped??"HIGH_ODDS_UNAVAILABLE",
    errors:highOdds?.errors??1,reasons:highOdds?.reasons??{}},
  }).catch(()=>undefined);
  return NextResponse.json({
   ...(run??{ok:false,skipped:"BASE_PAPER_UNAVAILABLE"}),
   highOdds:highOdds??{ok:false,skipped:"HIGH_ODDS_UNAVAILABLE"},
   sourceCoverage:{candidates:candidates.length,
    liveWindowMayBeCapped:results[0].length>=100,
    scheduledWindowMayBeCapped:results[1].length>=100},
  },{status:run?.ok&&highOdds?.ok?200:503,headers});
 }catch{
  return NextResponse.json({ok:false,reason:"PAPER_RESEARCH_SOURCE_UNAVAILABLE",
   realBetsPlaced:0,simulatedResultsInvented:0},
   {status:503,headers});
 }
}
