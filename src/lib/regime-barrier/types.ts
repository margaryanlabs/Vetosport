import type { RegimeLabel, RegimeObservation } from "@/lib/regime/types";

export type RegimeBarrierFeature = Exclude<keyof RegimeObservation,"timeMs">;

export interface RegimeBarrierCandidate {
  features:RegimeBarrierFeature[];
  sigma:number;
  cost:number;
  achieved:boolean;
  resultingRegime:RegimeLabel;
  changeProbability:number;
  hardChange:boolean;
}

export interface RegimeBarrierResult {
  fromRegime:RegimeLabel;
  targetRegime:RegimeLabel;
  sustainFrames:number;
  best:RegimeBarrierCandidate | null;
  candidates:RegimeBarrierCandidate[];
  barrierCost:number | null;
  fragile:boolean;
  reasons:string[];
}
