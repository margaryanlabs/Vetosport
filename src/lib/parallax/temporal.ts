import type {
  BookmakerFingerprint,
  BookmakerResponseSeries,
  MarketLeaderEdge,
  MarketShock,
  TemporalMarketAnalysis,
  TemporalQuotePoint,
} from "@/lib/parallax/temporal-types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const firstCrossing = (
  points: TemporalQuotePoint[],
  threshold: number,
  direction: 1 | -1,
) => {
  const point = points.find((quote) =>
    direction === 1
      ? quote.probability >= threshold
      : quote.probability <= threshold,
  );
  return point?.tMs ?? null;
};

const normalizedProgress = (
  probability: number,
  shock: MarketShock,
) => {
  const delta = shock.targetProbability - shock.baselineProbability;
  if (Math.abs(delta) < 1e-9) return 0;
  return (probability - shock.baselineProbability) / delta;
};

const computeMonotonicity = (
  points: TemporalQuotePoint[],
  direction: 1 | -1,
) => {
  if (points.length < 2) return 0;
  let aligned = 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const diff = points[i].probability - points[i - 1].probability;
    if (Math.abs(diff) < 1e-9) continue;
    total += 1;
    if (Math.sign(diff) === direction) aligned += 1;
  }
  return total === 0 ? 1 : aligned / total;
};

const computeVelocity = (
  points: TemporalQuotePoint[],
  baselineProbability: number,
) => {
  if (points.length < 2) return 0;
  const start = points[0];
  const end = points[Math.min(points.length - 1, 3)];
  const seconds = Math.max(0.001, (end.tMs - start.tMs) / 1000);
  return (
    ((end.probability - baselineProbability) * 100) /
    seconds
  );
};

const computeStaleArea = (
  points: TemporalQuotePoint[],
  targetProbability: number,
) => {
  if (points.length < 2) return 0;
  let area = 0;
  for (let i = 1; i < points.length; i += 1) {
    const left = points[i - 1];
    const right = points[i];
    const dt = Math.max(0, (right.tMs - left.tMs) / 1000);
    const leftGap = Math.abs(targetProbability - left.probability) * 100;
    const rightGap = Math.abs(targetProbability - right.probability) * 100;
    area += ((leftGap + rightGap) / 2) * dt;
  }
  return area;
};

const computeFitQuality = (
  points: TemporalQuotePoint[],
  shock: MarketShock,
  halfLifeMs: number | null,
  delayMs: number | null,
) => {
  if (
    points.length < 3 ||
    halfLifeMs == null ||
    delayMs == null ||
    halfLifeMs <= 0
  ) {
    return 0;
  }

  const delta = shock.targetProbability - shock.baselineProbability;
  if (Math.abs(delta) < 1e-9) return 0;

  const errors = points.map((point) => {
    const elapsed = Math.max(0, point.tMs - shock.t0Ms - delayMs);
    const progress =
      elapsed <= 0
        ? 0
        : 1 - Math.pow(0.5, elapsed / halfLifeMs);
    const expected = shock.baselineProbability + delta * progress;
    return Math.abs(point.probability - expected);
  });

  const mae =
    errors.reduce((sum, value) => sum + value, 0) /
    Math.max(1, errors.length);

  return clamp(1 - mae / Math.max(0.01, Math.abs(delta)));
};

const classify = (
  halfLifeMs: number | null,
  followerLagMs: number | null,
  finalResponseFraction: number,
  leader: boolean,
) => {
  if (finalResponseFraction < 0.25) return "NO-SIGNAL" as const;
  if (leader) return "LEADER" as const;
  if (followerLagMs != null && followerLagMs >= 6000)
    return "STALE" as const;
  if (halfLifeMs != null && halfLifeMs <= 4500)
    return "FAST" as const;
  return "FOLLOWER" as const;
};

const buildRawFingerprint = (
  series: BookmakerResponseSeries,
  shock: MarketShock,
) => {
  const points = [...series.quotes]
    .filter((quote) => quote.tMs >= shock.t0Ms)
    .sort((a, b) => a.tMs - b.tMs);

  const delta = shock.targetProbability - shock.baselineProbability;
  const direction: 1 | -1 = delta >= 0 ? 1 : -1;
  const magnitude = Math.max(1e-9, Math.abs(delta));
  const reactionThreshold =
    shock.baselineProbability + delta * 0.12;
  const halfThreshold =
    shock.baselineProbability + delta * 0.5;

  const reactionCrossing = firstCrossing(
    points,
    reactionThreshold,
    direction,
  );
  const halfCrossing = firstCrossing(
    points,
    halfThreshold,
    direction,
  );

  const reactionDelayMs =
    reactionCrossing == null
      ? null
      : Math.max(0, reactionCrossing - shock.t0Ms);
  const halfLifeMs =
    halfCrossing == null
      ? null
      : Math.max(
          0,
          halfCrossing -
            shock.t0Ms -
            (reactionDelayMs ?? 0),
        );

  const finalProbability =
    points.at(-1)?.probability ?? shock.baselineProbability;
  const finalResponseFraction = clamp(
    Math.abs(finalProbability - shock.baselineProbability) /
      magnitude,
    0,
    1.6,
  );
  const overshootPp =
    Math.max(
      0,
      ...points.map(
        (point) =>
          Math.max(
            0,
            (normalizedProgress(point.probability, shock) - 1) *
              magnitude *
              100,
          ),
      ),
    );
  const executableCoverage =
    points.length === 0
      ? 0
      : points.filter(
          (point) =>
            point.executable !== false &&
            point.suspended !== true,
        ).length / points.length;

  const monotonicity = computeMonotonicity(points, direction);
  const fitQuality = computeFitQuality(
    points,
    shock,
    halfLifeMs,
    reactionDelayMs,
  );
  const quoteCoverage = clamp(points.length / 6);
  const confidence = clamp(
    quoteCoverage * 0.25 +
      executableCoverage * 0.25 +
      monotonicity * 0.2 +
      fitQuality * 0.3,
  );

  return {
    bookId: series.bookId,
    label: series.label,
    marketFamily: series.marketFamily,
    reactionDelayMs,
    halfLifeMs,
    repricingVelocityPpPerSecond: computeVelocity(
      points,
      shock.baselineProbability,
    ),
    finalResponseFraction,
    staleAreaPpSeconds: computeStaleArea(
      points,
      shock.targetProbability,
    ),
    overshootPp,
    monotonicity,
    executableCoverage,
    fitQuality,
    confidence,
  };
};

export const analyzeTemporalMarketResponse = (
  shock: MarketShock,
  series: BookmakerResponseSeries[],
): TemporalMarketAnalysis => {
  const raw = series.map((item) =>
    buildRawFingerprint(item, shock),
  );

  const responsive = raw
    .filter(
      (item) =>
        item.reactionDelayMs != null &&
        item.halfLifeMs != null &&
        item.finalResponseFraction >= 0.25,
    )
    .sort((a, b) => {
      const aT =
        (a.reactionDelayMs ?? Number.POSITIVE_INFINITY) +
        (a.halfLifeMs ?? Number.POSITIVE_INFINITY);
      const bT =
        (b.reactionDelayMs ?? Number.POSITIVE_INFINITY) +
        (b.halfLifeMs ?? Number.POSITIVE_INFINITY);
      return aT - bT;
    });

  const leader = responsive[0] ?? null;
  const leaderHalfCrossing =
    leader == null
      ? null
      : (leader.reactionDelayMs ?? 0) +
        (leader.halfLifeMs ?? 0);

  const fingerprints: BookmakerFingerprint[] = raw.map((item) => {
    const crossing =
      item.reactionDelayMs == null || item.halfLifeMs == null
        ? null
        : item.reactionDelayMs + item.halfLifeMs;
    const followerLagMs =
      crossing == null || leaderHalfCrossing == null
        ? null
        : Math.max(0, crossing - leaderHalfCrossing);

    const speedDenominator =
      item.reactionDelayMs == null || item.halfLifeMs == null
        ? Number.POSITIVE_INFINITY
        : item.reactionDelayMs + item.halfLifeMs;
    const speedScore =
      Number.isFinite(speedDenominator)
        ? 1 / Math.max(250, speedDenominator)
        : 0;
    const maxSpeed = Math.max(
      ...raw.map((candidate) => {
        const t =
          candidate.reactionDelayMs == null ||
          candidate.halfLifeMs == null
            ? Number.POSITIVE_INFINITY
            : candidate.reactionDelayMs + candidate.halfLifeMs;
        return Number.isFinite(t) ? 1 / Math.max(250, t) : 0;
      }),
      0.000001,
    );
    const leaderScore = clamp(
      (speedScore / maxSpeed) *
        (0.55 + 0.45 * item.confidence),
    );

    return {
      ...item,
      followerLagMs,
      leaderScore,
      classification: classify(
        item.halfLifeMs,
        followerLagMs,
        item.finalResponseFraction,
        leader?.bookId === item.bookId,
      ),
    };
  });

  const ordered = [...fingerprints].sort(
    (a, b) => b.leaderScore - a.leaderScore,
  );
  const leaderGraph: MarketLeaderEdge[] = [];
  if (ordered.length > 1 && ordered[0].reactionDelayMs != null) {
    const leaderNode = ordered[0];
    const leaderCross =
      (leaderNode.reactionDelayMs ?? 0) +
      (leaderNode.halfLifeMs ?? 0);

    for (const follower of ordered.slice(1)) {
      if (
        follower.reactionDelayMs == null ||
        follower.halfLifeMs == null
      ) {
        continue;
      }
      const followerCross =
        follower.reactionDelayMs + follower.halfLifeMs;
      const lagMs = Math.max(0, followerCross - leaderCross);
      leaderGraph.push({
        from: leaderNode.bookId,
        to: follower.bookId,
        lagMs,
        strength: clamp(
          (1 - Math.min(1, lagMs / 12000)) *
            Math.min(
              leaderNode.confidence,
              follower.confidence,
            ),
        ),
      });
    }
  }

  const halfLives = fingerprints.flatMap((item) =>
    item.halfLifeMs == null ? [] : [item.halfLifeMs],
  );
  const delays = fingerprints.flatMap((item) =>
    item.reactionDelayMs == null ? [] : [item.reactionDelayMs],
  );
  const crossings = fingerprints.flatMap((item) =>
    item.reactionDelayMs == null || item.halfLifeMs == null
      ? []
      : [item.reactionDelayMs + item.halfLifeMs],
  );
  const confidence =
    fingerprints.length === 0
      ? 0
      : fingerprints.reduce(
          (sum, item) => sum + item.confidence,
          0,
        ) / fingerprints.length;

  return {
    shock,
    fingerprints: ordered,
    leaderGraph,
    leaderBookId: ordered[0]?.bookId ?? null,
    consensusHalfLifeMs: median(halfLives),
    medianReactionDelayMs: median(delays),
    propagationSpreadMs:
      crossings.length < 2
        ? null
        : Math.max(...crossings) - Math.min(...crossings),
    marketResponseConfidence: confidence,
  };
};
