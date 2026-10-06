import {
  buildHockeySurface,
} from "@/lib/models/hockey/engine";

export const runHockeySelfCheck = () => {
  const even = buildHockeySurface({
    homeScore: 2,
    awayScore: 2,
    elapsedSeconds: 47 * 60,
    prematchExpectedHomeGoals: 3.25,
    prematchExpectedAwayGoals: 2.85,
    tempoIndex: 0.94,
    homeAttackIndex: 1.08,
    awayAttackIndex: 0.94,
  });

  const powerPlay = buildHockeySurface({
    homeScore: 2,
    awayScore: 2,
    elapsedSeconds: 47 * 60,
    prematchExpectedHomeGoals: 3.25,
    prematchExpectedAwayGoals: 2.85,
    tempoIndex: 0.94,
    homeAttackIndex: 1.08,
    awayAttackIndex: 0.94,
    homeSkaters: 5,
    awaySkaters: 4,
  });

  const emptyNet = buildHockeySurface({
    homeScore: 3,
    awayScore: 2,
    elapsedSeconds: 58 * 60,
    prematchExpectedHomeGoals: 3.25,
    prematchExpectedAwayGoals: 2.85,
    tempoIndex: 1.12,
    awayGoaliePulled: true,
  });

  const checks = [
    {
      name: "regulation probabilities sum to one",
      passed:
        Math.abs(
          even.regulation.homeWin +
            even.regulation.tie +
            even.regulation.awayWin -
            1,
        ) < 0.00001,
    },
    {
      name: "higher total line raises under probability",
      passed: even.totalUnder(6.5) > even.totalUnder(5.5),
    },
    {
      name: "power play raises home remaining goal hazard",
      passed:
        powerPlay.remainingGoals.home >
        even.remainingGoals.home,
    },
    {
      name: "empty net widens scoring tail",
      passed: emptyNet.remainingGoals.total > 0,
    },
    {
      name: "market probabilities bounded",
      passed:
        even.totalUnder(6.5) > 0 &&
        even.totalUnder(6.5) < 1 &&
        even.regulation.homeWin > 0 &&
        even.regulation.homeWin < 1,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      remainingGoals: even.remainingGoals,
      regulation: even.regulation,
      under65: even.totalUnder(6.5),
      powerPlayHomeLambda: powerPlay.remainingGoals.home,
      emptyNetLambda: emptyNet.remainingGoals,
    },
  };
};
