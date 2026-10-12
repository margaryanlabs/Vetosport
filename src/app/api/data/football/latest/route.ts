import { NextResponse } from "next/server";
import {isAuthorizedProviderRead, protectedProviderHeaders} from "@/lib/providers/direct-read-auth";
import { getSportmonksClient } from "@/lib/providers/factory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedProviderRead(request)) {
    return NextResponse.json({error:"Unauthorized"},{status:401,headers:protectedProviderHeaders});
  }
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
      { error: "Protected provider read failed." },
      { status: 502 },
    );
  }
}
