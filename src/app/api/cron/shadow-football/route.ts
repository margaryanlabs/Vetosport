import { NextResponse } from "next/server";
import { getPersistence } from "@/lib/persistence/factory";
import { runFootballShadowPrediction } from "@/lib/live/shadow-football";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const persistence = getPersistence();
  const now = Date.now();
  const events = await persistence.listRecentEvents({
    from: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
    to: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
    statuses: ["live"],
    limit: 30,
  });

  const football = events.filter(
    (event) =>
      event.event.sport === "football" &&
      event.canonicalKey !== "veto-sport-storage-selfcheck" &&
      event.event.competition !== "VETO Storage Selfcheck",
  );

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

  return NextResponse.json({
    ok: results.every((row) => row.ok !== false),
    generatedAt: new Date().toISOString(),
    mode: "SHADOW",
    footballEventsSeen: football.length,
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
