/**
 * ZERO-S Goal Cascade: historical descriptive frequency, NOT a predictive model.
 * Data: https://github.com/AndrewKinsman/Football-Goal-Time-Analysis
 * Reconstructed from 7,837 internally consistent matches dated 2012–2015.
 * At END of recorded minute 80, current score is exactly 1:1.
 * Event minutes >=90 are collapsed: NOT comparable to accurate 2026 added time.
 */
export interface HistoricalCohort {
  id: string;
  label: string;
  matches: number;
  withTwoOrMoreFurtherGoals: number;
}
export const DATASET_META = {
  id: "AndrewKinsman/Football-Goal-Time-Analysis",
  era: "2012–2015",
  validFixtures: 7837,
  rejectedFixtures: 5,
  sampleSelection: "1:1 at the end of recorded minute 80",
  source: "https://github.com/AndrewKinsman/Football-Goal-Time-Analysis",
  limitations: [
    "Historical sample, not valid for 2026 live prediction without recalibration.",
    "Goal minute 90 includes extra-time events; exact seconds and referee stoppage not provided.",
    "League composition, tactics and refereeing are not controlled.",
    "No time-matched bookmaker quotes, accepted limits or fees; no betting ROI."
  ],
} as const;
export const HISTORICAL_COHORTS: HistoricalCohort[] = [
  { id: "all", label: "Все игры 1:1, минута 80", matches: 1031, withTwoOrMoreFurtherGoals: 67 },
  { id: "recent", label: "Последний гол: минуты 76–80", matches: 131, withTwoOrMoreFurtherGoals: 6 },
  { id: "older", label: "Последний гол: до 76-й минуты", matches: 900, withTwoOrMoreFurtherGoals: 61 },
];
export const HISTORICAL_BY_MINUTE: HistoricalCohort[] = [
  { id: "m77", label: "77-я минута · 1:1", matches: 1055, withTwoOrMoreFurtherGoals: 104 },
  HISTORICAL_COHORTS[0],
  { id: "m83", label: "83-я минута · 1:1", matches: 1023, withTwoOrMoreFurtherGoals: 53 },
  { id: "m85", label: "85-я минута · 1:1", matches: 1012, withTwoOrMoreFurtherGoals: 38 },
];
export function wilsonInterval(successes: number, n: number, z = 1.95996398454) {
  if (!Number.isInteger(successes) || !Number.isInteger(n) || n < 1 || successes < 0 || successes > n) {
    throw new Error("Invalid empirical binomial counts");
  }
  const p = successes / n;
  const denominator = 1 + z*z/n;
  const center = (p + z*z/(2*n)) / denominator;
  const margin = z*Math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / denominator;
  return { low: center-margin, high: center+margin };
}
export function describeCohort(cohort: HistoricalCohort) {
  const p2plus = cohort.withTwoOrMoreFurtherGoals / cohort.matches;
  return {
    ...cohort,
    observedTwoPlus: p2plus,
    observedUnder35: 1-p2plus,
    approximateWilson95ForTwoPlus: wilsonInterval(cohort.withTwoOrMoreFurtherGoals, cohort.matches),
    notAPrediction: true as const,
  };
}
export function evaluateCascadeHypothesis() {
  const recent = describeCohort(HISTORICAL_COHORTS[1]);
  const older = describeCohort(HISTORICAL_COHORTS[2]);
  return {
    hypothesis: "A goal in recorded minutes 76–80 at state 1:1 precedes HIGHER probability of 2+ further goals than a less recent last goal",
    recent, older,
    empiricalDifference: recent.observedTwoPlus-older.observedTwoPlus,
    fisherExactTwoSidedP: 0.447946751633128,
    fisherMethod: "Two-sided Fisher exact test on [[6,125],[61,839]]",
    verdict: "NOT_SUPPORTED_BY_THIS_HISTORICAL_SAMPLE" as const,
    cannotInferCausality: true as const,
    warning: "Exploratory subgroup; no pre-registered experiment; p-value descriptive and not proof of no cascade. Out-of-era sample.",
  };
}
export function runCascadeEvidenceSelfcheck() {
  const data = HISTORICAL_COHORTS;
  const hypothesis = evaluateCascadeHypothesis();
  const checks = [
    { name: "Cohorts partition complete sample", passed: data[1].matches+data[2].matches === data[0].matches },
    { name: "Cohort events partition", passed: data[1].withTwoOrMoreFurtherGoals+data[2].withTwoOrMoreFurtherGoals === data[0].withTwoOrMoreFurtherGoals },
    { name: "Wilson interval contains empirical proportion", passed: HISTORICAL_BY_MINUTE.every(row=> {
      const r = describeCohort(row); return r.observedTwoPlus >= r.approximateWilson95ForTwoPlus.low && r.observedTwoPlus <= r.approximateWilson95ForTwoPlus.high;
    }) },
    { name: "Observed cascade difference nonpositive", passed: hypothesis.empiricalDifference <= 0 },
    { name: "Never decision approval", passed: hypothesis.verdict === "NOT_SUPPORTED_BY_THIS_HISTORICAL_SAMPLE" },
  ];
  return { passed: checks.every(c=>c.passed), checks };
}
