import {
  evaluateExecutionGate,
} from "@/lib/parallax/shock-execution";
import {
  sandboxBlockedExecution,
  sandboxExecutionGate,
  sandboxFeedAnomaly,
  sandboxInformationShock,
  sandboxLiquidityShock,
  sandboxNoiseShock,
} from "@/lib/parallax/shock-execution-sandbox";

export const runShockExecutionSelfCheck = () => {
  const expiredGate = evaluateExecutionGate({
    quoteAgeMs: 7200,
    expectedExecutionLatencyMs: 1800,
    signalHalfLifeMs: 3000,
    currentRobustGapPp: 4.2,
    expectedSlippagePp: 0.8,
    executionUncertaintyPp: 0.9,
    quoteExecutable: true,
    marketSuspended: false,
    executableCoverage: 0.9,
    capacityReliability: 0.8,
    shockAssessment: sandboxInformationShock,
  });

  const checks = [
    {
      name: "information-like shock is recognized",
      passed:
        sandboxInformationShock.classification ===
          "INFORMATION_SHOCK" &&
        sandboxInformationShock.confidence >= 0.5,
    },
    {
      name: "noise scenario does not become information shock",
      passed:
        sandboxNoiseShock.classification !== "INFORMATION_SHOCK",
    },
    {
      name: "liquidity scenario is recognized as non-information",
      passed:
        sandboxLiquidityShock.classification === "LIQUIDITY_SHOCK" ||
        sandboxLiquidityShock.classification === "UNRESOLVED",
    },
    {
      name: "feed conflict raises anomaly classification",
      passed:
        sandboxFeedAnomaly.classification === "FEED_ANOMALY",
    },
    {
      name: "healthy executable signal can reach research edge",
      passed:
        sandboxExecutionGate.status === "RESEARCH_EDGE" &&
        sandboxExecutionGate.postLatencyGapPp > 0,
    },
    {
      name: "suspended non-executable quote is hard blocked",
      passed:
        sandboxBlockedExecution.status === "PASS" &&
        sandboxBlockedExecution.blockers.length >= 2,
    },
    {
      name: "expired signal cannot remain research edge",
      passed:
        expiredGate.status !== "RESEARCH_EDGE" &&
        expiredGate.survivalFraction < 0.2,
    },
    {
      name: "gate scores remain bounded",
      passed:
        [sandboxExecutionGate, sandboxBlockedExecution, expiredGate].every(
          (item) => item.gateScore >= 0 && item.gateScore <= 1,
        ),
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      informationShock: sandboxInformationShock,
      noiseShock: sandboxNoiseShock,
      liquidityShock: sandboxLiquidityShock,
      feedAnomaly: sandboxFeedAnomaly,
      executionGate: sandboxExecutionGate,
      blockedExecution: sandboxBlockedExecution,
      expiredGate,
    },
  };
};
