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
  const sportKeys = (process.env.VETO_ODDS_SPORT_KEYS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!providers.theOddsApi.configured || !persistence.supabaseConfigured || sportKeys.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: !providers.theOddsApi.configured
        ? "THE_ODDS_API_KEY is not configured."
        : !persistence.supabaseConfigured
          ? "Persistence is not configured."
          : "VETO_ODDS_SPORT_KEYS is empty.",
    });
  }

  const markets = (process.env.VETO_ODDS_MARKETS ?? "h2h,spreads,totals")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const results = [];
  for (const sportKey of sportKeys) {
    results.push(await ingestLiveOdds({ sportKey, markets }));
  }

  return NextResponse.json({
    ok: true,
    skipped: false,
    sportKeys,
    markets,
    results,
  });
}
