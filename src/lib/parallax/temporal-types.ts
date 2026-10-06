export interface TemporalQuotePoint {
  tMs: number;
  probability: number;
  executable?: boolean;
  suspended?: boolean;
}

export interface BookmakerResponseSeries {
  bookId: string;
  label: string;
  marketFamily: string;
  quotes: TemporalQuotePoint[];
}

export interface MarketShock {
  id: string;
  label: string;
  t0Ms: number;
  baselineProbability: number;
  targetProbability: number;
}

export interface BookmakerFingerprint {
  bookId: string;
  label: string;
  marketFamily: string;
  reactionDelayMs: number | null;
  halfLifeMs: number | null;
  repricingVelocityPpPerSecond: number;
  finalResponseFraction: number;
  staleAreaPpSeconds: number;
  overshootPp: number;
  monotonicity: number;
  executableCoverage: number;
  fitQuality: number;
  leaderScore: number;
  followerLagMs: number | null;
  classification: "LEADER" | "FAST" | "FOLLOWER" | "STALE" | "NO-SIGNAL";
  confidence: number;
}

export interface MarketLeaderEdge {
  from: string;
  to: string;
  lagMs: number;
  strength: number;
}

export interface TemporalMarketAnalysis {
  shock: MarketShock;
  fingerprints: BookmakerFingerprint[];
  leaderGraph: MarketLeaderEdge[];
  leaderBookId: string | null;
  consensusHalfLifeMs: number | null;
  medianReactionDelayMs: number | null;
  propagationSpreadMs: number | null;
  marketResponseConfidence: number;
}
