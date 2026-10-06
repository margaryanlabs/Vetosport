export interface InformationRequestCandidate {
  id:string;
  label:string;
  dependencyGroup:string;
  resolvesFields:string[];
  expectedUncertaintyReduction:number;
  expectedIdentifiabilityGain:number;
  latencyMs:number;
  monetaryCostUsd:number;
  failureProbability:number;
  freshnessHorizonMs:number;
}

export interface InformationRouterContext {
  conflictedFields:string[];
  missingFields:string[];
  weakFields:string[];
  signalHalfLifeMs:number;
  maxLatencyMs:number;
  requestBudgetUsd:number;
  existingDependencyGroups:string[];
}

export interface InformationRoute {
  id:string;
  label:string;
  action:"FETCH_NOW"|"QUEUE"|"SKIP";
  score:number;
  expectedValue:number;
  latencySurvival:number;
  redundancyPenalty:number;
  costPenalty:number;
  reasons:string[];
}
