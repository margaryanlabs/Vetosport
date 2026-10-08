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

  const [states, quotes, decisions, predictions] = await Promise.all([
    persistence.listRecentEventStates({
      eventIds: [eventId],
      limit: 40,
    }),
    persistence.listRecentQuotesForEvents({
      eventIds: [eventId],
      limit: 500,
    }),
    persistence.listDecisionHeads([eventId]),
    persistence.listPredictionHeads([eventId]),
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
    shadowPredictions: predictions.slice(0, 20).map((prediction) => {
      const quote = quotes.find(
        (item) =>
          item.marketKey === prediction.marketKey &&
          item.selectionKey === prediction.selectionKey,
      );
      const modelSignal = prediction.modelSignals.find(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      ) as Record<string, unknown> | undefined;
      const marketOdds = quote?.decimalOdds;
      return {
        marketKey: prediction.marketKey,
        selectionKey: prediction.selectionKey,
        label: quote?.selectionLabel ?? prediction.selectionKey,
        fairProbability: prediction.fairProbability,
        fairOdds: prediction.fairOdds,
        marketOdds,
        edge:
          marketOdds && marketOdds > 1
            ? prediction.fairProbability - 1 / marketOdds
            : undefined,
        capturedAt: prediction.capturedAt,
        modelVersion:
          typeof modelSignal?.version === "string"
            ? modelSignal.version
            : undefined,
        mode: "SHADOW" as const,
        calibration: "UNVALIDATED" as const,
      };
    }),
  };
};
