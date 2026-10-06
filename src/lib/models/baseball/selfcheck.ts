import { buildBaseballSurface } from "@/lib/models/baseball/engine";

const base = {
  homeScore: 4,
  awayScore: 3,
  inning: 7,
  half: "top" as const,
  outs: 1 as const,
  runners: {
    first: true,
    second: false,
    third: false,
  },
  prematchExpectedHomeRuns: 4.8,
  prematchExpectedAwayRuns: 4.3,
  homeOffenseIndex: 1.06,
  awayOffenseIndex: 0.97,
  homeBullpenIndex: 1.08,
  awayBullpenIndex: 0.94,
  parkFactor: 1.02,
};

export const runBaseballSelfCheck = () => {
  const surface = buildBaseballSurface(base);
  const loadedBases = buildBaseballSurface({
    ...base,
    outs: 0,
    runners: {
      first: true,
      second: true,
      third: true,
    },
  });
  const strongHomeOffense = buildBaseballSurface({
    ...base,
    homeOffenseIndex: 1.22,
  });

  const checks = [
    {
      name: "game probabilities sum to one",
      passed:
        Math.abs(
          surface.game.homeWin +
            surface.game.tieAfterNine +
            surface.game.awayWin -
            1,
        ) < 0.00001,
    },
    {
      name: "higher total line raises under probability",
      passed: surface.totalUnder(10.5) > surface.totalUnder(8.5),
    },
    {
      name: "loaded bases increase current-half run state",
      passed:
        loadedBases.remainingRuns.currentHalfAdjustment >
        surface.remainingRuns.currentHalfAdjustment,
    },
    {
      name: "stronger home offense raises home projection",
      passed:
        strongHomeOffense.projectedFinal.home >
        surface.projectedFinal.home,
    },
    {
      name: "market probabilities bounded",
      passed:
        surface.totalUnder(10.5) > 0 &&
        surface.totalUnder(10.5) < 1 &&
        surface.game.homeWin > 0 &&
        surface.game.homeWin < 1,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      remainingRuns: surface.remainingRuns,
      projectedFinal: surface.projectedFinal,
      game: surface.game,
      under105: surface.totalUnder(10.5),
    },
  };
};
