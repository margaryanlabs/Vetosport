import { NextResponse } from "next/server";
import { ingestLatestFootballUpdates } from "@/lib/ingestion/football-latest";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.INGESTION_SECRET;
  const providedSecret = request.headers.get("x-veto-ingestion-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await ingestLatestFootballUpdates();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 502 },
    );
  }
}
