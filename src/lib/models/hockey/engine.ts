import {
  chooseGoalCap,
  poissonVector,
} from "@/lib/models/football/poisson";
import {
  clampProbability,
  fairOdds,
} from "@/lib/math/probability";

export interface HockeyStateInput {
  homeScore: number;
  awayScore: number;
  elapsedSeconds: number;
  regulationSeconds?: number;
  prematchExpectedHomeGoals: number;
  prematchExpectedAwayGoals: number;
  tempoIndex?: number;
  homeAttackIndex?: number;
  awayAttackIndex?: number;
  homeSkaters?: number;
  awaySkaters?: number;
  homeGoaliePulled?: boolean;
  awayGoaliePulled?: boolean;
}

export interface HockeyScoreline {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface HockeySurface {
  remainingGoals: {
    home: number;
    away: number;
    total: number;
  };
  scorelines: HockeyScoreline[];
  regulation: {
    homeWin: number;
    tie: number;
    awayWin: number;
  };
  totalUnder: (line: number) => number;
  totalOver: (line: number) => number;
  homeTeamUnder: (line: number) => number;
  awayTeamUnder: (line: number) => number;
}

const manpowerModifiers = (
  homeSkaters: number,
  awaySkaters: number,
) => {
  if (homeSkaters === awaySkaters) {
    return { home: 1, away: 1 };
  }

  if (homeSkaters > awaySkaters) {
    const advantage = Math.min(2, homeSkaters - awaySkaters);
    return {
      home: 1 + 0.36 * advantage,
      away: Math.max(0.56, 1 - 0.20 * advantage),
    };
  }

  const advantage = Math.min(2, awaySkaters - homeSkaters);
  return {
    home: Math.max(0.56, 1 - 0.20 * advantage),
    away: 1 + 0.36 * advantage,
  };
};

export const estimateHockeyRemainingGoals = (
  input: HockeyStateInput,
) => {
  const regulationSeconds = input.regulationSeconds ?? 60 * 60;
  const elapsedSeconds = Math.min(
    regulationSeconds,
    Math.max(0, input.elapsedSeconds),
  );
  const remainingShare =
    Math.max(0, regulationSeconds - elapsedSeconds) / regulationSeconds;

  const tempo = Math.min(1.45, Math.max(0.55, input.tempoIndex ?? 1));
  const homeAttack = Math.min(
    1.6,
    Math.max(0.55, input.homeAttackIndex ?? 1),
  );
  const awayAttack = Math.min(
    1.6,
    Math.max(0.55, input.awayAttackIndex ?? 1),
  );

  const homeSkaters = input.homeSkaters ?? 5;
  const awaySkaters = input.awaySkaters ?? 5;
  const manpower = manpowerModifiers(homeSkaters, awaySkaters);

  // Pulled-goalie modifiers are explicit research priors. They intentionally
  // widen late-game scoring tails until historical calibration is available.
  const homeEmptyNetAttack = input.homeGoaliePulled ? 1.16 : 1;
  const awayEmptyNetAttack = input.awayGoaliePulled ? 1.16 : 1;
  const homeOpponentEmptyNet = input.awayGoaliePulled ? 1.62 : 1;
  const awayOpponentEmptyNet = input.homeGoaliePulled ? 1.62 : 1;

  const home =
    input.prematchExpectedHomeGoals *
    remainingShare *
    tempo *
    homeAttack *
    manpower.home *
    homeEmptyNetAttack *
    homeOpponentEmptyNet;

  const away =
    input.prematchExpectedAwayGoals *
    remainingShare *
    tempo *
    awayAttack *
    manpower.away *
    awayEmptyNetAttack *
    awayOpponentEmptyNet;

  return {
    home: Math.max(0, home),
    away: Math.max(0, away),
    total: Math.max(0, home + away),
  };
};

export const buildHockeySurface = (
  input: HockeyStateInput,
): HockeySurface => {
  const remainingGoals = estimateHockeyRemainingGoals(input);
  const cap = chooseGoalCap(remainingGoals.home, remainingGoals.away);
  const homeVector = poissonVector(remainingGoals.home, cap);
  const awayVector = poissonVector(remainingGoals.away, cap);

  const raw: HockeyScoreline[] = [];
  for (let h = 0; h <= cap; h += 1) {
    for (let a = 0; a <= cap; a += 1) {
      raw.push({
        homeGoals: input.homeScore + h,
        awayGoals: input.awayScore + a,
        probability: homeVector[h] * awayVector[a],
      });
    }
  }

  const mass = raw.reduce((sum, row) => sum + row.probability, 0);
  const scorelines = raw.map((row) => ({
    ...row,
    probability: mass > 0 ? row.probability / mass : row.probability,
  }));

  const probabilityOf = (
    predicate: (row: HockeyScoreline) => boolean,
  ) =>
    scorelines.reduce(
      (sum, row) => sum + (predicate(row) ? row.probability : 0),
      0,
    );

  const regulationHomeWin = probabilityOf(
    (row) => row.homeGoals > row.awayGoals,
  );
  const regulationTie = probabilityOf(
    (row) => row.homeGoals === row.awayGoals,
  );
  const regulationAwayWin = probabilityOf(
    (row) => row.homeGoals < row.awayGoals,
  );

  return {
    remainingGoals,
    scorelines,
    regulation: {
      homeWin: clampProbability(regulationHomeWin),
      tie: clampProbability(regulationTie),
      awayWin: clampProbability(regulationAwayWin),
    },
    totalUnder: (line) =>
      clampProbability(
        probabilityOf(
          (row) => row.homeGoals + row.awayGoals < line,
        ),
      ),
    totalOver: (line) =>
      clampProbability(
        probabilityOf(
          (row) => row.homeGoals + row.awayGoals > line,
        ),
      ),
    homeTeamUnder: (line) =>
      clampProbability(
        probabilityOf((row) => row.homeGoals < line),
      ),
    awayTeamUnder: (line) =>
      clampProbability(
        probabilityOf((row) => row.awayGoals < line),
      ),
  };
};

export const priceHockeyMarket = (
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
