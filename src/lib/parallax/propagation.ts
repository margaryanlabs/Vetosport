import type {
  CrossMarketPropagationAnalysis,
  CrossMarketPropagationEdge,
  MarketFamilyFingerprint,
  MarketFamilyTrace,
  MarketFamilyQuote,
} from "@/lib/parallax/propagation-types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const firstCrossing = (
  quotes: MarketFamilyQuote[],
  threshold: number,
  direction: 1 | -1,
) => {
  const quote = quotes.find((point) =>
    direction === 1
      ? point.probability >= threshold
      : point.probability <= threshold,
  );
  return quote?.tMs ?? null;
};

const monotonicity = (
  quotes: MarketFamilyQuote[],
  direction: 1 | -1,
) => {
  if (quotes.length < 2) return 0;
  let aligned = 0;
  let changes = 0;
  for (let i = 1; i < quotes.length; i += 1) {
    const diff = quotes[i].probability - quotes[i - 1].probability;
    if (Math.abs(diff) < 1e-9) continue;
    changes += 1;
    if (Math.sign(diff) === direction) aligned += 1;
  }
  return changes === 0 ? 1 : aligned / changes;
};

const buildFamily = (
  trace: MarketFamilyTrace,
): Omit<
  MarketFamilyFingerprint,
  "followerLagMs" | "staleScore" | "classification"
> => {
  const quotes = [...trace.quotes].sort((a, b) => a.tMs - b.tMs);
  const delta = trace.targetProbability - trace.baselineProbability;
  const direction: 1 | -1 = delta >= 0 ? 1 : -1;
  const magnitude = Math.max(1e-9, Math.abs(delta));
  const reactionThreshold =
    trace.baselineProbability + delta * 0.12;
  const halfThreshold =
    trace.baselineProbability + delta * 0.5;

  const reactionCross = firstCrossing(
    quotes,
    reactionThreshold,
    direction,
  );
  const halfCross = firstCrossing(quotes, halfThreshold, direction);
  const reactionDelayMs = reactionCross;
  const halfLifeMs =
    reactionCross == null || halfCross == null
      ? null
      : Math.max(0, halfCross - reactionCross);
  const responseTimeMs =
    reactionDelayMs == null || halfLifeMs == null
      ? null
      : reactionDelayMs + halfLifeMs;

  const currentProbability =
    quotes.at(-1)?.probability ?? trace.baselineProbability;
  const responseFraction = clamp(
    Math.abs(currentProbability - trace.baselineProbability) /
      magnitude,
    0,
    1.5,
  );
  const outstandingGapPp =
    Math.abs(trace.targetProbability - currentProbability) * 100;
  const executableCoverage =
    quotes.length === 0
      ? 0
      : quotes.filter(
          (quote) =>
            quote.executable !== false &&
            quote.suspended !== true,
        ).length / quotes.length;
  const directionConsistency = monotonicity(quotes, direction);
  const quoteCoverage = clamp(quotes.length / 6);
  const confidence = clamp(
    quoteCoverage * 0.3 +
      executableCoverage * 0.35 +
      directionConsistency * 0.35,
  );

  return {
    familyId: trace.familyId,
    label: trace.label,
    reactionDelayMs,
    halfLifeMs,
    responseTimeMs,
    responseFraction,
    currentProbability,
    targetProbability: trace.targetProbability,
    outstandingGapPp,
    executableCoverage,
    monotonicity: directionConsistency,
    confidence,
  };
};

export const analyzeCrossMarketPropagation = (
  traces: MarketFamilyTrace[],
): CrossMarketPropagationAnalysis => {
  const raw = traces.map(buildFamily);
  const responsive = raw
    .filter(
      (item) =>
        item.responseTimeMs != null &&
        item.responseFraction >= 0.25,
    )
    .sort(
      (a, b) =>
        (a.responseTimeMs ?? Number.POSITIVE_INFINITY) -
        (b.responseTimeMs ?? Number.POSITIVE_INFINITY),
    );

  const leader = responsive[0] ?? null;
  const leaderTime = leader?.responseTimeMs ?? null;
  const observationHorizonMs = Math.max(
    0,
    ...traces.flatMap((trace) =>
      trace.quotes.map((quote) => quote.tMs),
    ),
  );

  const families: MarketFamilyFingerprint[] = raw
    .map((item) => {
      const followerLagMs =
        leaderTime == null || item.responseTimeMs == null
          ? null
          : Math.max(0, item.responseTimeMs - leaderTime);
      const lagNorm =
        followerLagMs == null
          ? 1
          : Math.min(1, followerLagMs / 10000);
      const outstandingNorm = clamp(
        item.outstandingGapPp /
          Math.max(
            1,
            Math.abs(
              item.targetProbability -
                (traces.find((trace) => trace.familyId === item.familyId)
                  ?.baselineProbability ?? item.targetProbability),
            ) * 100,
          ),
      );
      const staleScore = clamp(
        (0.45 * outstandingNorm +
          0.35 * lagNorm +
          0.2 * item.executableCoverage) *
          item.confidence,
      );

      const classification:
        | "LEADER"
        | "ALIGNED"
        | "FOLLOWER"
        | "STALE-CANDIDATE"
        | "NO-SIGNAL" =
        item.responseFraction < 0.25
          ? "NO-SIGNAL"
          : leader?.familyId === item.familyId
            ? "LEADER"
            : followerLagMs != null &&
                followerLagMs >= 5000 &&
                item.responseFraction < 0.82 &&
                item.executableCoverage >= 0.6
              ? "STALE-CANDIDATE"
              : item.responseFraction >= 0.9 ||
                  (followerLagMs != null && followerLagMs < 2500)
                ? "ALIGNED"
                : "FOLLOWER";

      return {
        ...item,
        followerLagMs,
        staleScore,
        classification,
      };
    })
    .sort((a, b) => {
      if (a.classification === "LEADER") return -1;
      if (b.classification === "LEADER") return 1;
      return b.staleScore - a.staleScore;
    });

  const graph: CrossMarketPropagationEdge[] = [];
  if (leaderTime != null && leader) {
    for (const family of families) {
      if (
        family.familyId === leader.familyId ||
        family.responseTimeMs == null
      ) {
        continue;
      }
      const lagMs = Math.max(0, family.responseTimeMs - leaderTime);
      graph.push({
        from: leader.familyId,
        to: family.familyId,
        lagMs,
        strength: clamp(
          Math.min(leader.confidence, family.confidence) *
            family.responseFraction,
        ),
      });
    }
  }

  const responseTimes = families.flatMap((item) =>
    item.responseTimeMs == null ? [] : [item.responseTimeMs],
  );
  const confidence =
    families.length === 0
      ? 0
      : families.reduce((sum, item) => sum + item.confidence, 0) /
        families.length;

  return {
    observationHorizonMs,
    leaderFamilyId: leader?.familyId ?? null,
    propagationSpreadMs:
      responseTimes.length < 2
        ? null
        : Math.max(...responseTimes) - Math.min(...responseTimes),
    confidence,
    families,
    graph,
    staleCandidates: families
      .filter((item) => item.classification === "STALE-CANDIDATE")
      .sort((a, b) => b.staleScore - a.staleScore),
  };
};
