import { canonicalEventKey } from "@/lib/canonical/id";
import { chooseBestEventMatch } from "@/lib/canonical/match";
import { getPersistence } from "@/lib/persistence/factory";
import { getTheOddsApiClient } from "@/lib/providers/factory";
import { sportFromOddsApiKey } from "@/lib/providers/sport-map";
import type { IngestionRunSummary } from "./types";

export const ingestOddsSport = async (input: {
  sportKey: string;
  markets?: string[];
}): Promise<IngestionRunSummary> => {
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];
  const sport = sportFromOddsApiKey(input.sportKey);

  if (!sport) {
    throw new Error(`Unsupported The Odds API sport key: ${input.sportKey}`);
  }

  const client = getTheOddsApiClient();
  const persistence = getPersistence();
  const envelope = await client.getOdds({
    sportKey: input.sportKey,
    markets: input.markets,
  });

  let quotesSeen = 0;

  for (const externalEvent of envelope.data) {
    const incoming = client.normalizeEvent(externalEvent, sport);
    const candidates = await persistence.findEventsAround({
      sport,
      startsAt: incoming.startsAt,
      toleranceMinutes: 25,
    });
    const match = chooseBestEventMatch(candidates, incoming);

    let persistedEventId: string;

    if (match) {
      persistedEventId = match.candidate.id;
      if (match.assessment.score < 0.86) {
        warnings.push(
          `Low-confidence provider match ${externalEvent.id} -> ${persistedEventId}: ${match.assessment.score.toFixed(3)}`,
        );
      }
    } else {
      const canonicalKey = canonicalEventKey({
        sport: incoming.sport,
        competition: incoming.competition,
        startsAt: incoming.startsAt,
        home: incoming.home?.name,
        away: incoming.away?.name,
      });

      const created = await persistence.upsertEvent(incoming, canonicalKey, {
        provider: client.id,
        id: externalEvent.id,
      });
      persistedEventId = created.id;
      warnings.push(
        `Created canonical event from odds provider because no existing event matched: ${externalEvent.id}`,
      );
    }

    const quotes = client.normalizeQuotes(externalEvent);
    quotesSeen += await persistence.appendQuotes(persistedEventId, quotes);
  }

  await persistence.appendProviderHealth({
    providerId: client.id,
    status: envelope.latencyMs > 2000 ? "degraded" : "healthy",
    checkedAt: envelope.receivedAt,
    latencyMs: envelope.latencyMs,
    quotaRemaining: envelope.quotaRemaining,
    message: `Odds batch: ${envelope.data.length} events / ${quotesSeen} quotes`,
    metadata: {
      sportKey: input.sportKey,
      markets: input.markets ?? ["h2h", "spreads", "totals"],
    },
  });

  return {
    provider: client.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    eventsSeen: envelope.data.length,
    quotesSeen,
    warnings,
  };
};
