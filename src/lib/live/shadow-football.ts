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
import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";

const FEATURE_VERSION = "football.shadow-input.v1";
const MODEL_ID = "football.goal-state";
const MODEL_VERSION = "football.goal-state.v1";

const normalized = (value: string | undefined) =>
  (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const sideFromLabel = (
  label: string,
  event: PersistedEvent,
): "home" | "away" | "draw" | "over" | "under" | undefined => {
  const value = normalized(label);
  const home = normalized(event.event.home?.name);
  const away = normalized(event.event.away?.name);

  if (value === home || (home && value.includes(home))) return "home";
  if (value === away || (away && value.includes(away))) return "away";
  if (value === "draw" || value.includes("draw")) return "draw";
  if (value.startsWith("over") || value.includes(" over ")) return "over";
  if (value.startsWith("under") || value.includes(" under ")) return "under";
  return undefined;
};

const canonicalTarget = (
  quote: PersistedMarketQuoteRecord,
  event: PersistedEvent,
): { marketKey: string; selectionKey: string } | null => {
  if (
    [
      "football.1x2",
      "football.total_goals",
      "football.btts",
      "football.team_total",
      "football.handicap",
    ].includes(quote.marketKey)
  ) {
    return {
      marketKey: quote.marketKey,
      selectionKey: quote.selectionKey,
    };
  }

  const side = sideFromLabel(quote.selectionLabel, event);

  if (quote.marketKey.endsWith(".h2h")) {
    if (side === "home" || side === "away" || side === "draw") {
      return { marketKey: "football.1x2", selectionKey: side };
    }
    return null;
  }

  if (quote.marketKey.endsWith(".totals")) {
    if ((side === "over" || side === "under") && quote.line != null) {
      return {
        marketKey: "football.total_goals",
        selectionKey: `${side}-${quote.line}`,
      };
    }
    return null;
  }

  if (quote.marketKey.endsWith(".spreads")) {
    if ((side === "home" || side === "away") && quote.line != null) {
      return {
        marketKey: "football.handicap",
        selectionKey: `${side}-${quote.line}`,
      };
    }
    return null;
  }

  return null;
};

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

  const surfaceByKey = new Map(
    surface.markets.map((market) => [
      `${market.marketId}::${market.selectionId}`,
      market,
    ]),
  );

  const quoteCounts = new Map<string, number>();
  for (const quote of input.quotes) {
    if (
      quote.eventId !== input.event.id ||
      quote.suspended ||
      !Number.isFinite(quote.decimalOdds) ||
      quote.decimalOdds <= 1
    ) {
      continue;
    }
    const target = canonicalTarget(quote, input.event);
    if (!target) continue;
    const key = `${target.marketKey}::${target.selectionKey}`;
    quoteCounts.set(key, (quoteCounts.get(key) ?? 0) + 1);
  }

  const predictions = [...quoteCounts.entries()].flatMap(([key, count]) => {
    const market = surfaceByKey.get(key);
    if (!market) return [];
    return [{
      marketKey: market.marketId,
      selectionKey: market.selectionId,
      fairProbability: market.probability,
      fairOdds: market.fairOdds,
      sourceQuoteCount: count,
    }];
  });

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
    },
    predictions,
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

  const [states, quotes, decisions] = await Promise.all([
    persistence.listRecentEventStates({
      eventIds: [eventId],
      limit: 40,
    }),
    persistence.listRecentQuotesForEvents({
      eventIds: [eventId],
      limit: 1000,
    }),
    persistence.listDecisionHeads([eventId]),
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
      reason: "No mapped market selections overlap the football probability surface.",
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

  const existingFeatureSnapshot =
    await persistence.findFeatureSnapshot({
      eventId,
      version: plan.featureVersion,
      capturedAt: plan.stateCapturedAt,
    });

  if (existingFeatureSnapshot) {
    return {
      ok: true,
      skipped: true,
      reason: "Shadow prediction already exists for this state snapshot.",
      eventId,
      readiness,
      featureSnapshotId: existingFeatureSnapshot,
    };
  }

  const featureSnapshotId = await persistence.appendFeatureSnapshot({
    eventId,
    version: plan.featureVersion,
    features: plan.features,
    capturedAt: plan.stateCapturedAt,
  });

  const predictionIds: string[] = [];
  for (const prediction of plan.predictions) {
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
            note:
              "Single research model. No independent council/calibration authority.",
          },
        ],
        capturedAt: plan.stateCapturedAt,
      }),
    );
  }

  await persistence.appendProviderHealth({
    providerId: "veto-shadow-football",
    status: "healthy",
    checkedAt: new Date().toISOString(),
    message: "Shadow football predictions persisted without decision-ledger writes.",
    metadata: {
      eventId,
      stateCapturedAt: plan.stateCapturedAt,
      featureSnapshotId,
      predictions: predictionIds.length,
      modelVersion: plan.modelVersion,
    },
  });

  return {
    ok: true,
    skipped: false,
    dryRun: false,
    eventId,
    readiness,
    featureSnapshotId,
    predictionIds,
    predictionsPersisted: predictionIds.length,
    decisionWrites: 0,
    warnings: plan.warnings,
  };
};
