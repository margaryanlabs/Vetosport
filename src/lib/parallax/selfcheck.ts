import {
  buildFootballParallaxContracts,
  type FootballParallaxMarketSnapshot,
} from "@/lib/parallax/football-contracts";
import {
  analyzeFootballParallax,
  projectMarketWorld,
} from "@/lib/parallax/engine";
import {
  sandboxFootballInputs,
  sandboxFootballSurface,
} from "@/lib/sandbox/football-model";
import {
  sandboxParallaxAnalysis,
  sandboxParallaxSnapshot,
} from "@/lib/parallax/sandbox";

const probabilityOf = (
  predicate: (state: (typeof sandboxFootballSurface.scorelines)[number]) => boolean,
) =>
  sandboxFootballSurface.scorelines.reduce(
    (sum, state) => sum + (predicate(state) ? state.probability : 0),
    0,
  );

export const runParallaxSelfCheck = () => {
  const coherentSnapshot: FootballParallaxMarketSnapshot = {
    "home-win": probabilityOf((state) => state.homeGoals > state.awayGoals),
    draw: probabilityOf((state) => state.homeGoals === state.awayGoals),
    "away-win": probabilityOf((state) => state.homeGoals < state.awayGoals),
    "total-under-2.5": probabilityOf(
      (state) => state.homeGoals + state.awayGoals < 2.5,
    ),
    "total-under-3.5": probabilityOf(
      (state) => state.homeGoals + state.awayGoals < 3.5,
    ),
    "btts-yes": probabilityOf(
      (state) => state.homeGoals > 0 && state.awayGoals > 0,
    ),
    "home-over-0.5": probabilityOf((state) => state.homeGoals > 0.5),
    "away-over-0.5": probabilityOf((state) => state.awayGoals > 0.5),
    "home-over-1.5": probabilityOf((state) => state.homeGoals > 1.5),
  };

  const coherentContracts =
    buildFootballParallaxContracts(coherentSnapshot);
  const projection = projectMarketWorld(
    sandboxFootballSurface.scorelines,
    coherentContracts,
  );
  const coherentAnalysis = analyzeFootballParallax({
    scorelines: sandboxFootballSurface.scorelines,
    inputs: sandboxFootballInputs,
    contracts: coherentContracts,
  });

  const projectedMass = projection.world.reduce(
    (sum, state) => sum + state.probability,
    0,
  );

  const checks = [
    {
      name: "market world preserves probability mass",
      passed: Math.abs(projectedMass - 1) < 0.000001,
    },
    {
      name: "coherent market snapshot projects with tiny residual",
      passed: projection.residualRmse < 0.003,
    },
    {
      name: "consistency score bounded",
      passed:
        sandboxParallaxAnalysis.consistencyScore >= 0 &&
        sandboxParallaxAnalysis.consistencyScore <= 100,
    },
    {
      name: "robust floor never exceeds fair probability",
      passed:
        sandboxParallaxAnalysis.primary.robustFloor <=
        sandboxParallaxAnalysis.primary.fairProbability,
    },
    {
      name: "robust edge never exceeds raw edge",
      passed:
        sandboxParallaxAnalysis.primary.robustGap <=
        sandboxParallaxAnalysis.primary.rawGap,
    },
    {
      name: "counterfactuals remain probability bounded",
      passed: sandboxParallaxAnalysis.counterfactuals.every(
        (item) => item.probability > 0 && item.probability < 1,
      ),
    },
    {
      name: "synthetic inconsistency is detectable",
      passed:
        sandboxParallaxAnalysis.residualRmse >
        coherentAnalysis.residualRmse,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      syntheticSnapshot: sandboxParallaxSnapshot,
      consistencyScore: sandboxParallaxAnalysis.consistencyScore,
      residualRmse: sandboxParallaxAnalysis.residualRmse,
      primary: sandboxParallaxAnalysis.primary,
      decay: sandboxParallaxAnalysis.decay,
      counterfactuals: sandboxParallaxAnalysis.counterfactuals,
      coherentResidualRmse: coherentAnalysis.residualRmse,
    },
  };
};
