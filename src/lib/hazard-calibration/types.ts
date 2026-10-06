import type { RegimeLabel } from "@/lib/regime/types";

export type HazardHorizon = 1|3|5;

export interface HazardCalibrationObservation {
  id:string;
  regime:RegimeLabel;
  hazardScore:number;
  transitionedWithin1:boolean;
  transitionedWithin3:boolean;
  transitionedWithin5:boolean;
}

export interface HazardCalibrationBin {
  lower:number;
  upper:number;
  count:number;
  successes:number;
  rawRate:number;
  calibratedRate:number;
}

export interface HazardCalibrationModel {
  regime:RegimeLabel;
  horizon:HazardHorizon;
  sampleSize:number;
  priorAlpha:number;
  priorBeta:number;
  bins:HazardCalibrationBin[];
  brier:number;
  status:"CALIBRATED"|"SPARSE"|"UNTRUSTED";
}

export interface HazardCalibrationEstimate {
  regime:RegimeLabel;
  hazardScore:number;
  p1:number;
  p3:number;
  p5:number;
  source:"REGIME"|"POOLED";
  status:"CALIBRATED"|"SPARSE"|"UNTRUSTED";
  reasons:string[];
}
