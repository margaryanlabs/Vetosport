import { buildFootballProbabilitySurface } from "./surface";
import type {
  FootballLiveInputs,
  FootballProbabilitySurface,
} from "./types";

export interface InvariantResult {
  name: string;
  passed: boolean;
  value?: number;
  message?: string;
}

const closeTo = (value: number, target: number, epsilon = 1e-8) =>
  Math.abs(value - target) <= epsilon;

const sumMarket = (
  surface: FootballProbabilitySurface,
  marketId: string,
  selectionIds: string[],
) =>
  surface.markets
    .filter(
      (market) =>
        market.marketId === marketId && selectionIds.includes(market.selectionId),
    )
    .reduce((sum, market) => sum + market.probability, 0);

export const validateFootballSurface = (
  surface: FootballProbabilitySurface,
): InvariantResult[] => {
  const results: InvariantResult[] = [];

  const oneXtwo = sumMarket(surface, "football.1x2", ["home", "draw", "away"]);
  results.push({
    name: "1X2 sums to 1",
    passed: closeTo(oneXtwo, 1, 1e-7),
    value: oneXtwo,
  });

  for (const line of [1.5, 2.5, 3.5, 4.5, 5.5]) {
    const total = sumMarket(surface, "football.total_goals", [
      `over-${line}`,
      `under-${line}`,
    ]);
    results.push({
      name: `Total ${line} over+under sums to 1`,
      passed: closeTo(total, 1, 1e-7),
      value: total,
    });
  }

  const btts = sumMarket(surface, "football.btts", ["yes", "no"]);
  results.push({
    name: "BTTS yes+no sums to 1",
    passed: closeTo(btts, 1, 1e-7),
    value: btts,
  });

  const probabilitiesValid = surface.markets.every(
    (market) =>
      Number.isFinite(market.probability) &&
      market.probability > 0 &&
      market.probability < 1 &&
      Number.isFinite(market.fairOdds) &&
      market.fairOdds > 1,
  );
  results.push({
    name: "All market probabilities/fair odds are valid",
    passed: probabilitiesValid,
  });

  results.push({
    name: "Scoreline matrix retained sufficient probability mass",
    passed: surface.matrixMass >= 0.999,
    value: surface.matrixMass,
    message:
      surface.matrixMass >= 0.999
        ? undefined
        : "Increase truncation cap or inspect remaining-goals lambda.",
  });

  return results;
};

const scenarios: Array<{ name: string; input: FootballLiveInputs }> = [
  {
    name: "prematch-balanced",
    input: {
      scoreHome: 0,
      scoreAway: 0,
      elapsedMinutes: 0,
      prematchExpectedHomeGoals: 1.55,
      prematchExpectedAwayGoals: 1.15,
      tempoIndex: 1,
    },
  },
  {
    name: "live-draw-64",
    input: {
      scoreHome: 1,
      scoreAway: 1,
      elapsedMinutes: 64.3,
      prematchExpectedHomeGoals: 1.62,
      prematchExpectedAwayGoals: 1.29,
      liveXgHome: 1.31,
      liveXgAway: 0.96,
      tempoIndex: 0.81,
    },
  },
  {
    name: "home-red-card",
    input: {
      scoreHome: 1,
      scoreAway: 0,
      elapsedMinutes: 52,
      prematchExpectedHomeGoals: 1.7,
      prematchExpectedAwayGoals: 1.2,
      liveXgHome: 1.05,
      liveXgAway: 0.88,
      tempoIndex: 1.08,
      homeRedCards: 1,
    },
  },
  {
    name: "late-scoreless",
    input: {
      scoreHome: 0,
      scoreAway: 0,
      elapsedMinutes: 82,
      prematchExpectedHomeGoals: 1.45,
      prematchExpectedAwayGoals: 1.05,
      liveXgHome: 0.74,
      liveXgAway: 0.42,
      tempoIndex: 0.74,
    },
  },
];

export const runFootballSelfCheck = () =>
  scenarios.map(({ name, input }) => {
    const surface = buildFootballProbabilitySurface(input);
    const invariants = validateFootballSurface(surface);

    return {
      scenario: name,
      passed: invariants.every((result) => result.passed),
      invariants,
      remainingGoals: surface.remainingGoals,
      matrixMass: surface.matrixMass,
    };
  });
