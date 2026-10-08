import { NextResponse } from "next/server";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";

export function GET() {
  const providers = providerConfiguration();
  const persistence = persistenceConfiguration();
  const sportKeys = (process.env.VETO_ODDS_SPORT_KEYS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const secrets = {
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    ingestionSecretConfigured: Boolean(process.env.INGESTION_SECRET),
  };

  const blockers: string[] = [];
  if (!providers.sportmonks.configured) {
    blockers.push("SPORTMONKS_API_TOKEN is not configured.");
  }
  if (!providers.theOddsApi.configured) {
    blockers.push("THE_ODDS_API_KEY is not configured.");
  }
  if (sportKeys.length === 0) {
    blockers.push("VETO_ODDS_SPORT_KEYS is empty.");
  }
  if (!persistence.supabaseConfigured) {
    blockers.push("Persistence is not configured.");
  }
  if (!secrets.cronSecretConfigured) {
    blockers.push("CRON_SECRET is not configured.");
  }
  if (!secrets.ingestionSecretConfigured) {
    blockers.push("INGESTION_SECRET is not configured.");
  }

  const footballStateReady =
    providers.sportmonks.configured &&
    persistence.supabaseConfigured &&
    secrets.cronSecretConfigured;

  const liveOddsReady =
    providers.theOddsApi.configured &&
    sportKeys.length > 0 &&
    persistence.supabaseConfigured &&
    secrets.cronSecretConfigured;

  return NextResponse.json({
    model: "veto.provider-activation.v2",
    mode:
      footballStateReady && liveOddsReady
        ? "live-ready"
        : blockers.length < 6
          ? "partially-configured"
          : "sandbox",
    generatedAt: new Date().toISOString(),
    providers: {
      sportmonks: {
        role: "football events, live state and final score",
        configured: providers.sportmonks.configured,
      },
      theOddsApi: {
        role: "multi-book live odds and historical snapshots",
        configured: providers.theOddsApi.configured,
        regions: (process.env.THE_ODDS_API_REGIONS ?? "eu")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        sportKeys,
        markets: (process.env.VETO_ODDS_MARKETS ?? "h2h,spreads,totals")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      },
    },
    storage: {
      configured: persistence.supabaseConfigured,
      mode: persistence.storageMode,
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
      schedules: {
        footballState: "*/5 * * * *",
        liveOdds: "*/5 * * * *",
      },
    },
    blockers,
    requiredEnvironment: [
      {
        key: "SPORTMONKS_API_TOKEN",
        configured: providers.sportmonks.configured,
        purpose: "Football live state + final score",
      },
      {
        key: "THE_ODDS_API_KEY",
        configured: providers.theOddsApi.configured,
        purpose: "Live and historical bookmaker odds",
      },
      {
        key: "VETO_ODDS_SPORT_KEYS",
        configured: sportKeys.length > 0,
        purpose: "Explicit The Odds API competitions/sports to ingest",
      },
      {
        key: "CRON_SECRET",
        configured: secrets.cronSecretConfigured,
        purpose: "Protect scheduled ingestion routes",
      },
      {
        key: "INGESTION_SECRET",
        configured: secrets.ingestionSecretConfigured,
        purpose: "Protect manual ingestion/settlement routes",
      },
      {
        key: "VETO_STORAGE_BRIDGE_* or SUPABASE_*",
        configured: persistence.supabaseConfigured,
        purpose: "Truth Journal, decision ledger, quotes and settlement storage",
      },
    ],
  });
}
