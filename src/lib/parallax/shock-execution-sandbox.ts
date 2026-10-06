import {
  classifyMarketShock,
  evaluateExecutionGate,
} from "@/lib/parallax/shock-execution";
import { sandboxParallaxAnalysis } from "@/lib/parallax/sandbox";
import { sandboxTemporalAnalysis } from "@/lib/parallax/temporal-sandbox";

export const sandboxInformationShock = classifyMarketShock({
  officialEventMatch: true,
  independentSources: 3,
  leaderMovedFirst: true,
  linkedMarketsConfirmed: 4,
  linkedMarketsObserved: 5,
  persistenceMs: 14500,
  reversalFraction: 0.08,
  executableCoverage: 0.92,
  suspensionFraction: 0.1,
  feedConflictScore: 0.06,
  priceMovePp: 5.9,
});

export const sandboxExecutionGate = evaluateExecutionGate({
  quoteAgeMs: 420,
  expectedExecutionLatencyMs: 680,
  signalHalfLifeMs:
    sandboxTemporalAnalysis.consensusHalfLifeMs ?? 3400,
  currentRobustGapPp:
    sandboxParallaxAnalysis.primary.robustGap * 100,
  expectedSlippagePp: 0.55,
  executionUncertaintyPp: 0.45,
  quoteExecutable: true,
  marketSuspended: false,
  executableCoverage: 0.92,
  capacityReliability: 0.72,
  shockAssessment: sandboxInformationShock,
});

export const sandboxNoiseShock = classifyMarketShock({
  officialEventMatch: false,
  independentSources: 1,
  leaderMovedFirst: false,
  linkedMarketsConfirmed: 1,
  linkedMarketsObserved: 5,
  persistenceMs: 1800,
  reversalFraction: 0.76,
  executableCoverage: 0.58,
  suspensionFraction: 0.12,
  feedConflictScore: 0.1,
  priceMovePp: 2.2,
});

export const sandboxLiquidityShock = classifyMarketShock({
  officialEventMatch: false,
  independentSources: 2,
  leaderMovedFirst: false,
  linkedMarketsConfirmed: 1,
  linkedMarketsObserved: 4,
  persistenceMs: 3600,
  reversalFraction: 0.42,
  executableCoverage: 0.31,
  suspensionFraction: 0.72,
  feedConflictScore: 0.12,
  priceMovePp: 5.1,
});

export const sandboxFeedAnomaly = classifyMarketShock({
  officialEventMatch: false,
  independentSources: 1,
  leaderMovedFirst: false,
  linkedMarketsConfirmed: 0,
  linkedMarketsObserved: 4,
  persistenceMs: 900,
  reversalFraction: 0.55,
  executableCoverage: 0.84,
  suspensionFraction: 0.04,
  feedConflictScore: 0.91,
  priceMovePp: 4.8,
});

export const sandboxBlockedExecution = evaluateExecutionGate({
  quoteAgeMs: 500,
  expectedExecutionLatencyMs: 700,
  signalHalfLifeMs:
    sandboxTemporalAnalysis.consensusHalfLifeMs ?? 3400,
  currentRobustGapPp:
    sandboxParallaxAnalysis.primary.robustGap * 100,
  expectedSlippagePp: 0.4,
  executionUncertaintyPp: 0.5,
  quoteExecutable: false,
  marketSuspended: true,
  executableCoverage: 0.22,
  capacityReliability: 0.25,
  shockAssessment: sandboxInformationShock,
});
