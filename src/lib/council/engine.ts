import type {
  CouncilAnalysis,
  CouncilModelInput,
  CouncilModelResult,
  CouncilPairDependency,
} from "@/lib/council/types";

const clamp = (value: number, min = 0.000001, max = 0.999999) =>
  Math.min(max, Math.max(min, value));

const logit = (p: number) => {
  const bounded = clamp(p);
  return Math.log(bounded / (1 - bounded));
};

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const jaccard = (a: string[], b: string[]) => {
  const left = new Set(a);
  const right = new Set(b);
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  return intersection / union.size;
};

const pairDependency = (
  a: CouncilModelInput,
  b: CouncilModelInput,
): CouncilPairDependency => {
  const dataOverlap = jaccard(a.dataLineage, b.dataLineage);
  const featureOverlap = jaccard(a.featureLineage, b.featureLineage);
  const lineageOverlap = clamp(
    0.65 * dataOverlap + 0.35 * featureOverlap,
    0,
    1,
  );

  const corrA = a.residualCorrelations?.[b.id];
  const corrB = b.residualCorrelations?.[a.id];
  const residualCorrelation = clamp(
    typeof corrA === "number"
      ? corrA
      : typeof corrB === "number"
        ? corrB
        : lineageOverlap * 0.72,
    0,
    0.98,
  );

  const combinedDependency = clamp(
    Math.max(
      residualCorrelation,
      lineageOverlap * 0.82,
    ),
    0,
    0.98,
  );

  return {
    a: a.id,
    b: b.id,
    lineageOverlap,
    residualCorrelation,
    combinedDependency,
  };
};

export const analyzeModelCouncil = (
  inputs: CouncilModelInput[],
): CouncilAnalysis => {
  if (inputs.length === 0) {
    return {
      consensusProbability: 0.5,
      rawMeanProbability: 0.5,
      dispersion: 0,
      effectiveIndependentModels: 0,
      modelCount: 0,
      independenceRatio: 0,
      consensusConfidence: 0,
      models: [],
      dependencies: [],
      strongestDependency: null,
    };
  }

  const dependencies: CouncilPairDependency[] = [];
  for (let i = 0; i < inputs.length; i += 1) {
    for (let j = i + 1; j < inputs.length; j += 1) {
      dependencies.push(pairDependency(inputs[i], inputs[j]));
    }
  }

  const baseWeights = inputs.map((model) =>
    Math.max(
      0.0001,
      model.confidence *
        model.competence *
        model.calibration,
    ),
  );

  const dependencyMatrix = inputs.map((a, i) =>
    inputs.map((b, j) => {
      if (i === j) return 1;
      const pair = dependencies.find(
        (item) =>
          (item.a === a.id && item.b === b.id) ||
          (item.a === b.id && item.b === a.id),
      );
      return pair?.combinedDependency ?? 0;
    }),
  );

  const dependencyLoads = inputs.map((_, i) => {
    let weightedDependency = 0;
    let comparisonWeight = 0;
    for (let j = 0; j < inputs.length; j += 1) {
      if (i === j) continue;
      weightedDependency +=
        dependencyMatrix[i][j] * baseWeights[j];
      comparisonWeight += baseWeights[j];
    }
    return comparisonWeight > 0
      ? weightedDependency / comparisonWeight
      : 0;
  });

  const adjustedRaw = baseWeights.map(
    (weight, i) =>
      weight /
      (1 + 2.4 * dependencyLoads[i]),
  );
  const adjustedMass = adjustedRaw.reduce(
    (sum, value) => sum + value,
    0,
  );
  const weights = adjustedRaw.map((value) =>
    adjustedMass > 0 ? value / adjustedMass : 1 / inputs.length,
  );

  const consensusLogit = inputs.reduce(
    (sum, model, i) => sum + weights[i] * logit(model.probability),
    0,
  );
  const consensusProbability = sigmoid(consensusLogit);
  const rawMeanProbability =
    inputs.reduce((sum, model) => sum + model.probability, 0) /
    inputs.length;

  const dispersion = Math.sqrt(
    inputs.reduce(
      (sum, model, i) =>
        sum +
        weights[i] *
          (model.probability - consensusProbability) ** 2,
      0,
    ),
  );

  let quadratic = 0;
  for (let i = 0; i < inputs.length; i += 1) {
    for (let j = 0; j < inputs.length; j += 1) {
      quadratic +=
        weights[i] *
        dependencyMatrix[i][j] *
        weights[j];
    }
  }

  const effectiveIndependentModels =
    quadratic > 0 ? Math.min(inputs.length, 1 / quadratic) : inputs.length;
  const independenceRatio =
    inputs.length > 0
      ? effectiveIndependentModels / inputs.length
      : 0;

  const meanCompetence = inputs.reduce(
    (sum, model, i) =>
      sum +
      weights[i] *
        Math.sqrt(
          model.competence *
            model.calibration *
            model.confidence,
        ),
    0,
  );

  const consensusConfidence = clamp(
    meanCompetence *
      (0.58 + 0.42 * independenceRatio) *
      Math.exp(-dispersion * 2.8),
    0,
    0.98,
  );

  const models: CouncilModelResult[] = inputs.map((model, i) => ({
    ...model,
    baseWeight: baseWeights[i],
    adjustedWeight: weights[i],
    independencePenalty:
      baseWeights[i] <= 0
        ? 0
        : clamp(1 - adjustedRaw[i] / baseWeights[i], 0, 1),
    averageDependency: dependencyLoads[i],
    contribution: weights[i] * logit(model.probability),
  }));

  const strongestDependency =
    dependencies.length === 0
      ? null
      : [...dependencies].sort(
          (a, b) => b.combinedDependency - a.combinedDependency,
        )[0];

  return {
    consensusProbability,
    rawMeanProbability,
    dispersion,
    effectiveIndependentModels,
    modelCount: inputs.length,
    independenceRatio,
    consensusConfidence,
    models,
    dependencies,
    strongestDependency,
  };
};
