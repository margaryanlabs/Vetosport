/**
 * Project ZERO-S: independent late-goal tail-risk simulator.
 * All rates and stoppage-time weights are fabricated research priors.
 * NEVER emits a bet recommendation or a production EDGE.
 */
export interface LateTailInput {
  elapsedMinutes: number;
  scoreHome: number;
  scoreAway: number;
  underLine: number;
  decimalOdds: number;
  hypotheticalStake: number;
  baselineGoalRatePerMinute: number;
  quoteCapturedAt?: string;
  referenceTime?: string;
}
export type LateTailScenario = {
  label: string;
  remainingMinutes: number;
  stoppageMinutes: number;
  mu: number;
  weight: number;
  probabilityUnder: number;
  probabilityLose: number;
};
const rates = [
  { name: "LOW", multiplier: 0.70, weight: 0.25 },
  { name: "BASE", multiplier: 1.00, weight: 0.50 },
  { name: "HIGH_PRESSURE", multiplier: 1.45, weight: 0.25 },
] as const;
const stoppage = [
  { minutes: 3, weight: 0.20 },
  { minutes: 6, weight: 0.45 },
  { minutes: 10, weight: 0.25 },
  { minutes: 15, weight: 0.10 },
] as const;

export function poissonCdf(lambda: number, maxGoals: number): number {
  if (!Number.isFinite(lambda) || lambda < 0 || !Number.isInteger(maxGoals)) {
    throw new Error("Invalid Poisson arguments");
  }
  if (maxGoals < 0) return 0;
  let term = Math.exp(-lambda);
  let sum = term;
  for (let k = 1; k <= maxGoals; k += 1) {
    term *= lambda / k;
    sum += term;
  }
  return Math.max(0, Math.min(1, sum));
}

export function evaluateLateTail(input: LateTailInput) {
  const required = [
    input.elapsedMinutes, input.scoreHome, input.scoreAway,
    input.underLine, input.decimalOdds, input.hypotheticalStake,
    input.baselineGoalRatePerMinute,
  ];
  if (!required.every(v => typeof v === "number" && Number.isFinite(v))) {
    throw new Error("All fields must be finite numbers");
  }
  if (input.elapsedMinutes < 70 || input.elapsedMinutes >= 110) {
    throw new Error("Supported late-game minutes are 70 to <110");
  }
  if (![input.scoreHome, input.scoreAway].every(v => Number.isInteger(v) && v >= 0 && v < 30)) {
    throw new Error("Scores must be non-negative integers");
  }
  if (input.underLine <= 0 || input.underLine > 20 || Math.abs((input.underLine % 1) - .5) > 1e-8) {
    throw new Error("Only half-goal Under lines are supported; full/quarter lines need push settlement");
  }
  if (input.decimalOdds <= 1 || input.decimalOdds > 1000) throw new Error("Invalid decimal odds");
  if (input.hypotheticalStake < 0 || input.hypotheticalStake > 10000000) throw new Error("Invalid hypothetical stake");
  if (input.baselineGoalRatePerMinute <= 0 || input.baselineGoalRatePerMinute >= .25) {
    throw new Error("Hypothetical goal rate must be >0 and <0.25");
  }

  const allowedAdditional = Math.floor(input.underLine) - input.scoreHome - input.scoreAway;
  const scenarios: LateTailScenario[] = [];
  for (const rate of rates) {
    for (const stop of stoppage) {
      const totalMinutes = 90 + stop.minutes;
      // Given an observed LIVE match, discard duration scenarios that have already ended.
      if (totalMinutes <= input.elapsedMinutes) continue;
      const remaining = totalMinutes - input.elapsedMinutes;
      const mu = remaining * input.baselineGoalRatePerMinute * rate.multiplier;
      const probabilityUnder = poissonCdf(mu, allowedAdditional);
      scenarios.push({
        label: rate.name + " / +" + stop.minutes,
        remainingMinutes: remaining,
        stoppageMinutes: stop.minutes,
        mu,
        weight: rate.weight * stop.weight,
        probabilityUnder,
        probabilityLose: 1 - probabilityUnder,
      });
    }
  }
  const sumWeight = scenarios.reduce((total, row) => total + row.weight, 0);
  if (!sumWeight) {
    throw new Error("Match has exceeded all duration scenarios: request updated live duration data");
  }
  for (const row of scenarios) row.weight /= sumWeight;
  const probabilityUnder = scenarios.reduce((sum, row) => sum + row.probabilityUnder * row.weight, 0);
  const low = Math.min(...scenarios.map(row => row.probabilityUnder));
  const high = Math.max(...scenarios.map(row => row.probabilityUnder));
  let quoteAgeSeconds: number | null = null;
  if (input.quoteCapturedAt) {
    const quoteTime = Date.parse(input.quoteCapturedAt);
    const referenceTime = input.referenceTime ? Date.parse(input.referenceTime) : Date.now();
    if (!Number.isFinite(quoteTime) || !Number.isFinite(referenceTime)) {
      throw new Error("Quote timestamps must parse to valid ISO 8601 dates");
    }
    quoteAgeSeconds = (referenceTime - quoteTime) / 1000;
  }
  const blockers = [
    "MODEL_UNCALIBRATED: all scenario priors are illustrative",
    "EXECUTION_UNVERIFIED: observed odds may not be accepted",
    "OUT_OF_SAMPLE_VALIDATION_MISSING",
  ];
  if (quoteAgeSeconds === null) blockers.push("QUOTE_TIMESTAMP_MISSING");
  else if (quoteAgeSeconds < 0) blockers.push("QUOTE_TIMESTAMP_IN_FUTURE");
  else if (quoteAgeSeconds > 12) blockers.push("QUOTE_STALE");
  if (input.elapsedMinutes >= 90) blockers.push("LATE_DURATION_PRIORS: match ongoing must be confirmed");
  if (allowedAdditional < 0) blockers.push("UNDER_MARKET_ALREADY_LOST");

  return {
    model: "veto.zero-s.late-tail.v0.2",
    verdict: "PASS_RESEARCH_ONLY" as const,
    goalsToLoseUnder: Math.max(0, allowedAdditional + 1),
    probabilityUnder,
    probabilityOfLoss: 1 - probabilityUnder,
    scenarioUnderRange: { low, high },
    scenarioRangeIsConfidenceInterval: false,
    breakEvenProbability: 1 / input.decimalOdds,
    hypotheticalProfitOnWin: input.hypotheticalStake * (input.decimalOdds - 1),
    hypotheticalLossOnDefeat: input.hypotheticalStake,
    hypotheticalExpectedPnL: input.hypotheticalStake * (input.decimalOdds * probabilityUnder - 1),
    quoteAgeSeconds,
    scenarios,
    blockers,
    warning: "Research-only: invented priors, no live data, no validated predictive edge, no bet recommendation.",
  };
}
