export interface NegativeControlTest {
  id:string;
  label:string;
  family:"PLACEBO_FEATURE"|"SHUFFLED_LABEL"|"FUTURE_PROXY"|"TEMPORAL_AVAILABILITY";
  observedEffect:number;
  expectedMaxAbsEffect:number;
  pValue:number;
  qValue:number;
  featureAvailableAtMs?:number;
  decisionAtMs?:number;
}

export interface LeakageControlResult extends NegativeControlTest {
  status:"CLEAN"|"WARNING"|"LEAKAGE";
  excessEffect:number;
  temporalLeak:boolean;
  score:number;
  reasons:string[];
}

export interface LeakageMonitorResult {
  controls:LeakageControlResult[];
  leakageScore:number;
  cleanRate:number;
  hardBlock:boolean;
  status:"CLEAN"|"WARNING"|"LEAKAGE";
  reasons:string[];
}
