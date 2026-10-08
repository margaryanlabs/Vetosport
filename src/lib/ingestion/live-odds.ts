import { canonicalEventKey } from "@/lib/canonical/id";
import { chooseBestEventMatch } from "@/lib/canonical/match";
import { journalizeMarketQuotes } from "@/lib/data-plane/journalize";
import { getPersistence } from "@/lib/persistence/factory";
import { getTheOddsApiClient } from "@/lib/providers/factory";
import { sportFromOddsApiKey } from "@/lib/providers/sport-map";
import { runFootballShadowPrediction } from "@/lib/live/shadow-football";

export const ingestLiveOdds = async (input: {
  sportKey: string;
  markets?: string[];
}) => {
  const sport = sportFromOddsApiKey(input.sportKey);
  if (!sport) {
    throw new Error(`Unsupported sport key: ${input.sportKey}`);
  }

  const client = getTheOddsApiClient();
  const persistence = getPersistence();
  const markets = input.markets ?? ["h2h", "spreads", "totals"];
  const envelope = await client.getOdds({
    sportKey: input.sportKey,
    markets,
  });

  let eventsSeen = 0;
  let eventsCreated = 0;
  let quotesPersisted = 0;
  let journalRows = 0;
  const warnings: string[] = [];
  const shadowCycles: Awaited<ReturnType<typeof runFootballShadowPrediction>>[] = [];

  for (const externalEvent of envelope.data) {
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
      eventsCreated += 1;
      warnings.push(
        `Created canonical event from live odds feed: ${externalEvent.id}`,
      );
    }

    const quotes = client.normalizeQuotes(externalEvent);

    journalRows += await persistence.appendTruthJournal(
      journalizeMarketQuotes({
        canonicalEventId: eventId,
        sourceProvider: client.id,
        gatewayReceivedAt: envelope.receivedAt,
        acquisitionMode: "LIVE",
        quotes,
      }),
    );

    quotesPersisted += await persistence.appendQuotes(eventId, quotes);

    if (sport === "football") {
      try {
        shadowCycles.push(await runFootballShadowPrediction(eventId));
      } catch (error) {
        shadowCycles.push({
          ok: false,
          skipped: true,
          eventId,
          reason:
            error instanceof Error
              ? `Shadow cycle failed safely: ${error.message}`
              : "Shadow cycle failed safely.",
        });
      }
    }
  }

  await persistence.appendProviderHealth({
    providerId: client.id,
    status: "healthy",
    checkedAt: envelope.receivedAt,
    latencyMs: envelope.latencyMs,
    quotaRemaining: envelope.quotaRemaining,
    message: "Live odds ingestion succeeded.",
    metadata: {
      sportKey: input.sportKey,
      markets,
      eventsSeen,
      eventsCreated,
      quotesPersisted,
      journalRows,
      warnings,
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
    quotaRemaining: envelope.quotaRemaining,
    sport,
    sportKey: input.sportKey,
    markets,
    eventsSeen,
    eventsCreated,
    quotesPersisted,
    journalRows,
    warnings,
    shadowCycles,
  };
};
