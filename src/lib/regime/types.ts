export type RegimeLabel =
  | "STABLE_CONTROL"
  | "OPEN_TRANSITION"
  | "PRESSURE_SIEGE"
  | "FRAGILE_LIQUIDITY"
  | "DISLOCATED";

export interface RegimeObservation {
  timeMs:number;
  tempo:number;
  shotPressure:number;
  transitionRate:number;
  territorialControl:number;
  priceVelocity:number;
  spreadStress:number;
  suspensionRisk:number;
}

export interface FeatureBaseline {
  mean:number;
  std:number;
}

export interface RegimeBaseline {
  tempo:FeatureBaseline;
  shotPressure:FeatureBaseline;
  transitionRate:FeatureBaseline;
  territorialControl:FeatureBaseline;
  priceVelocity:FeatureBaseline;
  spreadStress:FeatureBaseline;
  suspensionRisk:FeatureBaseline;
}

export interface ChangePointFrame {
  timeMs:number;
  surprise:number;
  ewmaShift:number;
  cusum:number;
  persistence:number;
  changeProbability:number;
  regime:RegimeLabel;
  regimeScores:Record<RegimeLabel,number>;
  hardChange:boolean;
}

export interface RegimeChangeAnalysis {
  baseline:RegimeBaseline;
  frames:ChangePointFrame[];
  current:ChangePointFrame | null;
  changePoints:ChangePointFrame[];
  regime:RegimeLabel;
  transitionConfidence:number;
  stableBeforeChange:boolean;
  reasons:string[];
}
