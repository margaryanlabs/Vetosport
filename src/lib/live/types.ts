import type { Decision, EventStatus, Sport } from "@/lib/domain/types";

export interface LivePrimarySignal {
  selectionId: string;
  label: string;
  marketKey: string;
  decision: Decision;
  fairProbability: number;
  marketOdds: number;
  edge: number;
  score: number;
  capturedAt: string;
}

export type LiveDecisionReadinessStatus =
  | "DECISION_PRESENT"
  | "DATA_PENDING"
  | "MODEL_INPUT_INCOMPLETE"
  | "MARKET_MAPPING_INCOMPLETE"
  | "GOVERNANCE_BLOCKED"
  | "DECISION_READY"
  | "MODEL_ADAPTER_MISSING";

export interface LiveDecisionRequirement {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface LiveDecisionReadiness {
  status: LiveDecisionReadinessStatus;
  modelId?: string;
  modelVersion?: string;
  productionAuthorized: boolean;
  shadowPredictionEligible: boolean;
  autoDecisionEligible: boolean;
  blockers: string[];
  requirements: LiveDecisionRequirement[];
}

export interface LiveEventSummary {
  id: string;
  source: "persisted" | "sandbox";
  sport: Sport;
  sportLabel: string;
  competition: string;
  status: EventStatus;
  startsAt?: string;
  clock: string;
  period: string;
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
  pulse: "hot" | "stable" | "quiet";
  markets: number;
  repriced: number;
  intelligenceReady: boolean;
  shadowPredictionCount?: number;
  decisionReadiness?: LiveDecisionReadiness;
  lastUpdatedAt?: string;
  primarySignal?: LivePrimarySignal;
}

export interface LiveQuotePreview {
  provider: string;
  bookmaker: string;
  marketKey: string;
  selectionKey: string;
  selectionLabel: string;
  decimalOdds: number;
  capturedAt: string;
  suspended?: boolean;
}

export interface LiveShadowPrediction {
  id: string;
  marketKey: string;
  selectionKey: string;
  fairProbability: number;
  fairOdds: number;
  modelAgreement: number;
  uncertainty: number;
  modelVersion?: string;
  capturedAt: string;
}

export interface LiveObservation {
  summary: LiveEventSummary;
  stateSource?: string;
  stateCapturedAt?: string;
  stateLatencyMs?: number;
  state: Record<string, unknown>;
  quotes: LiveQuotePreview[];
  quoteCount: number;
  shadowPredictions: LiveShadowPrediction[];
  shadowPredictionCount: number;
  decisionCount: number;
  latestDecision?: LivePrimarySignal;
}
