import { NextResponse } from "next/server";
import { getDataPlaneRuntimeStatus } from "@/lib/data-plane/engine";
import { persistenceConfiguration } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

export function GET() {
  const runtime = getDataPlaneRuntimeStatus();
  const persistence = persistenceConfiguration();
  const operational =
    runtime.mode === "PUSH_READY" ||
    runtime.mode === "PARTIAL_FEEDS" ||
    runtime.mode === "LIVE_READY";

  return NextResponse.json({
    service: "veto-sport",
    status: operational ? "ok" : "degraded",
    mode: runtime.mode,
    timestamp: new Date().toISOString(),
    liveIngress: {
      canonicalGateway: runtime.canonicalGatewayConfigured,
      directAdaptersFullyReady: runtime.mode === "LIVE_READY",
    },
    persistence: {
      configured: persistence.supabaseConfigured,
      mode: persistence.storageMode,
    },
    providers: {
      sportmonks: runtime.sportmonksConfigured,
      odds: runtime.oddsConfigured,
      oddsSportKeys: runtime.oddsSportKeysCount,
    },
    blockers: runtime.blockers,
    directAdapterGaps: runtime.directAdapterGaps,
  });
}
