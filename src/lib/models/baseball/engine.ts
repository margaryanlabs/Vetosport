import {
  chooseGoalCap,
  poissonVector,
} from "@/lib/models/football/poisson";
import {
  clampProbability,
  fairOdds,
} from "@/lib/math/probability";

export interface BaseballStateInput {
  homeScore: number;
  awayScore: number;
  inning: number;
  half: "top" | "bottom";
  outs: 0 | 1 | 2;
  runners: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
  prematchExpectedHomeRuns: number;
  prematchExpectedAwayRuns: number;
  homeOffenseIndex?: number;
  awayOffenseIndex?: number;
  homeBullpenIndex?: number;
  awayBullpenIndex?: number;
  parkFactor?: number;
}

export interface BaseballSurface {
  remainingRuns: {
    home: number;
    away: number;
    total: number;
    currentHalfAdjustment: number;
  };
  projectedFinal: {
    home: number;
    away: number;
    total: number;
  };
  game: {
    homeWin: number;
    tieAfterNine: number;
    awayWin: number;
  };
  totalUnder: (line: number) => number;
  totalOver: (line: number) => number;
  homeTeamUnder: (line: number) => number;
  awayTeamUnder: (line: number) => number;
}

const baseStateRunValue = (
  runners: BaseballStateInput["runners"],
  outs: BaseballStateInput["outs"],
) => {
  const runnerValue =
    (runners.first ? 0.32 : 0) +
    (runners.second ? 0.54 : 0) +
    (runners.third ? 0.78 : 0);
  const outMultiplier = outs === 0 ? 1 : outs === 1 ? 0.72 : 0.42;
  return runnerValue * outMultiplier;
};

export const estimateBaseballRemainingRuns = (
  input: BaseballStateInput,
) => {
  const inning = Math.min(9, Math.max(1, input.inning));
  const completedHalfInnings =
    (inning - 1) * 2 + (input.half === "bottom" ? 1 : 0);
  const remainingHalfInnings = Math.max(0, 18 - completedHalfInnings);

  const homeRemainingShare = Math.min(
    1,
    Math.max(
      0,
      (remainingHalfInnings -
        (input.half === "top" ? 1 : 0)) /
        18,
    ),
  );
  const awayRemainingShare = Math.min(
    1,
    Math.max(
      0,
      (remainingHalfInnings -
        (input.half === "bottom" ? 1 : 0)) /
        18,
    ),
  );

  const park = Math.min(1.3, Math.max(0.75, input.parkFactor ?? 1));
  const homeOffense = Math.min(
    1.55,
    Math.max(0.55, input.homeOffenseIndex ?? 1),
  );
  const awayOffense = Math.min(
    1.55,
    Math.max(0.55, input.awayOffenseIndex ?? 1),
  );
  // >1 bullpen index means stronger run prevention.
  const homeBullpen = Math.min(
    1.5,
    Math.max(0.65, input.homeBullpenIndex ?? 1),
  );
  const awayBullpen = Math.min(
    1.5,
    Math.max(0.65, input.awayBullpenIndex ?? 1),
  );

  const currentHalfAdjustment = baseStateRunValue(
    input.runners,
    input.outs,
  );

  let home =
    input.prematchExpectedHomeRuns *
    homeRemainingShare *
    park *
    homeOffense /
    awayBullpen;
  let away =
    input.prematchExpectedAwayRuns *
    awayRemainingShare *
    park *
    awayOffense /
    homeBullpen;

  if (input.half === "top") {
    away += currentHalfAdjustment;
  } else {
    home += currentHalfAdjustment;
  }

  return {
    home: Math.max(0, home),
    away: Math.max(0, away),
    total: Math.max(0, home + away),
    currentHalfAdjustment,
  };
};

export const buildBaseballSurface = (
  input: BaseballStateInput,
): BaseballSurface => {
  const remainingRuns = estimateBaseballRemainingRuns(input);
  const cap = chooseGoalCap(remainingRuns.home, remainingRuns.away);
  const homeVector = poissonVector(remainingRuns.home, cap);
  const awayVector = poissonVector(remainingRuns.away, cap);

  const scorelines: Array<{
    home: number;
    away: number;
    probability: number;
  }> = [];

  for (let h = 0; h <= cap; h += 1) {
    for (let a = 0; a <= cap; a += 1) {
      scorelines.push({
        home: input.homeScore + h,
        away: input.awayScore + a,
        probability: homeVector[h] * awayVector[a],
      });
    }
  }

  const mass = scorelines.reduce(
    (sum, row) => sum + row.probability,
    0,
  );
  const normalized = scorelines.map((row) => ({
    ...row,
    probability: mass > 0 ? row.probability / mass : row.probability,
  }));

  const probabilityOf = (
    predicate: (row: (typeof normalized)[number]) => boolean,
  ) =>
    normalized.reduce(
      (sum, row) => sum + (predicate(row) ? row.probability : 0),
      0,
    );

  const projectedHome = input.homeScore + remainingRuns.home;
  const projectedAway = input.awayScore + remainingRuns.away;

  return {
    remainingRuns,
    projectedFinal: {
      home: projectedHome,
      away: projectedAway,
      total: projectedHome + projectedAway,
    },
    game: {
      homeWin: clampProbability(
        probabilityOf((row) => row.home > row.away),
      ),
      tieAfterNine: clampProbability(
        probabilityOf((row) => row.home === row.away),
      ),
      awayWin: clampProbability(
        probabilityOf((row) => row.home < row.away),
      ),
    },
    totalUnder: (line) =>
      clampProbability(
        probabilityOf((row) => row.home + row.away < line),
      ),
    totalOver: (line) =>
      clampProbability(
        probabilityOf((row) => row.home + row.away > line),
      ),
    homeTeamUnder: (line) =>
      clampProbability(probabilityOf((row) => row.home < line)),
    awayTeamUnder: (line) =>
      clampProbability(probabilityOf((row) => row.away < line)),
  };
};

export const priceBaseballMarket = (
  probability: number,
  marketOdds?: number,
) => ({
  probability: clampProbability(probability),
  fairOdds: fairOdds(probability),
  marketOdds,
  edge:
    marketOdds == null
      ? undefined
      : clampProbability(probability) - 1 / marketOdds,
  expectedValue:
    marketOdds == null
      ? undefined
      : clampProbability(probability) * marketOdds - 1,
});
