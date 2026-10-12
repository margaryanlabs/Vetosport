import { NextResponse } from "next/server";
import {isAuthorizedProviderRead, protectedProviderHeaders} from "@/lib/providers/direct-read-auth";
import {providerConfiguration} from "@/lib/providers/factory";
import { getTheOddsApiClient } from "@/lib/providers/factory";

export async function GET(request: Request) {
  if (!isAuthorizedProviderRead(request)) {
    return NextResponse.json({error:"Unauthorized"},{status:401,headers:protectedProviderHeaders});
  }
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
  const allowed=providerConfiguration().theOddsApi;
  if(!allowed.sportKeys.includes(sportKey)){
    return NextResponse.json({error:"Sport is not in VETO_ODDS_SPORT_KEYS allowlist."},{status:403,headers:protectedProviderHeaders});
  }
  if(markets.length===0||markets.some(m=>!allowed.markets.includes(m))){
    return NextResponse.json({error:"Markets must be explicitly allowlisted in VETO_ODDS_MARKETS."},{status:403,headers:protectedProviderHeaders});
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
      { error: "Protected provider read failed." },
      { status: 502 },
    );
  }
}
