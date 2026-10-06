import type { Opportunity } from "@/lib/domain/types";
import { applyDecisionPolicy, type DecisionMode } from "./policy";

export interface SurfaceEntry {
  opportunity: Opportunity;
  policy: ReturnType<typeof applyDecisionPolicy>;
  rankScore: number;
}

const rankScore = (opportunity: Opportunity) => {
  const ev = Math.max(-0.25, Math.min(0.35, opportunity.expectedValue));
  const edge = Math.max(-0.2, Math.min(0.2, opportunity.probabilityEdge));
  const freshness = Math.max(0, 1 - opportunity.freshnessSeconds / 90);
  const riskPenalty = opportunity.risk === "HIGH" ? 18 : opportunity.risk === "MEDIUM" ? 7 : 0;

  return (
    opportunity.opportunityScore * 0.55 +
    opportunity.modelAgreement * 0.16 +
    ev * 100 * 0.12 +
    edge * 100 * 0.09 +
    freshness * 100 * 0.08 -
    riskPenalty
  );
};

export const rankProbabilitySurface = (
  opportunities: Opportunity[],
  mode: DecisionMode = "BALANCED",
): SurfaceEntry[] =>
  opportunities
    .map((opportunity) => ({
      opportunity,
      policy: applyDecisionPolicy(opportunity, mode),
      rankScore: rankScore(opportunity),
    }))
    .sort((a, b) => {
      if (a.policy.accepted !== b.policy.accepted) return a.policy.accepted ? -1 : 1;
      return b.rankScore - a.rankScore;
    });

export const surfaceSummary = (entries: SurfaceEntry[]) => ({
  markets: entries.length,
  edges: entries.filter((entry) => entry.policy.verdict === "EDGE").length,
  watch: entries.filter((entry) => entry.policy.verdict === "WATCH").length,
  pass: entries.filter((entry) => entry.policy.verdict === "PASS").length,
  meanVetoScore:
    entries.length === 0
      ? 0
      : entries.reduce((sum, entry) => sum + entry.opportunity.opportunityScore, 0) /
        entries.length,
});
