import { canonicalEventKey } from "@/lib/canonical/id";
import { chooseBestEventMatch } from "@/lib/canonical/match";
import {exactOddsProviderLink} from "@/lib/canonical/exact-source-identity";
import { journalizeMarketQuotes } from "@/lib/data-plane/journalize";
import { getPersistence } from "@/lib/persistence/factory";
import { getTheOddsApiClient } from "@/lib/providers/factory";
import { sportFromOddsApiKey } from "@/lib/providers/sport-map";

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

  for (const externalEvent of envelope.data) {
    eventsSeen += 1;

    const incoming = client.normalizeEvent(externalEvent, sport);
    const candidates = await persistence.findEventsAround({
      sport,
      startsAt: incoming.startsAt,
      toleranceMinutes: 25,
    });
    const match = chooseBestEventMatch(candidates, incoming);
    // Fuzzy matching is useful for browsing, but an exact sportsbook score
    // identifier is a durable claim. Require one uniquely oriented match,
    // essentially identical teams, and kickoff within one second.
    const linked=match?exactOddsProviderLink({
      candidates,incoming,externalId:externalEvent.id,
    }):null;

    let eventId: string;

    if (linked) {
      // Reuse the observed state unchanged: a scheduled bookmaker listing
      // must never downgrade an actually LIVE football fixture to scheduled.
      // upsertEvent preserves existing api-football provider_refs.
      const updated=await persistence.upsertEvent(linked.event,linked.canonicalKey,{
        provider:client.id,id:externalEvent.id,
      });
      eventId=updated.id;
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

    if(match&&!linked)warnings.push("Skipped ambiguous source identity: wrote independent odds fixture instead of attaching an unverified FT provider id.");
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
  };
};
