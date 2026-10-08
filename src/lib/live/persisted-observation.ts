import { getPersistence } from "@/lib/persistence/factory";
import type { LiveObservation } from "@/lib/live/types";
import {
  buildPersistedSummary,
  isSelfcheckEvent,
  signalFromDecision,
} from "@/lib/live/persisted-utils";

export const getPersistedObservation = async (
  eventId: string,
): Promise<LiveObservation | null> => {
  const persistence = getPersistence();
  const event = await persistence.getEventById(eventId);
  if (!event || isSelfcheckEvent(event)) return null;

  const [states, quotes, decisions] = await Promise.all([
    persistence.listRecentEventStates({
      eventIds: [eventId],
      limit: 40,
    }),
    persistence.listRecentQuotesForEvents({
      eventIds: [eventId],
      limit: 500,
    }),
    persistence.listDecisionHeads([eventId]),
  ]);

  const state = states[0];
  const decision = decisions[0];
  const summary = buildPersistedSummary({
    event,
    state,
    quotes,
    decision,
  });

  return {
    summary,
    stateSource: state?.sourceProvider,
    stateCapturedAt: state?.capturedAt,
    stateLatencyMs: state?.sourceLatencyMs,
    state: state?.state ?? {},
    quotes: quotes.slice(0, 50).map((quote) => ({
      provider: quote.provider,
      bookmaker: quote.bookmaker,
      marketKey: quote.marketKey,
      selectionKey: quote.selectionKey,
      selectionLabel: quote.selectionLabel,
      decimalOdds: quote.decimalOdds,
      capturedAt: quote.capturedAt,
      suspended: quote.suspended,
    })),
    quoteCount: quotes.length,
    decisionCount: decisions.length,
    latestDecision: signalFromDecision(decision, quotes),
  };
};
