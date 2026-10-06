import type { RegimeLabel } from "@/lib/regime/types";

export interface RegimeExpertProfile {
  id:string;
  label:string;
  baseWeight:number;
  confidence:number;
  independence:number;
  dependencyPenalty:number;
  adaptationSpeed:number;
  regimeReliability:Record<RegimeLabel,number>;
}

export interface RegimeRouterContext {
  regime:RegimeLabel;
  regimeConfidence:number;
  structuralChangeAgeMs:number;
  signalHalfLifeMs:number;
}

export interface RoutedExpert {
  id:string;
  label:string;
  rawAuthority:number;
  weight:number;
  regimeReliability:number;
  adaptationPenalty:number;
  status:"ACTIVE"|"REDUCED"|"SUPPRESSED";
  reasons:string[];
}

export interface RegimeExpertRouting {
  regime:RegimeLabel;
  regimeConfidence:number;
  experts:RoutedExpert[];
  effectiveExperts:number;
  concentration:number;
  maxWeight:number;
  dominantExpertId:string | null;
  reasons:string[];
}
