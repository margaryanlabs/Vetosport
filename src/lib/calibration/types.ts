export interface CalibrationObservation {
  predicted:number;
  outcome:0|1;
  family:string;
  league:string;
}

export interface CalibrationMetrics {
  sampleSize:number;
  meanPredicted:number;
  observedRate:number;
  bias:number;
  brier:number;
  ece:number;
  slope:number;
  intercept:number;
}

export interface CalibrationDriftResult {
  family:string;
  league:string;
  baseline:CalibrationMetrics;
  current:CalibrationMetrics;
  eceDelta:number;
  brierDelta:number;
  biasDelta:number;
  slopeDeviation:number;
  score:number;
  status:"HEALTHY"|"WATCH"|"KILL";
  killSwitch:boolean;
  reasons:string[];
}
