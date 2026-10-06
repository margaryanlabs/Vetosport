export const clampProbability = (value: number) =>
  Math.min(0.999999, Math.max(0.000001, value));

export const normalCdf = (z: number) => {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
};

export const fairOdds = (probability: number) =>
  1 / clampProbability(probability);
