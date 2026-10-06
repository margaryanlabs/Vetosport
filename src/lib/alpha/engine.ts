import type {
  AlphaGateResult,
  AlphaHypothesis,
  EdgeMemoryMatch,
  EdgeMemoryNode,
} from "@/lib/alpha/types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const jaccard = (a: string[], b: string[]) => {
  const left = new Set(a);
  const right = new Set(b);
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  return intersection / union.size;
};

const sampleConfidence = (sampleSize: number) =>
  clamp(Math.log1p(sampleSize) / Math.log1p(2500));

export const findEdgeMemoryMatches = ({
  sport,
  marketFamily,
  stateTags,
  memory,
  limit = 5,
}: {
  sport: string;
  marketFamily: string;
  stateTags: string[];
  memory: EdgeMemoryNode[];
  limit?: number;
}): EdgeMemoryMatch[] =>
  memory
    .filter((node) => node.sport === sport)
    .map((node) => {
      const tagSimilarity = jaccard(stateTags, node.stateTags);
      const familySimilarity =
        node.marketFamily === marketFamily ? 1 : 0.35;
      const stateSimilarity =
        0.78 * tagSimilarity + 0.22 * familySimilarity;

      const evidenceQuality = clamp(
        0.18 * sampleConfidence(node.sampleSize) +
          0.12 * clamp(node.oosWindows / 8) +
          0.18 * clamp(node.positiveClvWindowRate) +
          0.16 * clamp(node.regimeStability) +
          0.12 * clamp(node.signalSurvivalRate) +
          0.1 * clamp(node.executableCoverage) +
          0.08 * clamp(node.calibrationGain / 0.02) +
          0.06 * clamp(1 - node.fdrQValue / 0.1),
      );

      const clvQuality = clamp((node.meanNetClv + 0.01) / 0.05);
      const memoryScore = clamp(
        0.48 * stateSimilarity +
          0.34 * evidenceQuality +
          0.18 * clvQuality,
      );

      return {
        ...node,
        stateSimilarity,
        evidenceQuality,
        memoryScore,
      };
    })
    .sort((a, b) => b.memoryScore - a.memoryScore)
    .slice(0, limit);

export const evaluateAlphaHypothesis = (
  hypothesis: AlphaHypothesis,
): AlphaGateResult => {
  const clvWindowRate =
    hypothesis.oosWindows <= 0
      ? 0
      : hypothesis.positiveClvWindows / hypothesis.oosWindows;

  const checks: AlphaGateResult["checks"] = [
    {
      id: "leakage",
      label: "No leakage flags",
      passed: hypothesis.leakageFlags === 0,
      hard: true,
      detail:
        hypothesis.leakageFlags === 0
          ? "No registered leakage flags."
          : `${hypothesis.leakageFlags} leakage flag(s).`,
    },
    {
      id: "sample",
      label: "Minimum sample",
      passed: hypothesis.sampleSize >= 750,
      hard: false,
      detail: `${hypothesis.sampleSize}/750 observations.`,
    },
    {
      id: "walk-forward",
      label: "OOS windows",
      passed: hypothesis.oosWindows >= 6,
      hard: false,
      detail: `${hypothesis.oosWindows}/6 windows.`,
    },
    {
      id: "fdr",
      label: "False-discovery control",
      passed: hypothesis.fdrQValue <= 0.08,
      hard: true,
      detail: `q=${hypothesis.fdrQValue.toFixed(3)}; required ≤0.080.`,
    },
    {
      id: "clv",
      label: "Positive mean net CLV",
      passed: hypothesis.meanNetClv >= 0.008,
      hard: true,
      detail: `${(hypothesis.meanNetClv * 100).toFixed(
        2,
      )}% mean net CLV.`,
    },
    {
      id: "clv-stability",
      label: "CLV window stability",
      passed: clvWindowRate >= 0.67,
      hard: false,
      detail: `${(clvWindowRate * 100).toFixed(
        0,
      )}% positive OOS windows.`,
    },
    {
      id: "calibration",
      label: "Calibration gain",
      passed: hypothesis.calibrationGain >= 0.002,
      hard: false,
      detail: `${hypothesis.calibrationGain.toFixed(
        4,
      )} calibration gain.`,
    },
    {
      id: "logloss",
      label: "Log-loss gain",
      passed: hypothesis.logLossGain >= 0.002,
      hard: false,
      detail: `${hypothesis.logLossGain.toFixed(
        4,
      )} log-loss gain.`,
    },
    {
      id: "regime",
      label: "Regime stability",
      passed: hypothesis.regimeStability >= 0.62,
      hard: false,
      detail: `${(hypothesis.regimeStability * 100).toFixed(
        0,
      )}% regime stability.`,
    },
    {
      id: "execution",
      label: "Executable survival",
      passed: hypothesis.executableSurvivalRate >= 0.55,
      hard: false,
      detail: `${(hypothesis.executableSurvivalRate * 100).toFixed(
        0,
      )}% signal survival after execution assumptions.`,
    },
  ];

  const hardFailure = checks.some(
    (check) => check.hard && !check.passed,
  );
  const soft = checks.filter((check) => !check.hard);
  const softPassRate =
    soft.filter((check) => check.passed).length /
    Math.max(1, soft.length);

  const score = clamp(
    0.18 * sampleConfidence(hypothesis.sampleSize) +
      0.11 * clamp(hypothesis.oosWindows / 8) +
      0.17 * clamp((hypothesis.meanNetClv + 0.005) / 0.035) +
      0.12 * clvWindowRate +
      0.12 * clamp(1 - hypothesis.fdrQValue / 0.1) +
      0.1 * hypothesis.regimeStability +
      0.08 * hypothesis.executableSurvivalRate +
      0.06 * clamp(hypothesis.calibrationGain / 0.01) +
      0.06 * softPassRate,
  );

  const blockers = checks
    .filter((check) => check.hard && !check.passed)
    .map((check) => check.detail);
  const warnings = checks
    .filter((check) => !check.hard && !check.passed)
    .map((check) => check.detail);

  const status: AlphaGateResult["status"] =
    hardFailure
      ? "REJECT"
      : score >= 0.72 &&
          hypothesis.sampleSize >= 750 &&
          hypothesis.oosWindows >= 6 &&
          clvWindowRate >= 0.67
        ? "SHADOW_CANDIDATE"
        : "RESEARCH_ONLY";

  return {
    status,
    score,
    checks,
    blockers,
    warnings,
  };
};
