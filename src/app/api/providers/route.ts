import { NextResponse } from "next/server";
import { getDataPlaneRuntimeStatus } from "@/lib/data-plane/engine";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

export function GET() {
  const providers = providerConfiguration();
  const persistence = persistenceConfiguration();
  const runtime = getDataPlaneRuntimeStatus();

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
    persistence.supabaseConfigured &&
    secrets.cronSecretConfigured;

  return NextResponse.json({
    model: "veto.provider-activation.v3",
    generatedAt: new Date().toISOString(),
    mode: runtime.mode,
    liveReady: runtime.mode === "LIVE_READY",
    providers: {
      sportmonks: {
        role: "football events, live state and final score",
        configured: providers.sportmonks.configured,
        ingestionReady: footballStateReady,
      },
      theOddsApi: {
        role: "multi-book live odds and historical snapshots",
        configured: providers.theOddsApi.configured,
        regions: providers.theOddsApi.regions,
        sportKeys: providers.theOddsApi.sportKeys,
        sportKeysConfigured: providers.theOddsApi.sportKeysConfigured,
        sportKeysCount: providers.theOddsApi.sportKeys.length,
        markets: providers.theOddsApi.markets,
        ingestionReady: liveOddsReady,
      },
    },
    storage: {
      configured: persistence.supabaseConfigured,
      mode: persistence.storageMode,
      tablePrefix: persistence.tablePrefix,
    },
    automation: {
      cronSecretConfigured: secrets.cronSecretConfigured,
      ingestionSecretConfigured: secrets.ingestionSecretConfigured,
      footballStateReady,
      liveOddsReady,
      autoSettlementReady: footballStateReady,
      terminalClosingConsensusReady:
        liveOddsReady && persistence.supabaseConfigured,
      decisionProofReady: persistence.supabaseConfigured,
      quotaGuard:
        "Odds cron refuses polling when VETO_ODDS_SPORT_KEYS is empty.",
      schedules: {
        footballState: "*/5 * * * *",
        liveOdds: "*/5 * * * *",
      },
    },
    blockers: runtime.blockers,
    requiredEnvironment: [
      {
        key: "SPORTMONKS_API_TOKEN",
        configured: providers.sportmonks.configured,
        purpose: "Football live state + final score",
        secret: true,
      },
      {
        key: "THE_ODDS_API_KEY",
        configured: providers.theOddsApi.configured,
        purpose: "Live and historical bookmaker odds",
        secret: true,
      },
      {
        key: "VETO_ODDS_SPORT_KEYS",
        configured: providers.theOddsApi.sportKeysConfigured,
        purpose: "Explicit quota-safe The Odds API competitions/sports allowlist",
        secret: false,
      },
      {
        key: "CRON_SECRET",
        configured: secrets.cronSecretConfigured,
        purpose: "Protect scheduled ingestion routes",
        secret: true,
      },
      {
        key: "INGESTION_SECRET",
        configured: secrets.ingestionSecretConfigured,
        purpose: "Protect manual ingestion/settlement routes",
        secret: true,
      },
      {
        key: "VETO_STORAGE_BRIDGE_* or SUPABASE_*",
        configured: persistence.supabaseConfigured,
        purpose: "Truth Journal, decision ledger, quotes and settlement storage",
        secret: true,
      },
    ],
  });
}
