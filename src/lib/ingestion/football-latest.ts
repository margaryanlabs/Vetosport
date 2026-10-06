import { canonicalEventKey } from "@/lib/canonical/id";
import { getSportmonksClient } from "@/lib/providers/factory";
import { getPersistence } from "@/lib/persistence/factory";
import type { IngestionRunSummary } from "./types";

export const ingestLatestFootballUpdates = async (): Promise<IngestionRunSummary> => {
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];
  const client = getSportmonksClient();
  const persistence = getPersistence();

  try {
    const envelope = await client.getLatestUpdatedFixtures();

    for (const rawFixture of envelope.data.data) {
      const event = client.normalizeFixture(rawFixture);
      const key = canonicalEventKey({
        sport: event.sport,
        competition: event.competition,
        startsAt: event.startsAt,
        home: event.home?.name,
        away: event.away?.name,
      });

      const persisted = await persistence.upsertEvent(event, key, {
        provider: client.id,
        id: event.id,
      });

      await persistence.appendEventState({
        eventId: persisted.id,
        sourceProvider: client.id,
        capturedAt: envelope.receivedAt,
        sourceLatencyMs: envelope.latencyMs,
        state: {
          providerEventId: event.id,
          status: event.status,
          home: event.home,
          away: event.away,
          rawStateId: rawFixture.state_id,
          rawState: rawFixture.state,
        },
      });
    }

    await persistence.appendProviderHealth({
      providerId: client.id,
      status: envelope.latencyMs > 2000 ? "degraded" : "healthy",
      checkedAt: envelope.receivedAt,
      latencyMs: envelope.latencyMs,
      message: `Latest update batch: ${envelope.data.data.length} fixtures`,
    });

    return {
      provider: client.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      eventsSeen: envelope.data.data.length,
      quotesSeen: 0,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion failure";

    try {
      await persistence.appendProviderHealth({
        providerId: client.id,
        status: "offline",
        checkedAt: new Date().toISOString(),
        message,
      });
    } catch {
      warnings.push("Could not persist provider health failure.");
    }

    throw new Error(message);
  }
};
