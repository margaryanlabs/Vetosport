import { NextResponse } from "next/server";
import { getDataPlaneRuntimeStatus } from "@/lib/data-plane/engine";
import { persistenceConfiguration } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

export function GET() {
  const runtime = getDataPlaneRuntimeStatus();
  const persistence = persistenceConfiguration();
  const degraded = runtime.mode !== "LIVE_READY";

  return NextResponse.json({
    service: "veto-sport",
    status: degraded ? "degraded" : "ok",
    mode: runtime.mode,
    timestamp: new Date().toISOString(),
    liveProviders:
      runtime.sportmonksConfigured &&
      runtime.oddsConfigured &&
      runtime.oddsSportKeysConfigured,
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
  });
}
