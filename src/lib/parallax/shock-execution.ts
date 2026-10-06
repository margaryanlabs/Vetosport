import type {
  ExecutionContext,
  ExecutionGateResult,
  ShockAssessment,
  ShockEvidence,
} from "@/lib/parallax/shock-execution-types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const classifyMarketShock = (
  evidence: ShockEvidence,
): ShockAssessment => {
  const linkedConfirmation =
    evidence.linkedMarketsObserved <= 0
      ? 0
      : clamp(
          evidence.linkedMarketsConfirmed /
            evidence.linkedMarketsObserved,
        );

  const sourceSupport = clamp(evidence.independentSources / 3);
  const persistenceSupport = clamp(evidence.persistenceMs / 12000);
  const moveStrength = clamp(Math.abs(evidence.priceMovePp) / 6);
  const reversalPenalty = clamp(evidence.reversalFraction);
  const suspensionPressure = clamp(evidence.suspensionFraction);
  const feedConflict = clamp(evidence.feedConflictScore);
  const execSupport = clamp(evidence.executableCoverage);

  const informationScore = clamp(
    (evidence.officialEventMatch ? 0.22 : 0) +
      0.16 * sourceSupport +
      (evidence.leaderMovedFirst ? 0.14 : 0) +
      0.18 * linkedConfirmation +
      0.12 * persistenceSupport +
      0.1 * execSupport +
      0.08 * moveStrength -
      0.16 * reversalPenalty -
      0.18 * feedConflict,
  );

  const liquidityScore = clamp(
    0.3 * suspensionPressure +
      0.2 * (1 - execSupport) +
      0.2 * moveStrength +
      0.18 * reversalPenalty +
      0.12 * (evidence.leaderMovedFirst ? 0 : 1),
  );

  const feedAnomalyScore = clamp(
    0.52 * feedConflict +
      0.18 * (evidence.independentSources <= 1 ? 1 : 0) +
      0.16 * reversalPenalty +
      0.14 * (evidence.officialEventMatch ? 0 : 1),
  );

  const noiseScore = clamp(
    0.28 * reversalPenalty +
      0.2 * (1 - linkedConfirmation) +
      0.18 * (1 - persistenceSupport) +
      0.16 * (1 - sourceSupport) +
      0.1 * (1 - moveStrength) +
      0.08 * (evidence.leaderMovedFirst ? 0 : 1),
  );

  const scores = [
    ["INFORMATION_SHOCK", informationScore],
    ["LIQUIDITY_SHOCK", liquidityScore],
    ["FEED_ANOMALY", feedAnomalyScore],
    ["NOISE", noiseScore],
  ] as const;

  const ordered = [...scores].sort((a, b) => b[1] - a[1]);
  const [winner, winnerScore] = ordered[0];
  const runnerUpScore = ordered[1][1];
  const margin = Math.max(0, winnerScore - runnerUpScore);
  const confidence = clamp(
    0.48 * winnerScore +
      0.32 * margin +
      0.2 *
        Math.min(
          1,
          sourceSupport * 0.5 + linkedConfirmation * 0.5,
        ),
    0,
    0.95,
  );

  const classification =
    confidence < 0.38 || winnerScore < 0.42
      ? "UNRESOLVED"
      : winner;

  const reasons: string[] = [];
  if (evidence.officialEventMatch)
    reasons.push("Official event timing supports the move.");
  if (evidence.leaderMovedFirst)
    reasons.push("Observed market leader moved before followers.");
  if (linkedConfirmation >= 0.6)
    reasons.push("Linked markets confirm the same state transition.");
  if (reversalPenalty >= 0.45)
    reasons.push("Large reversal weakens the information hypothesis.");
  if (feedConflict >= 0.4)
    reasons.push("Feed disagreement materially raises anomaly risk.");
  if (suspensionPressure >= 0.45)
    reasons.push("Suspension behavior raises liquidity-shock risk.");
  if (execSupport < 0.6)
    reasons.push("Low executable coverage weakens tradability evidence.");

  return {
    classification,
    confidence,
    informationScore,
    liquidityScore,
    feedAnomalyScore,
    noiseScore,
    evidence,
    reasons,
  };
};

export const evaluateExecutionGate = (
  context: ExecutionContext,
): ExecutionGateResult => {
  const halfLifeMs = context.signalHalfLifeMs;
  const effectiveDelayMs =
    Math.max(0, context.quoteAgeMs) +
    Math.max(0, context.expectedExecutionLatencyMs);

  const survivalFraction =
    halfLifeMs == null || halfLifeMs <= 0
      ? 0
      : Math.pow(0.5, effectiveDelayMs / halfLifeMs);

  const decayedGapPp =
    Math.max(0, context.currentRobustGapPp) * survivalFraction;
  const postLatencyGapPp =
    decayedGapPp -
    Math.max(0, context.expectedSlippagePp) -
    Math.max(0, context.executionUncertaintyPp);

  const checks: ExecutionGateResult["checks"] = [
    {
      id: "executable",
      label: "Quote executable",
      passed: context.quoteExecutable,
      hard: true,
      detail: context.quoteExecutable
        ? "Quote marked executable."
        : "Displayed quote is not executable.",
    },
    {
      id: "suspension",
      label: "Market active",
      passed: !context.marketSuspended,
      hard: true,
      detail: context.marketSuspended
        ? "Market is suspended."
        : "Market is not suspended.",
    },
    {
      id: "shock",
      label: "Shock quality",
      passed:
        context.shockAssessment.classification ===
          "INFORMATION_SHOCK" &&
        context.shockAssessment.confidence >= 0.5,
      hard: false,
      detail: `${context.shockAssessment.classification} · confidence ${(
        context.shockAssessment.confidence * 100
      ).toFixed(0)}%`,
    },
    {
      id: "freshness",
      label: "Quote age vs half-life",
      passed:
        halfLifeMs != null &&
        halfLifeMs > 0 &&
        context.quoteAgeMs < halfLifeMs,
      hard: false,
      detail:
        halfLifeMs == null
          ? "Signal half-life unavailable."
          : `${Math.round(context.quoteAgeMs)}ms age vs ${Math.round(
              halfLifeMs,
            )}ms half-life.`,
    },
    {
      id: "latency-survival",
      label: "Survives execution latency",
      passed: survivalFraction >= 0.28,
      hard: false,
      detail: `${(survivalFraction * 100).toFixed(
        0,
      )}% expected signal survival after delay.`,
    },
    {
      id: "post-latency-gap",
      label: "Positive gap after execution costs",
      passed: postLatencyGapPp > 0,
      hard: true,
      detail: `${postLatencyGapPp >= 0 ? "+" : ""}${postLatencyGapPp.toFixed(
        2,
      )} pp after decay/slippage/uncertainty.`,
    },
    {
      id: "coverage",
      label: "Executable coverage",
      passed: context.executableCoverage >= 0.65,
      hard: false,
      detail: `${(context.executableCoverage * 100).toFixed(
        0,
      )}% executable observations.`,
    },
    {
      id: "capacity",
      label: "Capacity reliability",
      passed: context.capacityReliability >= 0.5,
      hard: false,
      detail: `${(context.capacityReliability * 100).toFixed(
        0,
      )}% capacity reliability.`,
    },
  ];

  const hardFailure = checks.some(
    (check) => check.hard && !check.passed,
  );
  const softPassRate =
    checks.filter((check) => !check.hard).filter((check) => check.passed)
      .length /
    Math.max(1, checks.filter((check) => !check.hard).length);

  const gateScore = clamp(
    0.28 * survivalFraction +
      0.2 * clamp(postLatencyGapPp / 6) +
      0.16 * context.executableCoverage +
      0.12 * context.capacityReliability +
      0.14 * context.shockAssessment.confidence +
      0.1 * softPassRate,
  );

  const blockers = checks
    .filter((check) => check.hard && !check.passed)
    .map((check) => check.detail);
  const warnings = checks
    .filter((check) => !check.hard && !check.passed)
    .map((check) => check.detail);

  const status: ExecutionGateResult["status"] =
    hardFailure
      ? "PASS"
      : gateScore >= 0.62 &&
          postLatencyGapPp >= 1.25 &&
          context.shockAssessment.classification ===
            "INFORMATION_SHOCK"
        ? "RESEARCH_EDGE"
        : "WATCH";

  return {
    status,
    gateScore,
    postLatencyGapPp,
    survivalFraction,
    blockers,
    warnings,
    checks,
  };
};
