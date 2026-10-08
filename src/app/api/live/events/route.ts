import { NextResponse } from "next/server";
import { persistenceConfiguration } from "@/lib/persistence/factory";
import { listPersistedLiveEvents } from "@/lib/live/persisted-events";
import { sandboxEventSummaries } from "@/lib/live/sandbox";
import { sportEngineRegistry } from "@/lib/sports/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  if (persistenceConfiguration().supabaseConfigured) {
    try {
      const events = await listPersistedLiveEvents();
      if (events.length > 0) {
        return NextResponse.json({
          mode: "persisted",
          generatedAt: new Date().toISOString(),
          engines: sportEngineRegistry,
          events,
        });
      }
    } catch {
      // Fall through to an explicitly labelled sandbox response.
    }
  }

  return NextResponse.json({
    mode: "sandbox-fallback",
    generatedAt: new Date().toISOString(),
    warning: "No persisted live events are available in the active window.",
    engines: sportEngineRegistry,
    events: sandboxEventSummaries,
  });
}
