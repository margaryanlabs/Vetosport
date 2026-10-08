import { canonicalEventKey } from "@/lib/canonical/id";
import { journalizeEventState } from "@/lib/data-plane/journalize";
import { getPersistence } from "@/lib/persistence/factory";
import { getSportmonksClient } from "@/lib/providers/factory";
import { runFootballShadowPrediction } from "@/lib/live/shadow-football";

export const ingestLatestFootballState = async () => {
  const client = getSportmonksClient();
  const persistence = getPersistence();
  const envelope = await client.getLatestUpdatedFixtures();

  let eventsSeen = 0;
  let eventsPersisted = 0;
  let statesPersisted = 0;
  let journalRows = 0;
  const shadowCycles: Awaited<ReturnType<typeof runFootballShadowPrediction>>[] = [];
  const finishedEvents: Array<{
    eventId: string;
    providerEventId: string;
    finalScore: { home: number; away: number };
    settledAt: string;
  }> = [];

  for (const raw of envelope.data.data) {
    eventsSeen += 1;

    const event = client.normalizeFixture(raw);
    const canonicalKey = canonicalEventKey({
      sport: event.sport,
      competition: event.competition,
      startsAt: event.startsAt,
      home: event.home?.name,
      away: event.away?.name,
    });

    const persisted = await persistence.upsertEvent(event, canonicalKey, {
      provider: client.id,
      id: event.id,
    });
    eventsPersisted += 1;

    const score = client.extractFinalScore(raw);
    const state = {
      status: event.status,
      score,
      providerEventId: event.id,
      home: event.home,
      away: event.away,
      source: "sportmonks.fixtures.latest",
    };

    await persistence.appendEventState({
      eventId: persisted.id,
      sourceProvider: client.id,
      capturedAt: envelope.receivedAt,
      sourceLatencyMs: envelope.latencyMs,
      state,
    });
    statesPersisted += 1;

    journalRows += await persistence.appendTruthJournal([
      journalizeEventState({
        canonicalEventId: persisted.id,
        sourceProvider: client.id,
        sourceRecordId: `${event.id}:${envelope.receivedAt}`,
        gatewayReceivedAt: envelope.receivedAt,
        sourceEmittedAt: envelope.receivedAt,
        eventOccurredAt: envelope.receivedAt,
        payload: state,
      }),
    ]);

    try {
      shadowCycles.push(await runFootballShadowPrediction(persisted.id));
    } catch (error) {
      shadowCycles.push({
        ok: false,
        skipped: true,
        eventId: persisted.id,
        reason:
          error instanceof Error
            ? `Shadow cycle failed safely: ${error.message}`
            : "Shadow cycle failed safely.",
      });
    }

    if (event.status === "finished" && score) {
      finishedEvents.push({
        eventId: persisted.id,
        providerEventId: event.id,
        finalScore: score,
        settledAt: envelope.receivedAt,
      });
    }
  }

  await persistence.appendProviderHealth({
    providerId: client.id,
    status: "healthy",
    checkedAt: envelope.receivedAt,
    latencyMs: envelope.latencyMs,
    message: "Latest football state ingestion succeeded.",
    metadata: {
      eventsSeen,
      eventsPersisted,
      statesPersisted,
      journalRows,
      finishedEvents: finishedEvents.length,
      shadowCycles: shadowCycles.map((row) =>
        row.ok && !row.skipped
          ? "SHADOW_WRITTEN"
          : row.ok
            ? "SHADOW_SKIPPED"
            : "SHADOW_ERROR",
      ),
    },
  });

  return {
    provider: client.id,
    receivedAt: envelope.receivedAt,
    latencyMs: envelope.latencyMs,
    eventsSeen,
    eventsPersisted,
    statesPersisted,
    journalRows,
    finishedEvents,
    shadowCycles,
  };
};
