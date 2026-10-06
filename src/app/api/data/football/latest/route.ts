import { NextResponse } from "next/server";
import { getSportmonksClient } from "@/lib/providers/factory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = getSportmonksClient();
    const envelope = await client.getLatestUpdatedFixtures();
    const fixtures = envelope.data.data.map((fixture) => client.normalizeFixture(fixture));

    return NextResponse.json({
      provider: envelope.provider,
      requestedAt: envelope.requestedAt,
      receivedAt: envelope.receivedAt,
      latencyMs: envelope.latencyMs,
      count: fixtures.length,
      fixtures,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Latest fixture fetch failed" },
      { status: 502 },
    );
  }
}
