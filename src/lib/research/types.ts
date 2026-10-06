export interface RegisteredExperimentProtocol {
  id: string;
  title: string;
  sport: string;
  marketFamily: string;
  registeredAt: string;
  trainingCutoff: string;
  evaluationStart: string;
  evaluationEnd: string;
  primaryMetric: "net_clv" | "log_loss" | "brier";
  minimumEffect: number;
  fdrThreshold: number;
  minimumSample: number;
  minimumOosWindows: number;
  requiredPositiveWindowRate: number;
  allowedVariants: number;
  stateTags: string[];
  frozenFeatures: string[];
  forbiddenLookaheadFields: string[];
}

export interface ExperimentObservation {
  experimentId: string;
  sampleSize: number;
  oosWindows: number;
  positiveWindows: number;
  meanNetClv: number;
  logLossGain: number;
  brierGain: number;
  fdrQValue: number;
  leakageFlags: number;
  executionSurvivalRate: number;
  evaluatedVariants: number;
  observedProtocolHash: string;
}

export interface ExperimentIntegrityResult {
  valid: boolean;
  expectedProtocolHash: string;
  observedProtocolHash: string;
  protocolMutated: boolean;
  variantBudgetExceeded: boolean;
  leakageFree: boolean;
  reasons: string[];
}

export interface PromotionGateResult {
  status: "BLOCK" | "KEEP_SHADOW" | "ELIGIBLE_FOR_CANARY";
  score: number;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    hard: boolean;
    detail: string;
  }>;
  blockers: string[];
  warnings: string[];
}

export interface ExperimentLedgerRecord {
  index: number;
  previousHash: string | null;
  protocolHash: string;
  recordHash: string;
  experimentId: string;
  stage: "REGISTERED" | "EVALUATED" | "PROMOTION_REVIEW";
  payloadDigest: string;
}
