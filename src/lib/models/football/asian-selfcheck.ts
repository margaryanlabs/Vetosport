import { buildFootballProbabilitySurface } from "./surface";
import {
  priceAsianHandicap,
  priceAsianTotal,
  settlementProbabilityMass,
} from "./asian";

export const runAsianSelfCheck = () => {
  const surface = buildFootballProbabilitySurface({
    scoreHome: 1,
    scoreAway: 1,
    elapsedMinutes: 64,
    prematchExpectedHomeGoals: 1.6,
    prematchExpectedAwayGoals: 1.3,
    liveXgHome: 1.3,
    liveXgAway: 0.95,
    tempoIndex: 0.82,
  });

  const checks = [
    {
      name: "Asian total over 2.25",
      distribution: priceAsianTotal(surface.scorelines, "over", 2.25),
    },
    {
      name: "Asian total under 3.75",
      distribution: priceAsianTotal(surface.scorelines, "under", 3.75),
    },
    {
      name: "Home -0.25",
      distribution: priceAsianHandicap(surface.scorelines, "home", -0.25),
    },
    {
      name: "Away +0.75",
      distribution: priceAsianHandicap(surface.scorelines, "away", 0.75),
    },
  ].map((check) => ({
    ...check,
    mass: settlementProbabilityMass(check.distribution),
    passed:
      Math.abs(settlementProbabilityMass(check.distribution) - 1) < 1e-7 &&
      (check.distribution.fairOdds == null ||
        (Number.isFinite(check.distribution.fairOdds) &&
          check.distribution.fairOdds > 1)),
  }));

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
};
