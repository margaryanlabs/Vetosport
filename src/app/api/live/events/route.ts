import { NextResponse } from "next/server";
import { getDataPlaneRuntimeStatus } from "@/lib/data-plane/engine";
import { persistenceConfiguration } from "@/lib/persistence/factory";
import { listPersistedLiveEvents } from "@/lib/live/persisted-events";
import { sandboxEventSummaries } from "@/lib/live/sandbox";
import { sportEngineRegistry } from "@/lib/sports/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const persistence = persistenceConfiguration();
  const runtime = getDataPlaneRuntimeStatus();
  const liveIngressConfigured =
    runtime.canonicalGatewayConfigured ||
    runtime.sportmonksConfigured ||
    runtime.oddsConfigured;

  if (persistence.supabaseConfigured) {
    try {
      const events = await listPersistedLiveEvents();

      if (events.length > 0 || liveIngressConfigured) {
        return NextResponse.json({
          mode: "persisted",
          generatedAt: new Date().toISOString(),
          warning:
            events.length === 0
              ? "Live ingress is ready, but no persisted events exist in the active window."
              : undefined,
          engines: sportEngineRegistry,
          events,
        });
      }
    } catch {
      if (liveIngressConfigured) {
        return NextResponse.json({
          mode: "persisted-error",
          generatedAt: new Date().toISOString(),
          warning:
            "Live ingress is configured, but the persisted live-event read path is temporarily unavailable.",
          engines: sportEngineRegistry,
          events: [],
        });
      }
    }
  }

  return NextResponse.json({
    mode: "sandbox-fallback",
    generatedAt: new Date().toISOString(),
    warning:
      "Live ingestion is not configured. Showing explicitly labeled demo events.",
    engines: sportEngineRegistry,
    events: sandboxEventSummaries,
  });
}
