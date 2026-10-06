import { clampProbability, fairOdds } from "@/lib/math/probability";

const deuceWinProbability = (pointWinProbability: number) => {
  const p = clampProbability(pointWinProbability);
  const q = 1 - p;
  return (p * p) / (p * p + q * q);
};

export const holdProbability = (
  pointWinProbability: number,
  serverPoints = 0,
  returnerPoints = 0,
): number => {
  const p = clampProbability(pointWinProbability);
  const q = 1 - p;
  const deuce = deuceWinProbability(p);

  const solve = (a: number, b: number, memo: Map<string, number>): number => {
    if (a >= 4 && a - b >= 2) return 1;
    if (b >= 4 && b - a >= 2) return 0;

    if (a >= 3 && b >= 3) {
      if (a === b) return deuce;
      if (a === b + 1) return p + q * deuce;
      if (b === a + 1) return p * deuce;
    }

    const key = `${a}:${b}`;
    const cached = memo.get(key);
    if (cached != null) return cached;

    const value =
      p * solve(a + 1, b, memo) + q * solve(a, b + 1, memo);
    memo.set(key, value);
    return value;
  };

  return clampProbability(solve(serverPoints, returnerPoints, new Map()));
};

export interface TennisStateInput {
  playerServePointWin: number;
  opponentServePointWin: number;
  playerSets: number;
  opponentSets: number;
  playerGames: number;
  opponentGames: number;
  playerServing: boolean;
  serverPoints?: number;
  returnerPoints?: number;
}

export const buildTennisPointState = (input: TennisStateInput) => {
  const playerHold = holdProbability(
    input.playerServePointWin,
    input.playerServing ? input.serverPoints ?? 0 : 0,
    input.playerServing ? input.returnerPoints ?? 0 : 0,
  );
  const opponentHold = holdProbability(input.opponentServePointWin);
  const playerBreak = clampProbability(1 - opponentHold);

  const setLead = input.playerSets - input.opponentSets;
  const gameLead = input.playerGames - input.opponentGames;
  const serveQualityEdge = playerHold - opponentHold;
  const currentServeEdge = input.playerServing ? playerHold - 0.5 : playerBreak - 0.5;

  const logit =
    setLead * 1.45 +
    gameLead * 0.27 +
    serveQualityEdge * 3.4 +
    currentServeEdge * 0.8;
  const matchWinProbability = clampProbability(1 / (1 + Math.exp(-logit)));

  return {
    playerHoldProbability: playerHold,
    opponentHoldProbability: opponentHold,
    playerBreakProbability: playerBreak,
    matchWinProbability,
    fairMatchOdds: fairOdds(matchWinProbability),
    serveQualityEdge,
  };
};

export const priceTennisMarket = (
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
