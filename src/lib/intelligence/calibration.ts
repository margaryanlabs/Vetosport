export interface PredictionOutcome {
  probability: number;
  outcome: 0 | 1;
}

export interface CalibrationBucket {
  from: number;
  to: number;
  count: number;
  meanProbability: number;
  observedRate: number;
  gap: number;
}

const safeProbability = (value: number) =>
  Math.min(1 - 1e-12, Math.max(1e-12, value));

export const brierScore = (rows: PredictionOutcome[]) => {
  if (rows.length === 0) return 0;
  return rows.reduce(
    (sum, row) => sum + Math.pow(row.probability - row.outcome, 2),
    0,
  ) / rows.length;
};

export const logLoss = (rows: PredictionOutcome[]) => {
  if (rows.length === 0) return 0;
  return -rows.reduce((sum, row) => {
    const p = safeProbability(row.probability);
    return sum + row.outcome * Math.log(p) + (1 - row.outcome) * Math.log(1 - p);
  }, 0) / rows.length;
};

export const calibrationBuckets = (
  rows: PredictionOutcome[],
  bucketCount = 10,
): CalibrationBucket[] => {
  const size = 1 / bucketCount;

  return Array.from({ length: bucketCount }, (_, index) => {
    const from = index * size;
    const to = index === bucketCount - 1 ? 1 : (index + 1) * size;
    const bucket = rows.filter((row) =>
      index === bucketCount - 1
        ? row.probability >= from && row.probability <= to
        : row.probability >= from && row.probability < to,
    );

    if (bucket.length === 0) {
      return { from, to, count: 0, meanProbability: 0, observedRate: 0, gap: 0 };
    }

    const meanProbability =
      bucket.reduce((sum, row) => sum + row.probability, 0) / bucket.length;
    const observedRate =
      bucket.reduce((sum, row) => sum + row.outcome, 0) / bucket.length;

    return {
      from,
      to,
      count: bucket.length,
      meanProbability,
      observedRate,
      gap: observedRate - meanProbability,
    };
  });
};


export const expectedCalibrationError = (
  rows: PredictionOutcome[],
  bucketCount = 10,
) => {
  if (rows.length === 0) return 0;

  const buckets = calibrationBuckets(rows, bucketCount);
  return buckets.reduce(
    (sum, bucket) =>
      sum + (bucket.count / rows.length) * Math.abs(bucket.gap),
    0,
  );
};

export const maximumCalibrationError = (
  rows: PredictionOutcome[],
  bucketCount = 10,
) => {
  const populated = calibrationBuckets(rows, bucketCount).filter(
    (bucket) => bucket.count > 0,
  );
  return populated.length === 0
    ? 0
    : Math.max(...populated.map((bucket) => Math.abs(bucket.gap)));
};
