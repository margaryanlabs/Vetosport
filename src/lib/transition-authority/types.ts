import type { HazardCalibrationEstimate } from "@/lib/hazard-calibration/types";

export type TransitionAuthorityAction =
  | "PRESERVE"
  | "CAP_TO_WATCH"
  | "ABSTAIN";

export interface TransitionAuthorityInput {
  estimate:HazardCalibrationEstimate;
  executionHorizon:1|3|5;
  modelAdaptationSpeed:number;
  regimeCoherent:boolean;
}

export interface TransitionAuthorityResult {
  action:TransitionAuthorityAction;
  selectedProbability:number;
  executionHorizon:1|3|5;
  adaptationRisk:number;
  calibrationTrusted:boolean;
  authorityMultiplier:number;
  reasons:string[];
}
