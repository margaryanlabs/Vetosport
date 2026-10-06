import { clampProbability, fairOdds, normalCdf } from "@/lib/math/probability";

export interface BasketballStateInput {
  homeScore: number;
  awayScore: number;
  elapsedSeconds: number;
  regulationSeconds?: number;
  projectedPossessionsPerTeam: number;
  homePointsPerPossession: number;
  awayPointsPerPossession: number;
  possessionVariance?: number;
}

export interface BasketballSurface {
  projectedFinal: {
    home: number;
    away: number;
    total: number;
    margin: number;
  };
  remainingPossessionsPerTeam: number;
  totalStdDev: number;
  marginStdDev: number;
  totalUnder: (line: number) => number;
  totalOver: (line: number) => number;
  homeCover: (handicap: number) => number;
  awayCover: (handicap: number) => number;
  homeTeamUnder: (line: number) => number;
  awayTeamUnder: (line: number) => number;
}

export const buildBasketballSurface = (
  input: BasketballStateInput,
): BasketballSurface => {
  const regulationSeconds = input.regulationSeconds ?? 48 * 60;
  const elapsed = Math.min(regulationSeconds, Math.max(0, input.elapsedSeconds));
  const remainingShare = Math.max(0, (regulationSeconds - elapsed) / regulationSeconds);
  const remainingPossessionsPerTeam =
    Math.max(0, input.projectedPossessionsPerTeam * remainingShare);

  const projectedHome =
    input.homeScore +
    remainingPossessionsPerTeam * Math.max(0, input.homePointsPerPossession);
  const projectedAway =
    input.awayScore +
    remainingPossessionsPerTeam * Math.max(0, input.awayPointsPerPossession);
  const projectedTotal = projectedHome + projectedAway;
  const projectedMargin = projectedHome - projectedAway;

  const possessionVariance = input.possessionVariance ?? 2.2;
  const totalStdDev = Math.max(
    4.5,
    Math.sqrt(Math.max(1, remainingPossessionsPerTeam * 2 * possessionVariance)),
  );
  const marginStdDev = Math.max(4, totalStdDev * 0.72);
  const teamStdDev = Math.max(3.2, totalStdDev * 0.61);

  const under = (mean: number, line: number, stdDev: number) =>
    clampProbability(normalCdf((line - mean) / stdDev));

  return {
    projectedFinal: {
      home: projectedHome,
      away: projectedAway,
      total: projectedTotal,
      margin: projectedMargin,
    },
    remainingPossessionsPerTeam,
    totalStdDev,
    marginStdDev,
    totalUnder: (line) => under(projectedTotal, line, totalStdDev),
    totalOver: (line) => clampProbability(1 - under(projectedTotal, line, totalStdDev)),
    homeCover: (handicap) =>
      clampProbability(
        1 - normalCdf((-handicap - projectedMargin) / marginStdDev),
      ),
    awayCover: (handicap) =>
      clampProbability(
        1 - normalCdf((-handicap + projectedMargin) / marginStdDev),
      ),
    homeTeamUnder: (line) => under(projectedHome, line, teamStdDev),
    awayTeamUnder: (line) => under(projectedAway, line, teamStdDev),
  };
};

export const priceBasketballMarket = (
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
