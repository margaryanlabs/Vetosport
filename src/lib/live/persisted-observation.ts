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

  const [states, quotes, predictions, decisions] = await Promise.all([
    persistence.listRecentEventStates({
      eventIds: [eventId],
      limit: 40,
    }),
    persistence.listRecentQuotesForEvents({
      eventIds: [eventId],
      limit: 500,
    }),
    persistence.listRecentPredictionsForEvents({
      eventIds: [eventId],
      limit: 500,
    }),
    persistence.listDecisionHeads([eventId]),
  ]);

  const state = states[0];
  const decision = decisions[0];
  const latestPredictionAt = predictions[0]?.capturedAt;
  const latestPredictions = latestPredictionAt
    ? predictions.filter(
        (prediction) => prediction.capturedAt === latestPredictionAt,
      )
    : [];
  const summary = buildPersistedSummary({
    event,
    state,
    quotes,
    decision,
    shadowPredictionCount: latestPredictions.length,
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
    shadowPredictions: latestPredictions.map((prediction) => {
      const firstSignal =
        prediction.modelSignals.find(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item),
        ) as Record<string, unknown> | undefined;
      return {
        id: prediction.id,
        marketKey: prediction.marketKey,
        selectionKey: prediction.selectionKey,
        fairProbability: prediction.fairProbability,
        fairOdds: prediction.fairOdds,
        modelAgreement: prediction.modelAgreement,
        uncertainty: prediction.uncertainty,
        modelVersion:
          typeof firstSignal?.version === "string"
            ? firstSignal.version
            : undefined,
        capturedAt: prediction.capturedAt,
      };
    }),
    shadowPredictionCount: latestPredictions.length,
    decisionCount: decisions.length,
    latestDecision: signalFromDecision(decision, quotes),
  };
};
