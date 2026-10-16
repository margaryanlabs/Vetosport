import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {runDailyPaperTick} from "@/lib/paper/daily-runner";
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
   {from:new Date(now.getTime()-2*hour),to:now,statuses:["live" as const]},
   {from:new Date(now.getTime()+30*60_000),to:new Date(now.getTime()+48*hour),
    statuses:["scheduled" as const]},
  ];
  const results=await Promise.all(windows.map(w=>store.listRecentEvents({
   from:w.from.toISOString(),to:w.to.toISOString(),statuses:w.statuses,limit:100,
  })));
  const candidates=[...new Map(results.flat().filter(e=>
   e.event.sport==="football"&&!isSelfcheckEvent(e)&&
   (e.event.status==="live"||
     (e.event.status==="scheduled"&&e.canonicalKey.startsWith("football::epl::")&&
      /^[a-f0-9]{32}$/i.test(e.providerRefs?.["the-odds-api"]??""))))
   .map(e=>[e.id,e])).values()];
  const run=await runDailyPaperTick({
   observedEvents:candidates,asOf:new Date().toISOString(),capture:true,
  });
  // Each run leaves observable operational evidence, even when no
  // selections qualify (eg. due to missing FT source or stale prices).
  await store.appendProviderHealth({
   providerId:"veto-paper-forward",
   status:run.ok?"healthy":"degraded",checkedAt:new Date().toISOString(),
   message:run.ok?"Forward-only paper observer ran; selection is not guaranteed.":
     "Paper observer storage or source unavailable.",
   metadata:{protocol:"veto.paper.forward-observed.v1",
    sampledEvents:candidates.length,liveWindowMayBeCapped:results[0].length>=100,
    scheduledWindowMayBeCapped:results[1].length>=100,
    recorded:run.recorded,settled:run.settled,eligible:run.eligible,
    scanned:run.scanned,blockedBy:run.blockedBy,
    reason:run.skipped??null,errors:run.errors,
    realBetsPlaced:0,externalProviderCalls:0},
  });
  return NextResponse.json({
   ...run,sourceCoverage:{candidates:candidates.length,
    liveWindowMayBeCapped:results[0].length>=100,
    scheduledWindowMayBeCapped:results[1].length>=100},
  },{status:run.ok?200:503,headers});
 }catch{
  return NextResponse.json({ok:false,reason:"PAPER_RESEARCH_SOURCE_UNAVAILABLE",
   realBetsPlaced:0,simulatedResultsInvented:0},
   {status:503,headers});
 }
}
