import type { ChangePointFrame, RegimeLabel } from "@/lib/regime/types";

export type TransitionHazardStatus =
  | "STABLE"
  | "PRECURSOR"
  | "ARMED"
  | "IMMINENT";

export interface TransitionHazardFrame {
  timeMs:number;
  activeRegime:RegimeLabel;
  rawRegime:RegimeLabel;
  hazardScore:number;
  status:TransitionHazardStatus;
  alternativeMass:number;
  dominantAlternative:RegimeLabel | null;
  changeTrend:number;
  structuralPressure:number;
  persistence:number;
  hardChange:boolean;
}

export interface TransitionHazardAnalysis {
  activeRegime:RegimeLabel;
  frames:TransitionHazardFrame[];
  current:TransitionHazardFrame | null;
  firstPrecursor:TransitionHazardFrame | null;
  firstArmed:TransitionHazardFrame | null;
  firstImminent:TransitionHazardFrame | null;
  firstHardChange:ChangePointFrame | null;
  leadMsToHardChange:number | null;
  status:TransitionHazardStatus;
  hazardScore:number;
  reasons:string[];
}
