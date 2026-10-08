import type {
  PersistedEvent,
  PersistedEventStateRecord,
  PersistedMarketQuoteRecord,
} from "@/lib/persistence/contracts";
import { getPersistence } from "@/lib/persistence/factory";
import {
  evaluateLiveDecisionReadiness,
  extractFootballDecisionInput,
} from "@/lib/live/decision-readiness";
import { mapLatestFootballQuotes } from "@/lib/live/football-market-map";
import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";

const FEATURE_VERSION = "football.shadow-input.v2";
const MODEL_ID = "football.goal-state";
const MODEL_VERSION = "football.goal-state.v1";

export interface FootballShadowPredictionPlan {
  eventId: string;
  stateCapturedAt: string;
  featureVersion: string;
  modelId: string;
  modelVersion: string;
  features: Record<string, unknown>;
  predictions: Array<{
    marketKey: string;
    selectionKey: string;
    selectionLabel: string;
    canonicalMarketKey: string;
    canonicalSelectionKey: string;
    fairProbability: number;
    fairOdds: number;
    sourceQuoteCount: number;
  }>;
  warnings: string[];
}

export const buildFootballShadowPredictionPlan = (input: {
  event: PersistedEvent;
  state: PersistedEventStateRecord;
  quotes: PersistedMarketQuoteRecord[];
}): FootballShadowPredictionPlan => {
  if (input.event.event.sport !== "football") {
    throw new Error("Shadow football plan requires a football event.");
  }

  const normalizedInput = extractFootballDecisionInput(input.state);
  if (!normalizedInput) {
    throw new Error("Football state is not complete enough for shadow repricing.");
  }

  const surface = buildFootballProbabilitySurface({
    scoreHome: normalizedInput.scoreHome,
    scoreAway: normalizedInput.scoreAway,
    elapsedMinutes: normalizedInput.elapsedSeconds / 60,
    prematchExpectedHomeGoals: normalizedInput.prematchExpectedHomeGoals,
    prematchExpectedAwayGoals: normalizedInput.prematchExpectedAwayGoals,
    liveXgHome: normalizedInput.liveXgHome,
    liveXgAway: normalizedInput.liveXgAway,
    tempoIndex: normalizedInput.tempoIndex,
    homeRedCards: normalizedInput.homeRedCards,
    awayRedCards: normalizedInput.awayRedCards,
  });

  const mapped = mapLatestFootballQuotes({
    event: input.event,
    quotes: input.quotes,
    surface,
  });

  const counts = new Map<string, number>();
  for (const quote of input.quotes) {
    if (
      quote.eventId !== input.event.id ||
      quote.suspended ||
      !Number.isFinite(quote.decimalOdds) ||
      quote.decimalOdds <= 1
    ) {
      continue;
    }
    const key = `${quote.marketKey}|${quote.selectionKey}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    eventId: input.event.id,
    stateCapturedAt: input.state.capturedAt,
    featureVersion: FEATURE_VERSION,
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    features: {
      scoreHome: normalizedInput.scoreHome,
      scoreAway: normalizedInput.scoreAway,
      elapsedSeconds: normalizedInput.elapsedSeconds,
      prematchExpectedHomeGoals:
        normalizedInput.prematchExpectedHomeGoals,
      prematchExpectedAwayGoals:
        normalizedInput.prematchExpectedAwayGoals,
      liveXgHome: normalizedInput.liveXgHome,
      liveXgAway: normalizedInput.liveXgAway,
      tempoIndex: normalizedInput.tempoIndex,
      homeRedCards: normalizedInput.homeRedCards,
      awayRedCards: normalizedInput.awayRedCards,
      stateSource: input.state.sourceProvider,
      stateFingerprint: input.state.fingerprint,
      shadow: true,
      calibration: "UNVALIDATED",
    },
    predictions: mapped.map(({ quote, modelMarket }) => ({
      marketKey: quote.marketKey,
      selectionKey: quote.selectionKey,
      selectionLabel: quote.selectionLabel,
      canonicalMarketKey: modelMarket.marketId,
      canonicalSelectionKey: modelMarket.selectionId,
      fairProbability: modelMarket.probability,
      fairOdds: modelMarket.fairOdds,
      sourceQuoteCount:
        counts.get(`${quote.marketKey}|${quote.selectionKey}`) ?? 1,
    })),
    warnings: [
      "SHADOW ONLY: prediction snapshots are stored without EDGE/WATCH/PASS ledger writes.",
      "modelAgreement=0 and uncertainty=1 are persisted intentionally until independent-model validation and calibration exist.",
    ],
  };
};

export const runFootballShadowPrediction = async (
  eventId: string,
  options?: { persist?: boolean },
) => {
  const persistence = getPersistence();
  const event = await persistence.getEventById(eventId);
  if (!event) {
    return {
      ok: false,
      skipped: true,
      reason: "Persisted event not found.",
      eventId,
    };
  }

  if (event.event.sport !== "football") {
    return {
      ok: true,
      skipped: true,
      reason: "Persisted-state shadow adapter currently supports football only.",
      eventId,
    };
  }

  const [states, quotes, decisions, predictionHeads] = await Promise.all([
    persistence.listRecentEventStates({
      eventIds: [eventId],
      limit: 40,
    }),
    persistence.listRecentQuotesForEvents({
      eventIds: [eventId],
      limit: 1000,
    }),
    persistence.listDecisionHeads([eventId]),
    persistence.listPredictionHeads([eventId]),
  ]);

  const state = states[0];
  const readiness = evaluateLiveDecisionReadiness({
    event,
    state,
    quotes,
    decision: decisions[0],
  });

  if (!state || !readiness.shadowPredictionEligible) {
    return {
      ok: true,
      skipped: true,
      reason: readiness.blockers[0] ?? readiness.status,
      eventId,
      readiness,
    };
  }

  const plan = buildFootballShadowPredictionPlan({
    event,
    state,
    quotes,
  });

  if (plan.predictions.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason:
        "No deterministically mapped market selections overlap the football probability surface.",
      eventId,
      readiness,
      plan,
    };
  }

  if (options?.persist === false) {
    return {
      ok: true,
      skipped: false,
      dryRun: true,
      eventId,
      readiness,
      plan,
    };
  }

  let featureSnapshotId = await persistence.findFeatureSnapshot({
    eventId,
    version: plan.featureVersion,
    capturedAt: plan.stateCapturedAt,
  });

  if (!featureSnapshotId) {
    featureSnapshotId = await persistence.appendFeatureSnapshot({
      eventId,
      version: plan.featureVersion,
      features: plan.features,
      capturedAt: plan.stateCapturedAt,
    });
  }

  const alreadyWritten = new Set(
    predictionHeads
      .filter((row) => row.capturedAt === plan.stateCapturedAt)
      .map((row) => `${row.marketKey}|${row.selectionKey}`),
  );

  const predictionIds: string[] = [];
  for (const prediction of plan.predictions) {
    const key = `${prediction.marketKey}|${prediction.selectionKey}`;
    if (alreadyWritten.has(key)) continue;

    predictionIds.push(
      await persistence.appendPrediction({
        eventId,
        featureSnapshotId,
        marketKey: prediction.marketKey,
        selectionKey: prediction.selectionKey,
        fairProbability: prediction.fairProbability,
        fairOdds: prediction.fairOdds,
        modelAgreement: 0,
        uncertainty: 1,
        modelSignals: [
          {
            modelId: plan.modelId,
            version: plan.modelVersion,
            probability: prediction.fairProbability,
            weight: 1,
            confidence: 0,
            generatedAt: plan.stateCapturedAt,
            mode: "SHADOW",
            calibration: "UNVALIDATED",
            productionAuthorized: readiness.productionAuthorized,
            sourceQuoteCount: prediction.sourceQuoteCount,
            canonicalTarget: {
              marketKey: prediction.canonicalMarketKey,
              selectionKey: prediction.canonicalSelectionKey,
            },
          },
        ],
        capturedAt: plan.stateCapturedAt,
      }),
    );
  }

  if (predictionIds.length > 0) {
    await persistence.appendProviderHealth({
      providerId: "veto-shadow-football",
      status: "healthy",
      checkedAt: new Date().toISOString(),
      message:
        "Shadow football predictions persisted without decision-ledger writes.",
      metadata: {
        eventId,
        stateCapturedAt: plan.stateCapturedAt,
        featureSnapshotId,
        mappedMarkets: plan.predictions.length,
        predictionsWritten: predictionIds.length,
        modelVersion: plan.modelVersion,
      },
    });
  }

  return {
    ok: true,
    skipped: predictionIds.length === 0,
    dryRun: false,
    eventId,
    readiness,
    featureSnapshotId,
    predictionIds,
    mappedMarkets: plan.predictions.length,
    predictionsPersisted: predictionIds.length,
    decisionWrites: 0,
    current:
      predictionIds.length === 0
        ? "All mapped predictions are already stored for this state snapshot."
        : undefined,
    warnings: plan.warnings,
  };
};
