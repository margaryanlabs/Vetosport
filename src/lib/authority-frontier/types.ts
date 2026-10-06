import type { TransitionAuthorityAction } from "@/lib/transition-authority/types";

export interface AuthorityFrontierInput {
  transitionProbability:number;
  modelAdaptationSpeed:number;
  calibrationTrusted:boolean;
  regimeCoherent:boolean;
}

export interface AuthorityFrontierPoint {
  transitionProbability:number;
  modelAdaptationSpeed:number;
  adaptationRisk:number;
  action:TransitionAuthorityAction;
}

export interface AuthorityFrontierResult {
  current:AuthorityFrontierPoint;
  probabilityToWatch:number | null;
  adaptationFloorToPreserve:number | null;
  probabilityToAbstain:number | null;
  adaptationCeilingForAbstain:number;
  safetyMargin:number;
  grid:AuthorityFrontierPoint[];
  reasons:string[];
}
