const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const poissonProbability = (lambda: number, k: number) => {
  if (!Number.isFinite(lambda) || lambda < 0) {
    throw new Error("Poisson lambda must be a finite non-negative number.");
  }
  if (!Number.isInteger(k) || k < 0) {
    throw new Error("Poisson k must be a non-negative integer.");
  }

  if (lambda === 0) return k === 0 ? 1 : 0;

  let factorial = 1;
  for (let i = 2; i <= k; i += 1) factorial *= i;

  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial;
};

export const poissonVector = (lambda: number, maxGoals: number) =>
  Array.from({ length: maxGoals + 1 }, (_, goals) =>
    poissonProbability(lambda, goals),
  );

export const chooseGoalCap = (lambdaHome: number, lambdaAway: number) => {
  // Live football lambdas are normally small. Dynamic cap keeps residual mass
  // negligible without building an unnecessarily large matrix.
  const largest = Math.max(lambdaHome, lambdaAway);
  return clamp(Math.ceil(largest + 7 * Math.sqrt(Math.max(largest, 0.2))), 7, 14);
};
