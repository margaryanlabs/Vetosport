import { NextResponse } from "next/server";
import { getTheOddsApiClient } from "@/lib/providers/factory";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sportKey = url.searchParams.get("sport");
  const eventId = url.searchParams.get("eventId") ?? undefined;
  const markets = (url.searchParams.get("markets") ?? "h2h,spreads,totals")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!sportKey) {
    return NextResponse.json(
      { error: "sport is required (The Odds API sport key)" },
      { status: 400 },
    );
  }

  try {
    const client = getTheOddsApiClient();
    const envelope = await client.getOdds({ sportKey, eventId, markets });
    const quotes = envelope.data.flatMap((event) => client.normalizeQuotes(event));

    return NextResponse.json({
      provider: envelope.provider,
      requestedAt: envelope.requestedAt,
      receivedAt: envelope.receivedAt,
      latencyMs: envelope.latencyMs,
      quotaRemaining: envelope.quotaRemaining,
      events: envelope.data.length,
      quotes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Odds fetch failed" },
      { status: 502 },
    );
  }
}
