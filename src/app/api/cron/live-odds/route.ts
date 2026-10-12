import { NextResponse } from "next/server";
import { ingestLiveOdds } from "@/lib/ingestion/live-odds";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";
import {currentOddsBudgetConfig} from "@/lib/providers/odds-budget";

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
  const budget=currentOddsBudgetConfig({sportKeys,markets,regions:providers.theOddsApi.regions});

  if (!budget.allowed) {
    return NextResponse.json({
      ok:true,skipped:true,quotaProtected:true,
      reason:budget.reason,estimatedCreditsPerRun:budget.creditsPerRun,
      estimatedCreditsPerDay:budget.estimatedDailyCredits,
      estimatedCreditsPer30Days:budget.estimatedMonthlyCredits30d,
      estimatedCreditsPer31Days:budget.estimatedMonthlyCredits31d,
      monthlyBudget:budget.monthlyBudget,
      configuredDailyBudgetCredits:budget.dailyBudget,
      note:"Estimate only. Verify actual quota with provider. No paid request was made.",
    }, {headers:{"Cache-Control":"no-store"}});
  }

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
  try {
    for (const sportKey of sportKeys) {
      const result = await ingestLiveOdds({ sportKey, markets });
      results.push(result);
      // Stop other leagues when the provider reports very little quota left.
      // This does not replace the 31-day schedule forecast.
      if (result.quotaRemaining !== undefined && result.quotaRemaining <= 100) break;
    }
  } catch {
    return NextResponse.json({ok:false,error:"Bookmaker polling failed; verify key, access rights and quota in The Odds API dashboard. No sample prices were fabricated."},{status:502,headers:{"Cache-Control":"no-store"}});
  }

  return NextResponse.json({
    ok: true,
    skipped: false,
    quotaProtected: true,
    estimatedCreditsPerDay:budget.estimatedDailyCredits,
    configuredDailyBudgetCredits:budget.dailyBudget,
    estimatedCreditsPer31Days:budget.estimatedMonthlyCredits31d,
    monthlyBudget:budget.monthlyBudget,
    actualChargesNotMeasured:true,
    sportKeys,
    markets,
    results,
  },{headers:{"Cache-Control":"no-store"}});
}
