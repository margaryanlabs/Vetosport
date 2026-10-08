import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";
import { getPersistence } from "@/lib/persistence/factory";
import {
  evaluateLiveDecisionReadiness,
  extractFootballDecisionInput,
} from "@/lib/live/decision-readiness";
import { mapLatestFootballQuotes } from "@/lib/live/football-market-map";

const MODEL_ID = "football.goal-state";
const MODEL_VERSION = "football.goal-state.v1";
const FEATURE_VERSION = "football.persisted-state.v1";

export type FootballShadowCycleResult =
  | {
      status: "SKIPPED";
      reason: string;
      eventId: string;
      readiness?: string;
    }
  | {
      status: "SHADOW_WRITTEN" | "SHADOW_CURRENT";
      eventId: string;
      featureSnapshotId: string;
      mappedMarkets: number;
      predictionsWritten: number;
      capturedAt: string;
      modelVersion: string;
    };

export const runFootballShadowCycle = async (
  eventId: string,
): Promise<FootballShadowCycleResult> => {
  const persistence = getPersistence();
  const event = await persistence.getEventById(eventId);
  if (!event) {
    return { status: "SKIPPED", reason: "Event not found.", eventId };
  }
  if (event.event.sport !== "football") {
    return {
      status: "SKIPPED",
      reason: "Persisted-state shadow adapter currently supports football only.",
      eventId,
    };
  }

  const [states, quotes, decisions, predictionHeads] = await Promise.all([
    persistence.listRecentEventStates({ eventIds: [eventId], limit: 30 }),
    persistence.listRecentQuotesForEvents({ eventIds: [eventId], limit: 800 }),
    persistence.listDecisionHeads([eventId]),
    persistence.listPredictionHeads([eventId]),
  ]);

  const state = states[0];
  const decision = decisions[0];
  const readiness = evaluateLiveDecisionReadiness({
    event,
    state,
    quotes,
    decision,
  });

  if (!readiness.shadowPredictionEligible) {
    return {
      status: "SKIPPED",
      reason:
        readiness.blockers[0] ??
        "Shadow prediction prerequisites are not satisfied.",
      eventId,
      readiness: readiness.status,
    };
  }

  const input = extractFootballDecisionInput(state);
  if (!state || !input) {
    return {
      status: "SKIPPED",
      reason: "Typed football state could not be extracted.",
      eventId,
      readiness: readiness.status,
    };
  }

  const surface = buildFootballProbabilitySurface({
    scoreHome: input.scoreHome,
    scoreAway: input.scoreAway,
    elapsedMinutes: input.elapsedSeconds / 60,
    prematchExpectedHomeGoals: input.prematchExpectedHomeGoals,
    prematchExpectedAwayGoals: input.prematchExpectedAwayGoals,
    liveXgHome: input.liveXgHome,
    liveXgAway: input.liveXgAway,
    tempoIndex: input.tempoIndex,
    homeRedCards: input.homeRedCards,
    awayRedCards: input.awayRedCards,
  });

  const mapped = mapLatestFootballQuotes({
    event,
    quotes,
    surface,
  });

  if (mapped.length === 0) {
    return {
      status: "SKIPPED",
      reason: "No persisted quote maps deterministically to the football model surface.",
      eventId,
      readiness: "MARKET_MAPPING_INCOMPLETE",
    };
  }

  const capturedAt = state.capturedAt;
  let featureSnapshotId = await persistence.findFeatureSnapshot({
    eventId,
    version: FEATURE_VERSION,
    capturedAt,
  });
  if (!featureSnapshotId) {
    featureSnapshotId = await persistence.appendFeatureSnapshot({
      eventId,
      version: FEATURE_VERSION,
      capturedAt,
      features: {
        modelId: MODEL_ID,
        modelVersion: MODEL_VERSION,
        mode: "SHADOW",
        sourceProvider: state.sourceProvider,
        sourceFingerprint: state.fingerprint,
        input,
        remainingGoals: surface.remainingGoals,
      },
    });
  }

  const current = new Set(
    predictionHeads
      .filter((row) => row.capturedAt === capturedAt)
      .map((row) => `${row.marketKey}|${row.selectionKey}`),
  );

  let predictionsWritten = 0;
  for (const row of mapped) {
    const key = `${row.quote.marketKey}|${row.quote.selectionKey}`;
    if (current.has(key)) continue;

    await persistence.appendPrediction({
      eventId,
      featureSnapshotId,
      marketKey: row.quote.marketKey,
      selectionKey: row.quote.selectionKey,
      fairProbability: row.modelMarket.probability,
      fairOdds: row.modelMarket.fairOdds,
      // A single uncalibrated research surface is not an ensemble.
      // Keep these fields maximally conservative until promotion evidence exists.
      modelAgreement: 0,
      uncertainty: 1,
      modelSignals: [
        {
          modelId: MODEL_ID,
          version: MODEL_VERSION,
          mode: "SHADOW",
          calibration: "UNVALIDATED",
          productionAuthorized: readiness.productionAuthorized,
          mappedFrom: {
            marketKey: row.quote.marketKey,
            selectionKey: row.quote.selectionKey,
          },
          canonicalTarget: {
            marketId: row.modelMarket.marketId,
            selectionId: row.modelMarket.selectionId,
          },
        },
      ],
      capturedAt,
    });
    predictionsWritten += 1;
  }

  return {
    status: predictionsWritten > 0 ? "SHADOW_WRITTEN" : "SHADOW_CURRENT",
    eventId,
    featureSnapshotId,
    mappedMarkets: mapped.length,
    predictionsWritten,
    capturedAt,
    modelVersion: MODEL_VERSION,
  };
};
