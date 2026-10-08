import { NextResponse } from "next/server";
import { getDataPlaneRuntimeStatus } from "@/lib/data-plane/engine";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

export function GET() {
  const config = providerConfiguration();
  const persistence = persistenceConfiguration();
  const runtime = getDataPlaneRuntimeStatus();

  return NextResponse.json({
    model: "veto.provider-readiness.v1",
    generatedAt: new Date().toISOString(),
    mode: runtime.mode,
    liveReady: runtime.mode === "LIVE_READY",
    providers: {
      sportmonks: {
        role: config.sportmonks.role,
        configured: config.sportmonks.configured,
        ingestionReady:
          config.sportmonks.configured &&
          persistence.supabaseConfigured,
      },
      theOddsApi: {
        role: config.theOddsApi.role,
        configured: config.theOddsApi.configured,
        sportKeysConfigured: config.theOddsApi.sportKeysConfigured,
        sportKeysCount: config.theOddsApi.sportKeys.length,
        sportKeys: config.theOddsApi.sportKeys,
        markets: config.theOddsApi.markets,
        regions: config.theOddsApi.regions,
        ingestionReady:
          config.theOddsApi.configured &&
          config.theOddsApi.sportKeysConfigured &&
          persistence.supabaseConfigured,
      },
    },
    persistence: {
      configured: persistence.supabaseConfigured,
      mode: persistence.storageMode,
      tablePrefix: persistence.tablePrefix,
    },
    scheduler: {
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      ingestionSecretConfigured: Boolean(process.env.INGESTION_SECRET),
      liveFootballEveryMinutes: 5,
      liveOddsEveryMinutes: 5,
      quotaGuard:
        "Odds cron never polls when VETO_ODDS_SPORT_KEYS is empty.",
    },
    blockers: runtime.blockers,
    requiredEnvironment: [
      {
        key: "SPORTMONKS_API_TOKEN",
        requiredFor: "football live event/state ingestion",
        configured: config.sportmonks.configured,
        secret: true,
      },
      {
        key: "THE_ODDS_API_KEY",
        requiredFor: "market odds ingestion",
        configured: config.theOddsApi.configured,
        secret: true,
      },
      {
        key: "VETO_ODDS_SPORT_KEYS",
        requiredFor: "explicit quota-safe odds polling allowlist",
        configured: config.theOddsApi.sportKeysConfigured,
        secret: false,
      },
    ],
  });
}
