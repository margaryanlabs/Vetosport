import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";
import type {
  FootballLiveInputs,
  ScorelineProbability,
} from "@/lib/models/football/types";
import type {
  ParallaxAnalysis,
  ParallaxContractResult,
  ParallaxCounterfactual,
  ParallaxMarketContract,
  ParallaxSignalDecay,
  ParallaxUncertainty,
} from "@/lib/parallax/types";

const clamp = (value: number, min = 0.000001, max = 0.999999) =>
  Math.min(max, Math.max(min, value));

const probabilityOf = (
  distribution: ScorelineProbability[],
  predicate: (state: ScorelineProbability) => boolean,
) =>
  distribution.reduce(
    (sum, state) => sum + (predicate(state) ? state.probability : 0),
    0,
  );

const normalize = (distribution: ScorelineProbability[]) => {
  const mass = distribution.reduce((sum, row) => sum + row.probability, 0);
  if (mass <= 0) return distribution;
  return distribution.map((row) => ({
    ...row,
    probability: row.probability / mass,
  }));
};

export const projectMarketWorld = (
  prior: ScorelineProbability[],
  contracts: ParallaxMarketContract[],
  maxIterations = 80,
  tolerance = 0.0025,
) => {
  let world = normalize(
    prior.map((row) => ({ ...row, probability: Math.max(row.probability, 1e-12) })),
  );
  let iterations = 0;
  let residualRmse = Number.POSITIVE_INFINITY;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    iterations = iteration + 1;

    for (const contract of contracts) {
      const current = clamp(probabilityOf(world, contract.predicate));
      const target = clamp(contract.marketProbability);
      const strength = Math.min(1, Math.max(0.15, contract.weight));
      const trueFactor = Math.pow(target / current, 0.44 * strength);
      const falseFactor = Math.pow(
        (1 - target) / (1 - current),
        0.44 * strength,
      );

      world = normalize(
        world.map((row) => ({
          ...row,
          probability:
            row.probability *
            (contract.predicate(row) ? trueFactor : falseFactor),
        })),
      );
    }

    const residuals = contracts.map(
      (contract) =>
        probabilityOf(world, contract.predicate) - contract.marketProbability,
    );
    residualRmse = Math.sqrt(
      residuals.reduce((sum, residual) => sum + residual * residual, 0) /
        Math.max(1, residuals.length),
    );

    if (residualRmse <= tolerance) break;
  }

  return {
    world,
    iterations,
    residualRmse,
    converged: residualRmse <= tolerance,
  };
};

const combinedUncertainty = (
  uncertainty: Omit<ParallaxUncertainty, "combined">,
): ParallaxUncertainty => ({
  ...uncertainty,
  combined: Math.sqrt(
    uncertainty.model ** 2 +
      uncertainty.data ** 2 +
      uncertainty.execution ** 2 +
      uncertainty.clock ** 2,
  ),
});

const buildDecay = (
  currentGap: number,
  halfLifeSeconds: number,
  ageSeconds: number,
): ParallaxSignalDecay => {
  const safeGap = Math.max(0, currentGap);
  const peakGap =
    safeGap > 0
      ? safeGap / Math.pow(0.5, ageSeconds / halfLifeSeconds)
      : 0;
  const expectedGap20s =
    safeGap * Math.pow(0.5, 20 / halfLifeSeconds);
  const survival20s =
    safeGap <= 0
      ? 0
      : clamp(
          1 - Math.exp(-Math.max(0, expectedGap20s) / 0.018),
          0,
          1,
        );

  return {
    peakGap,
    currentGap,
    halfLifeSeconds,
    ageSeconds,
    survival20s,
    expectedGap20s,
    status:
      currentGap <= 0
        ? "EXPIRED"
        : ageSeconds > halfLifeSeconds * 0.65
          ? "DECAYING"
          : "FRESH",
  };
};

const robustGapForSurface = (
  probability: number,
  marketProbability: number,
  uncertainty: ParallaxUncertainty,
) => {
  const robustFloor = clamp(
    probability - 1.64 * uncertainty.combined,
    0.000001,
    0.999999,
  );
  return {
    robustFloor,
    robustGap: robustFloor - marketProbability,
  };
};

const buildCounterfactuals = (
  input: FootballLiveInputs,
  marketProbability: number,
  uncertainty: ParallaxUncertainty,
): ParallaxCounterfactual[] => {
  const states: Array<{
    id: string;
    label: string;
    input: FootballLiveInputs;
  }> = [
    {
      id: "tempo-up",
      label: "Tempo +20%",
      input: {
        ...input,
        tempoIndex: Math.min(1.45, (input.tempoIndex ?? 1) * 1.2),
      },
    },
    {
      id: "home-goal",
      label: "Home scores next",
      input: {
        ...input,
        scoreHome: input.scoreHome + 1,
        elapsedMinutes: Math.min(89, input.elapsedMinutes + 3.5),
      },
    },
    {
      id: "away-goal",
      label: "Away scores next",
      input: {
        ...input,
        scoreAway: input.scoreAway + 1,
        elapsedMinutes: Math.min(89, input.elapsedMinutes + 3.5),
      },
    },
    {
      id: "home-red",
      label: "Home red card",
      input: {
        ...input,
        homeRedCards: (input.homeRedCards ?? 0) + 1,
      },
    },
  ];

  return states.map(({ id, label, input: nextInput }) => {
    const surface = buildFootballProbabilitySurface(nextInput);
    const market = surface.markets.find(
      (item) =>
        item.marketId === "football.total_goals" &&
        item.selectionId === "under-3.5",
    );
    const probability = market?.probability ?? 0;
    const { robustGap } = robustGapForSurface(
      probability,
      marketProbability,
      uncertainty,
    );

    return {
      id,
      label,
      probability,
      robustGap,
      status:
        robustGap <= 0
          ? "INVALIDATES"
          : robustGap < 0.025
            ? "WATCH"
            : "SURVIVES",
    };
  });
};

export const analyzeFootballParallax = ({
  scorelines,
  inputs,
  contracts,
  primaryContractId = "total-under-3.5",
  uncertainty: uncertaintyInput = {
    model: 0.022,
    data: 0.012,
    execution: 0.009,
    clock: 0.006,
  },
  halfLifeSeconds = 21,
  ageSeconds = 8,
}: {
  scorelines: ScorelineProbability[];
  inputs: FootballLiveInputs;
  contracts: ParallaxMarketContract[];
  primaryContractId?: string;
  uncertainty?: Omit<ParallaxUncertainty, "combined">;
  halfLifeSeconds?: number;
  ageSeconds?: number;
}): ParallaxAnalysis => {
  const projection = projectMarketWorld(scorelines, contracts);
  const results: ParallaxContractResult[] = contracts.map((contract) => {
    const vetoProbability = probabilityOf(scorelines, contract.predicate);
    const projectedMarketProbability = probabilityOf(
      projection.world,
      contract.predicate,
    );
    return {
      id: contract.id,
      label: contract.label,
      family: contract.family,
      vetoProbability,
      marketProbability: contract.marketProbability,
      projectedMarketProbability,
      vetoGap: vetoProbability - contract.marketProbability,
      consistencyResidual:
        projectedMarketProbability - contract.marketProbability,
      weight: contract.weight,
    };
  });

  const uncertainty = combinedUncertainty(uncertaintyInput);
  const primary =
    results.find((result) => result.id === primaryContractId) ?? results[0];
  const robust = robustGapForSurface(
    primary.vetoProbability,
    primary.marketProbability,
    uncertainty,
  );

  const weightedResidual =
    results.reduce(
      (sum, result) =>
        sum +
        result.consistencyResidual ** 2 *
          Math.max(0.1, result.weight),
      0,
    ) /
    Math.max(
      1,
      results.reduce((sum, result) => sum + Math.max(0.1, result.weight), 0),
    );
  const residualRmse = Math.sqrt(weightedResidual);
  const consistencyScore = Math.round(
    100 * Math.exp(-residualRmse * 16),
  );

  const inconsistencyCluster = [...results]
    .sort(
      (a, b) =>
        Math.abs(b.consistencyResidual) -
        Math.abs(a.consistencyResidual),
    )
    .slice(0, 4);

  return {
    consistencyScore,
    residualRmse,
    converged: projection.converged,
    iterations: projection.iterations,
    contracts: results,
    inconsistencyCluster,
    marketWorld: projection.world,
    primary: {
      contractId: primary.id,
      label: primary.label,
      fairProbability: primary.vetoProbability,
      marketProbability: primary.marketProbability,
      rawGap: primary.vetoGap,
      robustFloor: robust.robustFloor,
      robustGap: robust.robustGap,
      fairOdds: 1 / clamp(primary.vetoProbability),
      marketFairOdds: 1 / clamp(primary.marketProbability),
      breakEvenOdds: 1 / clamp(robust.robustFloor),
    },
    uncertainty,
    decay: buildDecay(
      robust.robustGap,
      halfLifeSeconds,
      ageSeconds,
    ),
    counterfactuals: buildCounterfactuals(
      inputs,
      primary.marketProbability,
      uncertainty,
    ),
  };
};
