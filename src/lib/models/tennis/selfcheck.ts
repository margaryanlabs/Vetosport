import {
  buildTennisPointState,
  holdProbability,
} from "@/lib/models/tennis/engine";

export const runTennisSelfCheck = () => {
  const weak = holdProbability(0.55);
  const strong = holdProbability(0.68);
  const fromFortyLove = holdProbability(0.62, 3, 0);
  const fromLoveForty = holdProbability(0.62, 0, 3);

  const neutral = buildTennisPointState({
    playerServePointWin: 0.64,
    opponentServePointWin: 0.62,
    playerSets: 0,
    opponentSets: 0,
    playerGames: 3,
    opponentGames: 3,
    playerServing: true,
  });
  const leading = buildTennisPointState({
    playerServePointWin: 0.64,
    opponentServePointWin: 0.62,
    playerSets: 1,
    opponentSets: 0,
    playerGames: 4,
    opponentGames: 3,
    playerServing: true,
  });

  const checks = [
    {
      name: "stronger serve raises hold probability",
      passed: strong > weak,
    },
    {
      name: "40-love better than love-40",
      passed: fromFortyLove > fromLoveForty,
    },
    {
      name: "probabilities bounded",
      passed:
        neutral.playerHoldProbability > 0 &&
        neutral.playerHoldProbability < 1 &&
        neutral.matchWinProbability > 0 &&
        neutral.matchWinProbability < 1,
    },
    {
      name: "score lead raises match surface",
      passed: leading.matchWinProbability > neutral.matchWinProbability,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      weakHold: weak,
      strongHold: strong,
      neutral,
      leading,
    },
  };
};
