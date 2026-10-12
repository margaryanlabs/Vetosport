import { NextResponse } from "next/server";
import { getDataPlaneRuntimeStatus } from "@/lib/data-plane/engine";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";
import {apiFootballSchedule} from "@/lib/providers/api-football";

export const dynamic = "force-dynamic";

export function GET() {
  const providers = providerConfiguration();
  const persistence = persistenceConfiguration();
  const runtime = getDataPlaneRuntimeStatus();

  const secrets = {
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    ingestionSecretConfigured: Boolean(process.env.INGESTION_SECRET),
  };

  const apiFootballConfigured=Boolean(process.env.API_FOOTBALL_KEY);
  const apiFootballEnabled=process.env.VETO_API_FOOTBALL_ENABLED==="true";
  const apiFootballIngestionReady=apiFootballConfigured&&apiFootballEnabled&&persistence.supabaseConfigured&&secrets.cronSecretConfigured;

  const footballStateReady =
    providers.sportmonks.configured &&
    persistence.supabaseConfigured &&
    secrets.cronSecretConfigured;

  const liveOddsReady =
    providers.theOddsApi.configured &&
    providers.theOddsApi.sportKeysConfigured &&
    persistence.supabaseConfigured &&
    secrets.cronSecretConfigured;

  const activationMode =
    runtime.mode === "LIVE_READY"
      ? "live-ready"
      : runtime.mode === "PUSH_READY"
        ? "gateway-ready"
        : runtime.mode === "PARTIAL_FEEDS"
          ? "partially-configured"
          : "sandbox";

  return NextResponse.json({
    model: "veto.provider-activation.v4",
    mode: activationMode,
    runtimeMode: runtime.mode,
    generatedAt: new Date().toISOString(),
    liveReady: runtime.mode === "LIVE_READY",
    gatewayReady: runtime.canonicalGatewayConfigured,
    providers: {
      canonicalGateway: {
        role: "provider-neutral normalized live push",
        configured: runtime.canonicalGatewayConfigured,
        endpoint: "/api/ingest/live/canonical",
      },
      apiFootball: {
        role:"football live fixture + score snapshots, no bookmaker odds",
        configured:apiFootballConfigured,
        scheduledPollingEnabled:apiFootballEnabled,
        ingestionReady:apiFootballIngestionReady,
        cronEndpoint:"/api/cron/api-football-live",
        estimatedRequestsPerDay:apiFootballSchedule.perDay,
        quotaReserve:apiFootballSchedule.reserve,
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
      apiFootballIngestionReady,
      liveOddsReady,
      autoSettlementReady: footballStateReady,
      terminalClosingConsensusReady:
        liveOddsReady && persistence.supabaseConfigured,
      decisionProofReady: persistence.supabaseConfigured,
      quotaGuard:
        "Odds cron refuses polling when VETO_ODDS_SPORT_KEYS is empty.",
      schedules: {
        footballState: "*/5 * * * *",
        apiFootball: "*/30 * * * *",
        liveOdds: "*/5 * * * *",
      },
    },
    criticalBlockers: runtime.blockers,
    directAdapterGaps: [...runtime.directAdapterGaps,
      ...(apiFootballConfigured&&!apiFootballEnabled?["API-Football key present, but VETO_API_FOOTBALL_ENABLED is off; no quota calls."]:[]),
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
        key:"API_FOOTBALL_KEY",
        configured:apiFootballConfigured,
        purpose:"Direct FREE live fixture snapshots; 100 requests/day, no real-time bookmaker odds included.",
        optionalWhenUsingGateway:true,
      },
      {
        key:"VETO_API_FOOTBALL_ENABLED",
        configured:apiFootballEnabled,
        purpose:"Explicit operator consent to 48 requests/day via protected 30-minute cron; default OFF.",
        optionalWhenUsingGateway:true,
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
        key: "CRON_SECRET",
        configured: secrets.cronSecretConfigured,
        purpose: "Protect scheduled direct-provider ingestion routes",
        optionalWhenUsingGateway: true,
      },
    ],
  });
}
