import type { RegimeLabel, RegimeObservation } from "@/lib/regime/types";

export type RegimeFeature = Exclude<keyof RegimeObservation,"timeMs">;

export interface RegimeDriverContribution {
  feature:RegimeFeature;
  contribution:number;
  share:number;
  ablatedConfidence:number;
  ablatedRegime:RegimeLabel;
  flipsRegime:boolean;
  rank:number;
}

export interface RegimeDriverAnalysis {
  fullRegime:RegimeLabel;
  fullConfidence:number;
  fullEvidenceStrength:number;
  primaryDriver:RegimeFeature | null;
  concentration:number;
  drivers:RegimeDriverContribution[];
  reasons:string[];
}
