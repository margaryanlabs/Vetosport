import type { Decision, Opportunity } from "@/lib/domain/types";

export type DecisionMode =
  | "MICRO_EDGE"
  | "BALANCED"
  | "VALUE"
  | "HIGH_CONVICTION"
  | "LIVE_PULSE";

export interface PolicyDecision {
  mode: DecisionMode;
  verdict: Decision;
  accepted: boolean;
  reasons: string[];
}

interface PolicyThresholds {
  minProbability: number;
  minExpectedValue: number;
  minScore: number;
  minAgreement: number;
  maxFreshnessSeconds: number;
  allowHighRisk: boolean;
}

const POLICIES: Record<DecisionMode, PolicyThresholds> = {
  MICRO_EDGE: {
    minProbability: 0.72,
    minExpectedValue: 0.012,
    minScore: 68,
    minAgreement: 76,
    maxFreshnessSeconds: 35,
    allowHighRisk: false,
  },
  BALANCED: {
    minProbability: 0.54,
    minExpectedValue: 0.025,
    minScore: 72,
    minAgreement: 70,
    maxFreshnessSeconds: 45,
    allowHighRisk: false,
  },
  VALUE: {
    minProbability: 0.38,
    minExpectedValue: 0.055,
    minScore: 70,
    minAgreement: 66,
    maxFreshnessSeconds: 55,
    allowHighRisk: true,
  },
  HIGH_CONVICTION: {
    minProbability: 0.62,
    minExpectedValue: 0.018,
    minScore: 82,
    minAgreement: 86,
    maxFreshnessSeconds: 30,
    allowHighRisk: false,
  },
  LIVE_PULSE: {
    minProbability: 0.48,
    minExpectedValue: 0.02,
    minScore: 66,
    minAgreement: 68,
    maxFreshnessSeconds: 12,
    allowHighRisk: false,
  },
};

export const applyDecisionPolicy = (
  opportunity: Opportunity,
  mode: DecisionMode,
): PolicyDecision => {
  const policy = POLICIES[mode];
  const reasons: string[] = [];

  if (opportunity.fairProbability < policy.minProbability) {
    reasons.push("Probability below mode threshold.");
  }
  if (opportunity.expectedValue < policy.minExpectedValue) {
    reasons.push("Expected value below mode threshold.");
  }
  if (opportunity.opportunityScore < policy.minScore) {
    reasons.push("VETO score below mode threshold.");
  }
  if (opportunity.modelAgreement < policy.minAgreement) {
    reasons.push("Model agreement below mode threshold.");
  }
  if (opportunity.freshnessSeconds > policy.maxFreshnessSeconds) {
    reasons.push("Quote/state is too stale for this mode.");
  }
  if (!policy.allowHighRisk && opportunity.risk === "HIGH") {
    reasons.push("High-risk opportunity blocked by mode policy.");
  }

  const accepted = reasons.length === 0;
  const verdict: Decision = accepted
    ? "EDGE"
    : opportunity.expectedValue > 0 && opportunity.opportunityScore >= policy.minScore - 12
      ? "WATCH"
      : "PASS";

  return { mode, verdict, accepted, reasons };
};

export const decisionModeLabel = (mode: DecisionMode) =>
  ({
    MICRO_EDGE: "Micro Edge",
    BALANCED: "Balanced",
    VALUE: "Value Hunt",
    HIGH_CONVICTION: "High Conviction",
    LIVE_PULSE: "Live Pulse",
  })[mode];
