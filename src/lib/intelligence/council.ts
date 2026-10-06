import type { ModelSignal, ProbabilityEstimate } from "@/lib/domain/types";
import { boundedScore, fairOdds, logistic, logit, weightedMean, weightedStdDev } from "./math";

export const aggregateCouncil = (signals: ModelSignal[]): ProbabilityEstimate => {
  if (signals.length === 0) {
    throw new Error("At least one model signal is required.");
  }

  const weights = signals.map((signal) => Math.max(0, signal.weight * signal.confidence));
  const pooledLogit = weightedMean(
    signals.map((signal) => logit(signal.probability)),
    weights,
  );
  const probability = logistic(pooledLogit);
  const disagreement = weightedStdDev(
    signals.map((signal) => signal.probability),
    weights,
  );

  // 0.12 standard deviation is treated as severe disagreement.
  const agreement = boundedScore(100 * (1 - Math.min(1, disagreement / 0.12)));
  const meanConfidence = weightedMean(
    signals.map((signal) => signal.confidence),
    signals.map((signal) => Math.max(signal.weight, 0)),
  );

  // Uncertainty grows with disagreement and low confidence.
  const uncertainty = Math.min(
    1,
    disagreement / 0.12 * 0.65 + (1 - meanConfidence) * 0.35,
  );

  return {
    probability,
    fairOdds: fairOdds(probability),
    modelAgreement: agreement,
    uncertainty,
    generatedAt: new Date().toISOString(),
    modelSignals: signals,
  };
};
