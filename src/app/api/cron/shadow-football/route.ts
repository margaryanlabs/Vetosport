import { NextResponse } from "next/server";
import { getPersistence } from "@/lib/persistence/factory";
import { runFootballShadowPrediction } from "@/lib/live/shadow-football";
import {runScoreOnlyShadowPrediction} from "@/lib/live/score-only-shadow";
import {selectFeedCandidates} from "@/lib/live/feed-priority";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

export const dynamic = "force-dynamic";
export const maxDuration=60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const persistence = getPersistence();
  const now = Date.now();
  // Do not repeatedly run the model on 12-hour-old games mislabeled LIVE
  // because the free API plan cannot retrieve an independent FT result.
  const HOUR=3600000;
  const windows=[[-4,-2],[-2,0.1]] as const;
  const batches=await Promise.all(windows.map(([start,end])=>
    persistence.listRecentEvents({
      from:new Date(now+start*HOUR).toISOString(),
      to:new Date(now+end*HOUR).toISOString(),
      statuses:["live"],limit:100,
    })
  ));
  const football=selectFeedCandidates(batches.flat().filter(event=>
    event.event.sport==="football"&&!isSelfcheckEvent(event)&&
    Date.parse(event.event.startsAt)<=now&&
    now-Date.parse(event.event.startsAt)<=4*HOUR
  ),now,8);
  const scanMayBeCapped=batches.some(rows=>rows.length===100);

  const results = [];
  const scoreOnlyResults = [];
  for (const event of football) {
    // A predictive model SHOULD NOT need a bookmaker quote merely to produce
    // probabilities. This parallel research lane uses observed score+clock
    // and an explicit uncalibrated goal prior, NOT a fictitious bookmaker line.
    try {
      scoreOnlyResults.push(await runScoreOnlyShadowPrediction(event.id));
    } catch {
      scoreOnlyResults.push({ok:false,skipped:false,eventId:event.id,
       reason:"SOURCE_ONLY_SHADOW_WRITE_FAILED"});
    }
    // Preserve the old stricter, aligned-quote pipeline independently.
    try {
      results.push(await runFootballShadowPrediction(event.id));
    } catch {
      results.push({ok:false,skipped:false,eventId:event.id,
       reason:"QUOTE_LINKED_SHADOW_WRITE_FAILED"});
    }
  }
  const scoreOnlyPersisted=scoreOnlyResults.reduce((sum,row)=>
   sum+("predictionsPersisted" in row&&typeof row.predictionsPersisted==="number"?
    row.predictionsPersisted:0),0);
  try {
   await persistence.appendProviderHealth({
    providerId:"veto-shadow-score-only",
    status:scoreOnlyResults.some(x=>x.ok===false)?"degraded":"healthy",
    checkedAt:new Date().toISOString(),
    message:"Source-only forward research model cycle completed. No sportsbook prices required.",
    metadata:{eventsEvaluated:football.length,predictionsPersisted:scoreOnlyPersisted,
     sourceOnlyResearch:true,bookmakerPriceVerified:false,
     modelVersion:"football.score-clock-prior.v1",independentCalibrationVerified:false,
     upstreamProviderCalls:0,decisionWrites:0,scanMayBeCapped},
   });
  }catch{/* A model's committed forecasts must not be erased by diagnostics. */}

  // The independent paper cron is responsible for virtual research.
  // Shadow inference does not depend on paper ledger health.

  return NextResponse.json({
    ok: results.every((row) => row.ok !== false)&&scoreOnlyResults.every((row)=>row.ok!==false),
    generatedAt: new Date().toISOString(),
    mode: "SHADOW",
    footballEventsSeen: football.length,
    selectedCandidateLimit:8,
    scanMayBeCapped,
    noOldUnverifiedLiveMatches:true,
    scoreOnlyPredictionsPersisted:scoreOnlyPersisted,
    scoreOnlyModelVersion:"football.score-clock-prior.v1",
    bookmakerPriceVerified:false,independentCalibrationVerified:false,
    externalProviderCalls:0,
    scoreOnlyResults,
    predictionsPersisted: results.reduce(
      (sum, row) =>
        sum +
        ("predictionsPersisted" in row &&
        typeof row.predictionsPersisted === "number"
          ? row.predictionsPersisted
          : 0),
      0,
    ),
    decisionWrites: 0,
    results,
  });
}
