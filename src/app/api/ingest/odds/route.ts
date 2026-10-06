import { NextResponse } from "next/server";
import { ingestOddsSport } from "@/lib/ingestion/odds";

interface Body {
  sportKey?: string;
  markets?: string[];
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.INGESTION_SECRET;
  const providedSecret = request.headers.get("x-veto-ingestion-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;

  if (!body.sportKey) {
    return NextResponse.json(
      { error: "sportKey is required" },
      { status: 400 },
    );
  }

  try {
    const summary = await ingestOddsSport({
      sportKey: body.sportKey,
      markets: body.markets,
    });
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Odds ingestion failed" },
      { status: 502 },
    );
  }
}
