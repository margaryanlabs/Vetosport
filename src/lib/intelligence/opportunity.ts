import type {
  DataConfidence,
  MarketQuote,
  Opportunity,
  ProbabilityEstimate,
  RiskBand,
} from "@/lib/domain/types";
import { boundedScore, expectedValue, impliedProbability } from "./math";

export interface OpportunityContext {
  dataConfidence: DataConfidence;
  freshnessSeconds: number;
  liquidityScore: number;
  correlationRisk: number;
  marketEfficiency: number;
}

const confidenceScore: Record<DataConfidence, number> = {
  LOW: 0.35,
  MEDIUM: 0.68,
  HIGH: 0.95,
};

const riskBand = (uncertainty: number, correlationRisk: number): RiskBand => {
  const score = uncertainty * 0.7 + correlationRisk * 0.3;
  if (score >= 0.62) return "HIGH";
  if (score >= 0.34) return "MEDIUM";
  return "LOW";
};

export const evaluateOpportunity = (
  quote: MarketQuote,
  estimate: ProbabilityEstimate,
  context: OpportunityContext,
): Opportunity => {
  const marketProbability = impliedProbability(quote.decimalOdds);
  const ev = expectedValue(estimate.probability, quote.decimalOdds);
  const edge = estimate.probability - marketProbability;

  const freshness = Math.max(0, 1 - context.freshnessSeconds / 120);
  const edgeQuality = Math.max(0, Math.min(1, edge / 0.1));
  const evQuality = Math.max(0, Math.min(1, ev / 0.15));
  const uncertaintyPenalty = 1 - estimate.uncertainty;
  const correlationPenalty = 1 - Math.max(0, Math.min(1, context.correlationRisk));
  const efficiencyPenalty = 1 - Math.max(0, Math.min(1, context.marketEfficiency)) * 0.35;

  const score = boundedScore(
    100 *
      (edgeQuality * 0.24 +
        evQuality * 0.18 +
        (estimate.modelAgreement / 100) * 0.17 +
        confidenceScore[context.dataConfidence] * 0.14 +
        freshness * 0.1 +
        context.liquidityScore * 0.08 +
        uncertaintyPenalty * 0.06 +
        correlationPenalty * 0.03) *
      efficiencyPenalty,
  );

  const decision =
    score >= 76 && ev > 0.025 && estimate.modelAgreement >= 72
      ? "EDGE"
      : score >= 54 && ev > 0
        ? "WATCH"
        : "PASS";

  const rationale = [
    `Model agreement: ${estimate.modelAgreement}/100`,
    `Probability edge: ${(edge * 100).toFixed(1)} pp`,
    `Expected value: ${(ev * 100).toFixed(1)}%`,
    `Data confidence: ${context.dataConfidence}`,
  ];

  if (context.freshnessSeconds > 45) rationale.push("Market quote freshness is degrading.");
  if (estimate.uncertainty > 0.55) rationale.push("Model uncertainty is elevated.");
  if (context.correlationRisk > 0.6) rationale.push("Correlation risk is elevated.");

  return {
    eventId: quote.eventId,
    marketId: quote.marketId,
    selection: quote.selection,
    decision,
    marketOdds: quote.decimalOdds,
    marketImpliedProbability: marketProbability,
    fairProbability: estimate.probability,
    fairOdds: estimate.fairOdds,
    expectedValue: ev,
    probabilityEdge: edge,
    opportunityScore: score,
    risk: riskBand(estimate.uncertainty, context.correlationRisk),
    dataConfidence: context.dataConfidence,
    modelAgreement: estimate.modelAgreement,
    freshnessSeconds: context.freshnessSeconds,
    rationale,
  };
};
