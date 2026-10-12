import { NextResponse } from "next/server";
import { getDataPlaneRuntimeStatus } from "@/lib/data-plane/engine";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";
import {currentOddsBudgetConfig} from "@/lib/providers/odds-budget";

export const dynamic = "force-dynamic";

export function GET() {
  const providers = providerConfiguration();
  const persistence = persistenceConfiguration();
  const runtime = getDataPlaneRuntimeStatus();
  const quoteBudget=currentOddsBudgetConfig({sportKeys:providers.theOddsApi.sportKeys,markets:providers.theOddsApi.markets,regions:providers.theOddsApi.regions});

  const secrets = {
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    ingestionSecretConfigured: Boolean(process.env.INGESTION_SECRET),
  };

  const footballStateReady =
    providers.sportmonks.configured &&
    persistence.supabaseConfigured &&
    secrets.cronSecretConfigured;

  const liveOddsReady =
    providers.theOddsApi.configured &&
    providers.theOddsApi.sportKeysConfigured &&
    quoteBudget.allowed &&
    persistence.supabaseConfigured &&
    secrets.cronSecretConfigured;

  const activationMode =
    runtime.mode === "LIVE_READY" && liveOddsReady
      ? "live-ready"
      : runtime.mode === "PUSH_READY"
        ? "gateway-ready"
        : runtime.mode === "LIVE_READY" || runtime.mode === "PARTIAL_FEEDS"
          ? "partially-configured"
          : "sandbox";

  return NextResponse.json({
    model: "veto.provider-activation.v4",
    mode: activationMode,
    runtimeMode: runtime.mode,
    generatedAt: new Date().toISOString(),
    liveReady: runtime.mode === "LIVE_READY" && liveOddsReady,
    gatewayReady: runtime.canonicalGatewayConfigured,
    providers: {
      canonicalGateway: {
        role: "provider-neutral normalized live push",
        configured: runtime.canonicalGatewayConfigured,
        endpoint: "/api/ingest/live/canonical",
      },
      sportmonks: {
        role: "football events, live state and final score",
        configured: providers.sportmonks.configured,
        ingestionReady: footballStateReady,
        keyRequired: true,
      },
      theOddsApi: {
        role: "multi-book live odds and historical snapshots",
        configured: providers.theOddsApi.configured,
        ingestionReady: liveOddsReady,
        keyRequired: true,
        regions: providers.theOddsApi.regions,
        sportKeys: providers.theOddsApi.sportKeys,
        sportKeysConfigured: providers.theOddsApi.sportKeysConfigured,
        sportKeysCount: providers.theOddsApi.sportKeys.length,
        markets: providers.theOddsApi.markets,
        scheduledPolling: {
          permitted:quoteBudget.allowed,
          reason:quoteBudget.reason,
          optedIn:quoteBudget.enabled,
          estimatedCreditsPerRun:quoteBudget.creditsPerRun,
          estimatedCreditsPerDay:quoteBudget.estimatedDailyCredits,
          estimatedCreditsPer30Days:quoteBudget.estimatedMonthlyCredits30d,
          configuredDailyBudgetCredits:quoteBudget.dailyBudget,
          actualChargesNotMeasured:true,
        },
      },
    },
    storage: {
      configured: persistence.supabaseConfigured,
      mode: persistence.storageMode,
      namespace: persistence.tablePrefix || "public",
    },
    automation: {
      cronSecretConfigured: secrets.cronSecretConfigured,
      ingestionSecretConfigured: secrets.ingestionSecretConfigured,
      canonicalGatewayReady: runtime.canonicalGatewayConfigured,
      footballStateReady,
      liveOddsReady,
      autoSettlementReady: footballStateReady,
      terminalClosingConsensusReady:
        liveOddsReady && persistence.supabaseConfigured,
      decisionProofReady: persistence.supabaseConfigured,
      quotaGuard:
        "Odds cron refuses polling unless keys, explicit allowlist, VETO_ODDS_CRON_ENABLED and estimated daily credits budget all pass.",
      schedules: {
        footballState: "*/5 * * * *",
        liveOdds: "*/5 * * * *",
      },
    },
    criticalBlockers: runtime.blockers,
    directAdapterGaps: [
      ...runtime.directAdapterGaps,
      ...(!quoteBudget.allowed ? ["Scheduled odds feed disabled: "+quoteBudget.reason] : []),
    ],
    requiredEnvironment: [
      {
        key: "INGESTION_SECRET",
        configured: secrets.ingestionSecretConfigured,
        purpose: "Protect canonical gateway/manual ingestion/settlement routes",
        critical: true,
      },
      {
        key: "VETO_STORAGE_BRIDGE_* or SUPABASE_*",
        configured: persistence.supabaseConfigured,
        purpose: "Truth Journal, decision ledger, quotes and settlement storage",
        critical: true,
      },
      {
        key: "SPORTMONKS_API_TOKEN",
        configured: providers.sportmonks.configured,
        purpose: "Optional direct football live state + final score adapter",
        optionalWhenUsingGateway: true,
      },
      {
        key: "THE_ODDS_API_KEY",
        configured: providers.theOddsApi.configured,
        purpose: "Optional direct live and historical bookmaker odds adapter",
        optionalWhenUsingGateway: true,
      },
      {
        key: "VETO_ODDS_SPORT_KEYS",
        configured: providers.theOddsApi.sportKeysConfigured,
        purpose: "Explicit quota-safe The Odds API competitions/sports allowlist",
        optionalWhenUsingGateway: true,
      },
      {
        key: "VETO_ODDS_CRON_ENABLED",
        configured:quoteBudget.enabled,
        purpose:"Explicit opt-in to quota-spending scheduled bookmaker requests (default OFF).",
        critical:true,
      },
      {
        key: "VETO_ODDS_CRON_MAX_ESTIMATED_DAILY_CREDITS",
        configured:quoteBudget.dailyBudget>0,
        purpose:"Required daily cost forecast cap; 5min cron runs ~288 times/day. Monitor real provider usage.",
        critical:true,
      },
      {
        key: "CRON_SECRET",
        configured: secrets.cronSecretConfigured,
        purpose: "Protect scheduled direct-provider ingestion routes",
        optionalWhenUsingGateway: true,
      },
    ],
  });
}
