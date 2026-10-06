export interface MarketFamilyQuote {
  tMs: number;
  probability: number;
  executable?: boolean;
  suspended?: boolean;
}

export interface MarketFamilyTrace {
  familyId: string;
  label: string;
  baselineProbability: number;
  targetProbability: number;
  quotes: MarketFamilyQuote[];
}

export interface MarketFamilyFingerprint {
  familyId: string;
  label: string;
  reactionDelayMs: number | null;
  halfLifeMs: number | null;
  responseTimeMs: number | null;
  responseFraction: number;
  currentProbability: number;
  targetProbability: number;
  outstandingGapPp: number;
  followerLagMs: number | null;
  executableCoverage: number;
  monotonicity: number;
  confidence: number;
  staleScore: number;
  classification:
    | "LEADER"
    | "ALIGNED"
    | "FOLLOWER"
    | "STALE-CANDIDATE"
    | "NO-SIGNAL";
}

export interface CrossMarketPropagationEdge {
  from: string;
  to: string;
  lagMs: number;
  strength: number;
}

export interface CrossMarketPropagationAnalysis {
  observationHorizonMs: number;
  leaderFamilyId: string | null;
  propagationSpreadMs: number | null;
  confidence: number;
  families: MarketFamilyFingerprint[];
  graph: CrossMarketPropagationEdge[];
  staleCandidates: MarketFamilyFingerprint[];
}
