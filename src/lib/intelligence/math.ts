const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const impliedProbability = (decimalOdds: number) => {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    throw new Error("Decimal odds must be greater than 1.");
  }
  return 1 / decimalOdds;
};

export const fairOdds = (probability: number) => {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    throw new Error("Probability must be between 0 and 1.");
  }
  return 1 / probability;
};

export const expectedValue = (probability: number, decimalOdds: number) =>
  probability * decimalOdds - 1;

export const removeVig = (odds: number[]) => {
  const raw = odds.map(impliedProbability);
  const overround = raw.reduce((sum, p) => sum + p, 0);
  return raw.map((p) => p / overround);
};

export const logit = (p: number) => {
  const safe = clamp(p, 0.0001, 0.9999);
  return Math.log(safe / (1 - safe));
};

export const logistic = (x: number) => 1 / (1 + Math.exp(-x));

export const weightedMean = (values: number[], weights: number[]) => {
  if (values.length !== weights.length || values.length === 0) {
    throw new Error("Values and weights must have equal non-zero length.");
  }
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(weight, 0), 0);
  if (totalWeight === 0) return 0;
  return values.reduce((sum, value, index) => sum + value * Math.max(weights[index], 0), 0) / totalWeight;
};

export const weightedStdDev = (values: number[], weights: number[]) => {
  const mean = weightedMean(values, weights);
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(weight, 0), 0);
  if (totalWeight === 0) return 0;
  const variance =
    values.reduce(
      (sum, value, index) => sum + Math.max(weights[index], 0) * Math.pow(value - mean, 2),
      0,
    ) / totalWeight;
  return Math.sqrt(variance);
};

export const boundedScore = (value: number) => clamp(Math.round(value), 0, 100);
