export type BoundaryDecision =
  | "ABSTAIN"
  | "WATCH"
  | "SHADOW_CANDIDATE";

export interface DecisionEvidence {
  robustGapPp:number;
  uncertaintyWidthPp:number;
  sensorIntegrity:number;
  identifiability:number;
  councilConfidence:number;
  effectiveModels:number;
  dataCompleteness:number;
  quoteFreshness:number;
  executionSurvival:number;
  capacityScore:number;
  capacityClass:"ZERO"|"FRAGILE"|"THIN"|"TRADEABLE"|"DEEP";
  contractComparable:boolean;
  semanticFreeze:boolean;
  leakageBlock:boolean;
  calibrationKill:boolean;
  censoringBlock:boolean;
  conformalBlock:boolean;
  regimeCoherent:boolean;
  transitionHazard:number;
  modelAdaptationSpeed:number;
  outOfDistribution:boolean;
}

export interface BoundaryCheck {
  id:string;
  label:string;
  passed:boolean;
  hard:boolean;
  detail:string;
}

export interface DecisionBoundaryResult {
  decision:BoundaryDecision;
  checks:BoundaryCheck[];
  blockers:string[];
  warnings:string[];
  evidenceMargin:number;
  abstentionReason:string | null;
}
