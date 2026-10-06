import {
  evaluateAlphaHypothesis,
  findEdgeMemoryMatches,
} from "@/lib/alpha/engine";
import {
  sandboxAlphaHypothesis,
  sandboxAlphaMemoryAnalysis,
  sandboxCurrentAlphaState,
  sandboxEdgeMemory,
} from "@/lib/alpha/sandbox";

export const runAlphaMemorySelfCheck = () => {
  const weakMultipleTesting = evaluateAlphaHypothesis({
    ...sandboxAlphaHypothesis,
    id: "weak-fdr",
    fdrQValue: 0.19,
  });

  const weakClv = evaluateAlphaHypothesis({
    ...sandboxAlphaHypothesis,
    id: "weak-clv",
    meanNetClv: 0.001,
  });

  const tinySample = evaluateAlphaHypothesis({
    ...sandboxAlphaHypothesis,
    id: "tiny-sample",
    sampleSize: 220,
    oosWindows: 3,
    positiveClvWindows: 2,
  });

  const matches = findEdgeMemoryMatches({
    ...sandboxCurrentAlphaState,
    memory: sandboxEdgeMemory,
    limit: 5,
  });

  const checks = [
    {
      name: "robust registered pattern reaches shadow candidate only",
      passed:
        sandboxAlphaMemoryAnalysis.gate.status ===
          "SHADOW_CANDIDATE",
    },
    {
      name: "multiple-testing failure is rejected",
      passed: weakMultipleTesting.status === "REJECT",
    },
    {
      name: "weak net CLV is rejected",
      passed: weakClv.status === "REJECT",
    },
    {
      name: "small sample cannot reach shadow candidate",
      passed: tinySample.status !== "SHADOW_CANDIDATE",
    },
    {
      name: "nearest memory matches current state family",
      passed:
        matches[0]?.id ===
        "mem-football-late-lowtempo-total",
    },
    {
      name: "memory scores remain bounded",
      passed: matches.every(
        (item) =>
          item.memoryScore >= 0 &&
          item.memoryScore <= 1 &&
          item.evidenceQuality >= 0 &&
          item.evidenceQuality <= 1,
      ),
    },
    {
      name: "alpha gate score remains bounded",
      passed:
        sandboxAlphaMemoryAnalysis.gate.score >= 0 &&
        sandboxAlphaMemoryAnalysis.gate.score <= 1,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      analysis: sandboxAlphaMemoryAnalysis,
      controls: {
        weakMultipleTesting,
        weakClv,
        tinySample,
      },
    },
  };
};
