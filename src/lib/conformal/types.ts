import type { RegimeLabel } from "@/lib/regime/types";

export interface ConformalResidual {
  id:string;
  regime:RegimeLabel;
  predicted:number;
  outcome:0|1;
}

export interface ConformalEnvelopeInput {
  probability:number;
  regime:RegimeLabel;
  alpha:number;
  calibration:ConformalResidual[];
  recent:ConformalResidual[];
  minRegimeSample:number;
}

export interface ConformalEnvelope {
  regime:RegimeLabel;
  targetCoverage:number;
  source:"REGIME"|"POOLED";
  calibrationSample:number;
  recentSample:number;
  baseRadius:number;
  adaptiveRadius:number;
  lower:number;
  upper:number;
  recentCoverage:number;
  inflationFactor:number;
  status:"CALIBRATED"|"WIDEN"|"ABSTAIN";
  hardBlock:boolean;
  reasons:string[];
}
