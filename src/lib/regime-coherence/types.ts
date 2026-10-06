import type { RegimeLabel } from "@/lib/regime/types";

export interface RegimeCoherenceInput {
  governedRegime:RegimeLabel;
  signalRegimeSnapshot:RegimeLabel;
  signalCreatedAtMs:number;
  regimeEnteredAtMs:number;
  transitionHazard:number;
  modelAdaptationSpeed:number;
}

export interface RegimeCoherenceResult extends RegimeCoherenceInput {
  regimeMatches:boolean;
  predatesRegime:boolean;
  transitionFragile:boolean;
  action:"PRESERVE"|"CAP_TO_WATCH"|"ABSTAIN";
  authorityMultiplier:number;
  reasons:string[];
}
