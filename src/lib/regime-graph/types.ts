import type { RegimeLabel } from "@/lib/regime/types";

export interface RegimeEpisode {
  regime:RegimeLabel;
  startIndex:number;
  endIndex:number;
  durationFrames:number;
}

export interface RegimeTransitionEdge {
  from:RegimeLabel;
  to:RegimeLabel;
  count:number;
  probability:number;
}

export interface RegimeDwellStats {
  regime:RegimeLabel;
  episodes:number;
  meanFrames:number;
  medianFrames:number;
  p90Frames:number;
}

export interface RegimeTransitionGraph {
  edges:RegimeTransitionEdge[];
  dwell:RegimeDwellStats[];
  alpha:number;
  regimes:RegimeLabel[];
}

export interface RegimePathAssessment {
  from:RegimeLabel;
  to:RegimeLabel;
  transitionProbability:number;
  currentDwellFrames:number;
  meanDwellFrames:number;
  dwellPressure:number;
  plausibility:number;
  anomalyScore:number;
  status:"NORMAL"|"WATCH"|"RARE";
  reasons:string[];
}
