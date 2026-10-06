import { NextResponse } from "next/server";
import { settleFootballEvent } from "@/lib/settlement/football-worker";

interface Body {
  eventId?: string;
  finalScore?: { home?: number; away?: number };
  settledAt?: string;
  closingPrices?: Record<string, number>;
  execute?: boolean;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.INGESTION_SECRET;
  const providedSecret = request.headers.get("x-veto-ingestion-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  const home = body.finalScore?.home;
  const away = body.finalScore?.away;

  if (
    !body.eventId ||
    typeof home !== "number" ||
    typeof away !== "number" ||
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0
  ) {
    return NextResponse.json(
      { error: "eventId and non-negative integer finalScore are required" },
      { status: 400 },
    );
  }

  if (!body.execute) {
    return NextResponse.json({
      dryRun: true,
      message:
        "Settlement not executed. Send execute=true after reviewing final score and optional closing prices.",
      plan: {
        eventId: body.eventId,
        finalScore: { home, away },
        settledAt: body.settledAt ?? new Date().toISOString(),
        closingPriceCount: Object.keys(body.closingPrices ?? {}).length,
      },
    });
  }

  try {
    const result = await settleFootballEvent({
      eventId: body.eventId,
      finalScore: { home, away },
      settledAt: body.settledAt ?? new Date().toISOString(),
      closingPrices: body.closingPrices,
    });

    return NextResponse.json({ dryRun: false, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Settlement failed" },
      { status: 502 },
    );
  }
}
