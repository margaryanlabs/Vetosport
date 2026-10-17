import { NextResponse } from "next/server";
import { getPersistence } from "@/lib/persistence/factory";
import { runFootballShadowPrediction } from "@/lib/live/shadow-football";
import {selectFeedCandidates} from "@/lib/live/feed-priority";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

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

  // The independent paper cron is responsible for virtual research.
  // Shadow inference does not depend on paper ledger health.

  return NextResponse.json({
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
