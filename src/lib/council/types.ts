export interface CouncilModelInput {
  id: string;
  label: string;
  probability: number;
  confidence: number;
  competence: number;
  calibration: number;
  dataLineage: string[];
  featureLineage: string[];
  residualCorrelations?: Record<string, number>;
}

export interface CouncilModelResult extends CouncilModelInput {
  baseWeight: number;
  adjustedWeight: number;
  independencePenalty: number;
  averageDependency: number;
  contribution: number;
}

export interface CouncilPairDependency {
  a: string;
  b: string;
  lineageOverlap: number;
  residualCorrelation: number;
  combinedDependency: number;
}

export interface CouncilAnalysis {
  consensusProbability: number;
  rawMeanProbability: number;
  dispersion: number;
  effectiveIndependentModels: number;
  modelCount: number;
  independenceRatio: number;
  consensusConfidence: number;
  models: CouncilModelResult[];
  dependencies: CouncilPairDependency[];
  strongestDependency: CouncilPairDependency | null;
}
