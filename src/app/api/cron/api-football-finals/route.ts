import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {
  normalizeFinishedFixture,selectFinalReconciliationTargets,
} from "@/lib/providers/api-football-finals";
import {journalizeEventState} from "@/lib/data-plane/journalize";
import type {ApiFootballFixture} from "@/lib/providers/api-football";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};

/**
 * One upstream request per scheduled run, at most 6/day. Alongside 48 score +
 * 12 in-play odds queries => nominal 66/day and 20-request quota reserve.
 *
 * Instead of a broad ?date=...&status=FT scan (which returned no certified
 * historic finals), target up to 20 exact, already-observed provider fixture
 * IDs. Rotating target batches lets the cron cover many previously observed
 * matches without increasing external API costs.
 */
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)
  return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 if(process.env.VETO_API_FOOTBALL_ENABLED!=="true"||!process.env.API_FOOTBALL_KEY||
  !persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:true,skipped:true,reason:"LIVE_FOOTBALL_OR_STORAGE_NOT_ENABLED"},
   {headers});

 const store=getPersistence();
 const now=new Date(),asOf=now.toISOString();
 let upstreamAttempted=false;
 let selectedIds=0;
 try{
  // Six non-overlapping 12-hour kickoff windows. 72h allows delayed coverage
  // and matches that finished after midnight UTC.
  const slots=6,slotHours=12,HOUR=3600000;
  const blocks=await Promise.all(Array.from({length:slots},(_,i)=>
   store.listRecentEvents({
    from:new Date(now.getTime()-(i+1)*slotHours*HOUR).toISOString(),
    to:new Date(now.getTime()-i*slotHours*HOUR).toISOString(),
    statuses:["live"],limit:100,
   })));
  const events=[...new Map(blocks.flat().filter(e=>e.event.sport==="football"&&!isSelfcheckEvent(e))
   .map(e=>[e.id,e])).values()];
  const chunks=Array.from({length:Math.ceil(events.length/30)},(_,i)=>
   events.slice(i*30,(i+1)*30).map(e=>e.id));
  const states=(
   await Promise.all(chunks.map(ids=>store.listRecentEventStates({eventIds:ids,limit:1200})))
  ).flat();
  const rotationIndex=Math.floor(now.getTime()/(4*HOUR));
  const selection=selectFinalReconciliationTargets({
   events,states,asOf,rotationIndex,limit:20,minimumKickoffAgeMinutes:100,
  });
  const targets=selection.targets;
  selectedIds=targets.length;
  const scanMayBeCapped=blocks.some(x=>x.length>=100);
  if(!selectedIds){
   await store.appendProviderHealth({
    providerId:"api-football-finals",status:"degraded",checkedAt:asOf,
    message:"No 100min+ previously observed unresolved API-Football fixtures to reconcile; no quota used.",
    metadata:{strategy:"TARGETED_PROVIDER_IDS_V2",candidateCount:0,scannedEvents:events.length,
     statesRead:states.length,ambiguous:selection.ambiguousFixtureIds,
     scanMayBeCapped,upstreamAttempted:false,estimatedCallsPerDay:6},
   });
   return NextResponse.json({
    ok:true,skipped:true,reason:"NO_ELIGIBLE_OBSERVED_FIXTURES",
    source:"api-football",strategy:"TARGETED_PROVIDER_IDS_V2",candidateCount:0,
    scannedEvents:events.length,ambiguous:selection.ambiguousFixtureIds,
    upstreamAttempted:false,quotaSaved:true,
   },{headers});
  }

  const ids=targets.map(t=>t.providerEventId).join("-");
  upstreamAttempted=true;
  const response=await fetch("https://v3.football.api-sports.io/fixtures?ids="+ids,{
   headers:{"x-apisports-key":process.env.API_FOOTBALL_KEY!,accept:"application/json"},
   cache:"no-store",signal:AbortSignal.timeout(15_000),
  });
  if(!response.ok)throw new Error("UPSTREAM_HTTP_"+response.status);
  const payload:unknown=await response.json();
  if(!payload||typeof payload!=="object"||Array.isArray(payload))
   throw new Error("MALFORMED_PROVIDER_PAYLOAD");
  const data=payload as {response?:unknown;errors?:unknown};
  const providerErrors=Array.isArray(data.errors)?data.errors.length>0:
   !!data.errors&&typeof data.errors==="object"&&Object.keys(data.errors).length>0;
  if(providerErrors||!Array.isArray(data.response))
   throw new Error("UPSTREAM_REJECTED_TARGETED_IDS");
  const raw=data.response as ApiFootballFixture[];
  const remainingHeader=response.headers.get("x-ratelimit-requests-remaining");
  const remaining=remainingHeader===null?null:Number(remainingHeader);
  const lowQuota=remaining!==null&&Number.isFinite(remaining)&&remaining<=20;
  const selected=new Map(targets.map(t=>[t.providerEventId,t]));
  let returned=0,confirmed=0,matched=0,finishedStored=0,failures=0,invalidFinal=0,notFinished=0;
  const capturedAt=new Date().toISOString();
  if(!lowQuota){
   for(const row of raw){
    const id=row.fixture?.id;
    if(typeof id!=="number"||!selected.has(id))continue;
    returned++;
    if(row.fixture?.status?.short!=="FT"){notFinished++;continue;}
    const result=normalizeFinishedFixture(row);
    if(!result){invalidFinal++;continue;}
    confirmed++;
    const target=selected.get(result.providerEventId)!;
    // Exact source id and kickoff guard: never use team-name approximation.
    if(Date.parse(target.event.event.startsAt)!==Date.parse(result.startsAt))continue;
    matched++;
    try{
     const state={
      status:"finished",score:result.score,providerEventId:result.providerEventId,
      source:"api-football.fixtures.results",timeSemantics:"OBSERVED_AT_FETCH_NOT_WHISTLE",
      regulationTimeOnly:true,
     };
     // Fail-safe order: certificate -> journal -> event status. If any step
     // fails, the match remains eligible for reconciliation next time.
     await store.appendEventState({
      eventId:target.event.id,sourceProvider:"api-football",capturedAt,state,
     });
     await store.appendTruthJournal([journalizeEventState({
      canonicalEventId:target.event.id,sourceProvider:"api-football",
      sourceRecordId:`fixture-ft:${result.providerEventId}:${capturedAt}`,
      gatewayReceivedAt:capturedAt,payload:state,
     })]);
     await store.upsertEvent({...target.event.event,
      id:String(result.providerEventId),status:"finished",score:result.score},
      target.event.canonicalKey,{provider:"api-football",id:String(result.providerEventId)});
     finishedStored++;
    }catch{
     failures++;
    }
   }
  }
  const diagnostics={
   strategy:"TARGETED_PROVIDER_IDS_V2",selectedFixtureCount:selectedIds,
   eligibleCandidates:selection.eligibleCandidates,rotationOffset:selection.rotationOffset,
   providerRows:raw.length,returned,confirmed,matched,finishedStored,failures,
   invalidFinal,notFinished,ambiguous:selection.ambiguousFixtureIds,
   scannedEvents:events.length,statesRead:states.length,scanMayBeCapped,
   upstreamAttempted:true,lowQuota,estimatedCallsPerDay:6,
  };
  await store.appendProviderHealth({
   providerId:"api-football-finals",
   status:lowQuota||failures?"degraded":"healthy",
   checkedAt:capturedAt,
   ...(Number.isFinite(remaining)?{quotaRemaining:remaining??undefined}:{}),
   message:lowQuota?"Daily quota reserve: no FT state written.":
    failures?"Some certificate writes failed; unresolved fixtures remain eligible.":
    "Exact-ID FT reconciliation from observed fixtures (one upstream call).",
   metadata:diagnostics,
  });
  return NextResponse.json({
   ok:!failures,source:"api-football",...diagnostics,
   quotaRemaining:remaining,quotaReserve:20,
   validation:"EXACT_PROVIDER_ID_KICKOFF_CERTIFICATE",
   validatedEdgeCount:0,bookmakerOddsVerified:false,
  },{headers,status:failures?502:200});
 }catch(error){
  const failureCode=error instanceof Error&&
   /^(UPSTREAM_HTTP_\d+|MALFORMED_PROVIDER_PAYLOAD|UPSTREAM_REJECTED_TARGETED_IDS)$/.test(error.message)
   ?error.message:"STORAGE_OR_PROVIDER_FAILURE";
  try{
   await store.appendProviderHealth({
    providerId:"api-football-finals",status:"degraded",checkedAt:new Date().toISOString(),
    message:"FT reconciliation failed: "+failureCode,
    metadata:{strategy:"TARGETED_PROVIDER_IDS_V2",failureCode,
     selectedFixtureCount:selectedIds,upstreamAttempted,estimatedCallsPerDay:6},
   });
  }catch{/* Do not overwrite the initial failure or reveal storage diagnostics. */}
  return NextResponse.json({ok:false,source:"api-football",strategy:"TARGETED_PROVIDER_IDS_V2",
   error:failureCode,upstreamAttempted,selectedFixtureCount:selectedIds,
   bookmakerOddsVerified:false},
   {status:502,headers});
 }
}
