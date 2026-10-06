import { buildBasketballSurface } from "@/lib/models/basketball/engine";

export const runBasketballSelfCheck = () => {
  const base = buildBasketballSurface({
    homeScore: 78,
    awayScore: 73,
    elapsedSeconds: 31 * 60 + 39,
    projectedPossessionsPerTeam: 98,
    homePointsPerPossession: 1.12,
    awayPointsPerPossession: 1.04,
  });

  const faster = buildBasketballSurface({
    homeScore: 78,
    awayScore: 73,
    elapsedSeconds: 31 * 60 + 39,
    projectedPossessionsPerTeam: 106,
    homePointsPerPossession: 1.12,
    awayPointsPerPossession: 1.04,
  });

  const checks = [
    {
      name: "probabilities bounded",
      passed:
        base.totalUnder(229.5) > 0 &&
        base.totalUnder(229.5) < 1 &&
        base.homeCover(-4.5) > 0 &&
        base.homeCover(-4.5) < 1,
    },
    {
      name: "higher total line raises under probability",
      passed: base.totalUnder(235.5) > base.totalUnder(225.5),
    },
    {
      name: "faster pace raises projected total",
      passed: faster.projectedFinal.total > base.projectedFinal.total,
    },
    {
      name: "harder home handicap lowers cover probability",
      passed: base.homeCover(-7.5) < base.homeCover(-2.5),
    },
    {
      name: "remaining possessions non-negative",
      passed: base.remainingPossessionsPerTeam >= 0,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      projectedFinal: base.projectedFinal,
      under2295: base.totalUnder(229.5),
      homeMinus45: base.homeCover(-4.5),
    },
  };
};
