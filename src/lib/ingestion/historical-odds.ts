import { canonicalEventKey } from "@/lib/canonical/id";
import { chooseBestEventMatch } from "@/lib/canonical/match";
import { getPersistence } from "@/lib/persistence/factory";
import { getTheOddsApiClient } from "@/lib/providers/factory";
import { sportFromOddsApiKey } from "@/lib/providers/sport-map";
import { journalizeMarketQuotes } from "@/lib/data-plane/journalize";

export interface HistoricalOddsImportPlan {
  sportKey: string;
  snapshotAt: string;
  markets: string[];
  estimatedCredits: number;
}

export const planHistoricalOddsImport = (input: {
  sportKey: string;
  snapshotAt: string;
  markets?: string[];
}): HistoricalOddsImportPlan => {
  const client = getTheOddsApiClient();
  const markets = input.markets ?? ["h2h", "spreads", "totals"];

  return {
    sportKey: input.sportKey,
    snapshotAt: new Date(input.snapshotAt).toISOString(),
    markets,
    estimatedCredits: client.estimateHistoricalOddsCost(markets),
  };
};

export const importHistoricalOddsSnapshot = async (input: {
  sportKey: string;
  snapshotAt: string;
  markets?: string[];
}) => {
  const sport = sportFromOddsApiKey(input.sportKey);
  if (!sport) {
    throw new Error(`Unsupported sport key: ${input.sportKey}`);
  }

  const client = getTheOddsApiClient();
  const persistence = getPersistence();
  const markets = input.markets ?? ["h2h", "spreads", "totals"];
  const envelope = await client.getHistoricalOdds({
    sportKey: input.sportKey,
    date: input.snapshotAt,
    markets,
  });

  let quotesImported = 0;
  let eventsSeen = 0;
  const warnings: string[] = [];

  for (const externalEvent of envelope.data.data) {
    eventsSeen += 1;
    const incoming = client.normalizeEvent(externalEvent, sport);
    const candidates = await persistence.findEventsAround({
      sport,
      startsAt: incoming.startsAt,
      toleranceMinutes: 25,
    });
    const match = chooseBestEventMatch(candidates, incoming);

    let eventId: string;

    if (match) {
      eventId = match.candidate.id;
    } else {
      const key = canonicalEventKey({
        sport,
        competition: incoming.competition,
        startsAt: incoming.startsAt,
        home: incoming.home?.name,
        away: incoming.away?.name,
      });
      const created = await persistence.upsertEvent(incoming, key, {
        provider: client.id,
        id: externalEvent.id,
      });
      eventId = created.id;
      warnings.push(
        `Created canonical event from historical odds snapshot: ${externalEvent.id}`,
      );
    }

    const quotes = client.normalizeQuotes(externalEvent);
    await persistence.appendTruthJournal(
      journalizeMarketQuotes({
        canonicalEventId: eventId,
        sourceProvider: client.id,
        gatewayReceivedAt: envelope.receivedAt,
        acquisitionMode: "HISTORICAL_BACKFILL",
        historicalKnowledgeAt: envelope.data.timestamp,
        quotes,
      }),
    );
    quotesImported += await persistence.appendQuotes(
      eventId,
      quotes,
    );
  }

  await persistence.recordHistoricalImport({
    provider: client.id,
    datasetKind: "historical_odds_snapshot",
    sport,
    fromAt: envelope.data.timestamp,
    toAt: envelope.data.timestamp,
    rowsImported: quotesImported,
    metadata: {
      sportKey: input.sportKey,
      markets,
      requestedSnapshotAt: input.snapshotAt,
      actualSnapshotAt: envelope.data.timestamp,
      previousTimestamp: envelope.data.previous_timestamp,
      nextTimestamp: envelope.data.next_timestamp,
      eventsSeen,
      quotaRemaining: envelope.quotaRemaining,
      warnings,
    },
  });

  return {
    provider: client.id,
    requestedSnapshotAt: input.snapshotAt,
    actualSnapshotAt: envelope.data.timestamp,
    previousTimestamp: envelope.data.previous_timestamp,
    nextTimestamp: envelope.data.next_timestamp,
    eventsSeen,
    quotesImported,
    quotaRemaining: envelope.quotaRemaining,
    warnings,
  };
};
