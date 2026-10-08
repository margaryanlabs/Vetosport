import { NextResponse } from "next/server";
import { ingestLiveOdds } from "@/lib/ingestion/live-odds";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = providerConfiguration();
  const persistence = persistenceConfiguration();
  const sportKeys = providers.theOddsApi.sportKeys;
  const markets = providers.theOddsApi.markets;

  if (
    !providers.theOddsApi.configured ||
    !persistence.supabaseConfigured ||
    !providers.theOddsApi.sportKeysConfigured
  ) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      quotaProtected: true,
      reason: !providers.theOddsApi.configured
        ? "THE_ODDS_API_KEY is not configured."
        : !persistence.supabaseConfigured
          ? "Persistence is not configured."
          : "VETO_ODDS_SPORT_KEYS is empty; refusing broad provider polling.",
      sportKeys,
      markets,
    });
  }

  const results = [];
  for (const sportKey of sportKeys) {
    results.push(await ingestLiveOdds({ sportKey, markets }));
  }

  return NextResponse.json({
    ok: true,
    skipped: false,
    quotaProtected: true,
    sportKeys,
    markets,
    results,
  });
}
