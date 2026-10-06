export type ShockClassification =
  | "INFORMATION_SHOCK"
  | "LIQUIDITY_SHOCK"
  | "FEED_ANOMALY"
  | "NOISE"
  | "UNRESOLVED";

export interface ShockEvidence {
  officialEventMatch: boolean;
  independentSources: number;
  leaderMovedFirst: boolean;
  linkedMarketsConfirmed: number;
  linkedMarketsObserved: number;
  persistenceMs: number;
  reversalFraction: number;
  executableCoverage: number;
  suspensionFraction: number;
  feedConflictScore: number;
  priceMovePp: number;
}

export interface ShockAssessment {
  classification: ShockClassification;
  confidence: number;
  informationScore: number;
  liquidityScore: number;
  feedAnomalyScore: number;
  noiseScore: number;
  evidence: ShockEvidence;
  reasons: string[];
}

export interface ExecutionContext {
  quoteAgeMs: number;
  expectedExecutionLatencyMs: number;
  signalHalfLifeMs: number | null;
  currentRobustGapPp: number;
  expectedSlippagePp: number;
  executionUncertaintyPp: number;
  quoteExecutable: boolean;
  marketSuspended: boolean;
  executableCoverage: number;
  capacityReliability: number;
  shockAssessment: ShockAssessment;
}

export interface ExecutionGateResult {
  status: "PASS" | "WATCH" | "RESEARCH_EDGE";
  gateScore: number;
  postLatencyGapPp: number;
  survivalFraction: number;
  blockers: string[];
  warnings: string[];
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    hard: boolean;
    detail: string;
  }>;
}
