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
  const markets = (process.env.VETO_ODDS_MARKETS ?? "h2h,spreads,totals")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const secrets = {
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    ingestionSecretConfigured: Boolean(process.env.INGESTION_SECRET),
  };

  const canonicalGatewayConfigured =
    persistence.supabaseConfigured &&
    secrets.ingestionSecretConfigured;

  const directAdapterGaps: string[] = [];
  if (!providers.sportmonks.configured) {
    directAdapterGaps.push("SPORTMONKS_API_TOKEN is not configured.");
  }
  if (!providers.theOddsApi.configured) {
    directAdapterGaps.push("THE_ODDS_API_KEY is not configured.");
  }
  if (sportKeys.length === 0) {
    directAdapterGaps.push("VETO_ODDS_SPORT_KEYS is empty.");
  }

  const criticalBlockers: string[] = [];
  if (!persistence.supabaseConfigured) {
    criticalBlockers.push("Persistence is not configured.");
  }
  if (!secrets.ingestionSecretConfigured) {
    criticalBlockers.push("INGESTION_SECRET is not configured.");
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

  const mode =
    footballStateReady && liveOddsReady
      ? "live-ready"
      : footballStateReady || liveOddsReady
        ? "partially-configured"
        : canonicalGatewayConfigured
          ? "gateway-ready"
          : "sandbox";

  return NextResponse.json({
    model: "veto.provider-activation.v3",
    mode,
    generatedAt: new Date().toISOString(),
    providers: {
      canonicalGateway: {
        role: "provider-neutral normalized live push",
        configured: canonicalGatewayConfigured,
        endpoint: "/api/ingest/live/canonical",
      },
      sportmonks: {
        role: "football events, live state and final score",
        configured: providers.sportmonks.configured,
        keyRequired: true,
      },
      theOddsApi: {
        role: "multi-book live odds and historical snapshots",
        configured: providers.theOddsApi.configured,
        keyRequired: true,
        regions: (process.env.THE_ODDS_API_REGIONS ?? "eu")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        sportKeys,
        markets,
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
      canonicalGatewayReady: canonicalGatewayConfigured,
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
    criticalBlockers,
    directAdapterGaps,
    blockers: [...criticalBlockers, ...directAdapterGaps],
    requiredEnvironment: [
      {
        key: "SPORTMONKS_API_TOKEN",
        configured: providers.sportmonks.configured,
        purpose: "Football live state + final score",
        optionalWhenUsingGateway: true,
      },
      {
        key: "THE_ODDS_API_KEY",
        configured: providers.theOddsApi.configured,
        purpose: "Live and historical bookmaker odds",
        optionalWhenUsingGateway: true,
      },
      {
        key: "VETO_ODDS_SPORT_KEYS",
        configured: sportKeys.length > 0,
        purpose: "Explicit The Odds API competitions/sports to ingest",
        optionalWhenUsingGateway: true,
      },
      {
        key: "CRON_SECRET",
        configured: secrets.cronSecretConfigured,
        purpose: "Protect scheduled direct-provider ingestion routes",
      },
      {
        key: "INGESTION_SECRET",
        configured: secrets.ingestionSecretConfigured,
        purpose: "Protect canonical gateway/manual ingestion/settlement routes",
      },
      {
        key: "VETO_STORAGE_BRIDGE_* or SUPABASE_*",
        configured: persistence.supabaseConfigured,
        purpose: "Truth Journal, decision ledger, quotes and settlement storage",
      },
    ],
  });
}
