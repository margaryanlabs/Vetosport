import { NextResponse } from "next/server";
import {
  getDataPlaneRuntimeStatus,
} from "@/lib/data-plane/engine";
import { getPersistence } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = getDataPlaneRuntimeStatus();

  let storageReachable = false;
  let storageMessage = runtime.persistenceConfigured
    ? "Persistence configured; probing Truth Journal."
    : "Persistence environment is not configured.";

  if (runtime.persistenceConfigured) {
    try {
      const persistence = getPersistence();
      await persistence.listTruthAsOf({
        eventId: "00000000-0000-0000-0000-000000000000",
        asOf: new Date().toISOString(),
        limit: 1,
      });
      storageReachable = true;
      storageMessage = "Truth Journal is reachable.";
    } catch (error) {
      storageMessage =
        error instanceof Error
          ? error.message
          : "Truth Journal probe failed.";
    }
  }

  return NextResponse.json({
    model: "veto.data-plane.v1",
    generatedAt: new Date().toISOString(),
    runtime,
    storageReachable,
    storageMessage,
    capabilities: {
      appendOnlyTruthJournal: true,
      bitemporalReplay: true,
      historicalBackfillClock: true,
      providerRulebookVersions: true,
      quoteLineage: true,
      liveProviderKeysPresent:
        runtime.sportmonksConfigured &&
        runtime.oddsConfigured,
    },
    migration: {
      required: true,
      path: "database/migrations/009_truth_data_plane.sql",
      applied: storageReachable,
    },
  });
}
