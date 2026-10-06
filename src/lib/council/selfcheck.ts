import { analyzeModelCouncil } from "@/lib/council/engine";
import type { CouncilModelInput } from "@/lib/council/types";

const base: CouncilModelInput[] = [
  {
    id: "state",
    label: "State",
    probability: 0.79,
    confidence: 0.91,
    competence: 0.88,
    calibration: 0.86,
    dataLineage: ["event-feed", "score-clock", "xg-state"],
    featureLineage: ["goal-hazard", "tempo", "score-state"],
  },
  {
    id: "sim",
    label: "Simulation",
    probability: 0.77,
    confidence: 0.89,
    competence: 0.84,
    calibration: 0.83,
    dataLineage: ["event-feed", "score-clock", "xg-state"],
    featureLineage: ["goal-hazard", "trajectory-sim", "score-state"],
  },
  {
    id: "market",
    label: "Market",
    probability: 0.74,
    confidence: 0.74,
    competence: 0.82,
    calibration: 0.9,
    dataLineage: ["market-quotes", "market-contracts"],
    featureLineage: ["market-implied", "de-vig"],
  },
];

export const runCouncilSelfCheck = () => {
  const baseline = analyzeModelCouncil(base);
  const cloned = analyzeModelCouncil([
    ...base,
    {
      ...base[0],
      id: "state-clone-1",
      label: "State Clone 1",
      probability: 0.791,
    },
    {
      ...base[0],
      id: "state-clone-2",
      label: "State Clone 2",
      probability: 0.789,
    },
  ]);

  const independent = analyzeModelCouncil(
    base.map((model, index) => ({
      ...model,
      dataLineage: [`source-${index}`],
      featureLineage: [`feature-${index}`],
      residualCorrelations: {},
    })),
  );

  const cloneRows = cloned.models.filter((model) =>
    model.id.startsWith("state-clone"),
  );

  const checks = [
    {
      name: "consensus remains probability bounded",
      passed:
        baseline.consensusProbability > 0 &&
        baseline.consensusProbability < 1,
    },
    {
      name: "duplicate lineage does not create full extra votes",
      passed:
        cloned.effectiveIndependentModels <
        cloned.modelCount - 0.5,
    },
    {
      name: "clone insertion barely moves consensus",
      passed:
        Math.abs(
          cloned.consensusProbability -
            baseline.consensusProbability,
        ) < 0.02,
    },
    {
      name: "clones receive independence penalty",
      passed:
        cloneRows.every(
          (model) => model.independencePenalty > 0.25,
        ),
    },
    {
      name: "independent lineage raises effective model count",
      passed:
        independent.effectiveIndependentModels >
        baseline.effectiveIndependentModels,
    },
    {
      name: "weights normalize to one",
      passed:
        Math.abs(
          baseline.models.reduce(
            (sum, model) => sum + model.adjustedWeight,
            0,
          ) - 1,
        ) < 0.000001,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      baseline,
      cloned,
      independent,
    },
  };
};
