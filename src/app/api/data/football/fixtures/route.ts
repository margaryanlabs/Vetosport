import { NextResponse } from "next/server";
import { getSportmonksClient } from "@/lib/providers/factory";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date=YYYY-MM-DD is required" },
      { status: 400 },
    );
  }

  try {
    const client = getSportmonksClient();
    const envelope = await client.getFixturesByDate(date);
    const fixtures = envelope.data.data.map((fixture) => client.normalizeFixture(fixture));

    return NextResponse.json({
      provider: envelope.provider,
      requestedAt: envelope.requestedAt,
      receivedAt: envelope.receivedAt,
      latencyMs: envelope.latencyMs,
      fixtures,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fixture fetch failed" },
      { status: 502 },
    );
  }
}
