import { NextResponse } from "next/server";
import {isAuthorizedProviderRead, protectedProviderHeaders} from "@/lib/providers/direct-read-auth";
import { getSportmonksClient } from "@/lib/providers/factory";

export async function GET(request: Request) {
  if (!isAuthorizedProviderRead(request)) {
    return NextResponse.json({error:"Unauthorized"},{status:401,headers:protectedProviderHeaders});
  }
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
      { error: "Protected provider read failed." },
      { status: 502 },
    );
  }
}
