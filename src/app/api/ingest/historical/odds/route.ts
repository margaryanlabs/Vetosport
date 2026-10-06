import { NextResponse } from "next/server";
import {
  importHistoricalOddsSnapshot,
  planHistoricalOddsImport,
} from "@/lib/ingestion/historical-odds";

interface Body {
  sportKey?: string;
  snapshotAt?: string;
  markets?: string[];
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
  if (!body.sportKey || !body.snapshotAt) {
    return NextResponse.json(
      { error: "sportKey and snapshotAt are required" },
      { status: 400 },
    );
  }

  try {
    const plan = planHistoricalOddsImport({
      sportKey: body.sportKey,
      snapshotAt: body.snapshotAt,
      markets: body.markets,
    });

    if (!body.execute) {
      return NextResponse.json({
        dryRun: true,
        message:
          "Historical import was not executed. Send execute=true after reviewing estimated credits.",
        plan,
      });
    }

    const result = await importHistoricalOddsSnapshot({
      sportKey: body.sportKey,
      snapshotAt: body.snapshotAt,
      markets: body.markets,
    });

    return NextResponse.json({
      dryRun: false,
      plan,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Historical import failed" },
      { status: 502 },
    );
  }
}
