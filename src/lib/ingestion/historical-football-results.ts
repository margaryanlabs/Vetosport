import { canonicalEventKey } from "@/lib/canonical/id";
import { getPersistence } from "@/lib/persistence/factory";
import { getSportmonksClient } from "@/lib/providers/factory";

export const importHistoricalFootballResults = async (input: {
  startDate: string;
  endDate: string;
  maxPages?: number;
}) => {
  const client = getSportmonksClient();
  const persistence = getPersistence();
  const envelope = await client.getAllFixturesBetween(
    input.startDate,
    input.endDate,
    input.maxPages ?? 20,
  );

  let persistedEvents = 0;
  let completedWithScore = 0;
  const eventIdsWithFinalScore: string[] = [];
  const warnings: string[] = [];

  for (const raw of envelope.data) {
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
    persistedEvents += 1;

    const finalScore = client.extractFinalScore(raw);
    if (event.status === "finished" && finalScore) {
      completedWithScore += 1;
      eventIdsWithFinalScore.push(persisted.id);

      await persistence.appendEventState({
        eventId: persisted.id,
        sourceProvider: client.id,
        capturedAt: envelope.receivedAt,
        sourceLatencyMs: envelope.latencyMs,
        state: {
          status: "finished",
          finalScore,
          providerEventId: event.id,
          historical: true,
        },
      });
    } else if (event.status === "finished" && !finalScore) {
      warnings.push(`Finished fixture missing extractable score: ${event.id}`);
    }
  }

  await persistence.recordHistoricalImport({
    provider: client.id,
    datasetKind: "football_results",
    sport: "football",
    fromAt: new Date(`${input.startDate}T00:00:00Z`).toISOString(),
    toAt: new Date(`${input.endDate}T23:59:59Z`).toISOString(),
    rowsImported: persistedEvents,
    metadata: {
      completedWithScore,
      eventIdsWithFinalScore,
      warnings,
      maxPages: input.maxPages ?? 20,
    },
  });

  return {
    provider: client.id,
    startDate: input.startDate,
    endDate: input.endDate,
    persistedEvents,
    completedWithScore,
    eventIdsWithFinalScore,
    warnings,
  };
};
