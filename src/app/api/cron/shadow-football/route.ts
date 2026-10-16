import { NextResponse } from "next/server";
import { getPersistence } from "@/lib/persistence/factory";
import { runFootballShadowPrediction } from "@/lib/live/shadow-football";
import {selectFeedCandidates} from "@/lib/live/feed-priority";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {runDailyPaperTick} from "@/lib/paper/daily-runner";

export const dynamic = "force-dynamic";

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
  for (const event of football) {
    try {
      results.push(await runFootballShadowPrediction(event.id));
    } catch (error) {
      results.push({
        ok: false,
        skipped: false,
        eventId: event.id,
        error:
          error instanceof Error
            ? error.message
            : "Shadow prediction failed.",
      });
    }
  }

  // Piggyback on the existing 5-minute authorized research cron.
  // This is independent of whether the single shadow model produced signals.
  // Missing migration, FT or prices never creates fictional paper picks.
  const dailyPaper=await runDailyPaperTick({
    observedEvents:football,asOf:new Date().toISOString(),capture:true,
  }).catch(()=>({ok:false,skipped:"DAILY_PAPER_TICK_UNAVAILABLE",realBetsPlaced:0}));
  // Hourly heartbeat distinguishes "no eligible research" from a cron that
  // never ran. A failed optional health write must not break live prediction.
  if(new Date().getUTCMinutes()<5){
    await persistence.appendProviderHealth({
      providerId:"veto-paper-forward",
      status:dailyPaper.ok?"healthy":"degraded",
      checkedAt:new Date().toISOString(),
      message:dailyPaper.ok?"Forward paper observer executed":"Paper observer unavailable or schema not ready",
      metadata:{researchOnly:true,realBetsPlaced:0,externalProviderCalls:0,
        selected:"recorded" in dailyPaper?dailyPaper.recorded:0,
        reason:"skipped" in dailyPaper?dailyPaper.skipped:null,
        screened:"scanned" in dailyPaper?dailyPaper.scanned:0,
        eligible:"eligible" in dailyPaper?dailyPaper.eligible:0,
        blockedBy:"blockedBy" in dailyPaper?dailyPaper.blockedBy:{}},
    }).catch(()=>undefined);
  }

  return NextResponse.json({
    paperResearch:dailyPaper,
    ok: results.every((row) => row.ok !== false),
    generatedAt: new Date().toISOString(),
    mode: "SHADOW",
    footballEventsSeen: football.length,
    selectedCandidateLimit:8,
    scanMayBeCapped,
    noOldUnverifiedLiveMatches:true,
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
