import { NextResponse } from "next/server";
import { getSportmonksClient } from "@/lib/providers/factory";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fixtureId = url.searchParams.get("fixtureId");

  if (!fixtureId) {
    return NextResponse.json(
      { error: "fixtureId is required" },
      { status: 400 },
    );
  }

  try {
    const client = getSportmonksClient();
    const envelope = await client.getInplayOdds(fixtureId);
    const quotes = client.normalizeInplayOdds(envelope.data.data);

    return NextResponse.json({
      provider: envelope.provider,
      requestedAt: envelope.requestedAt,
      receivedAt: envelope.receivedAt,
      latencyMs: envelope.latencyMs,
      fixtureId,
      quotes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "In-play odds fetch failed" },
      { status: 502 },
    );
  }
}
