export interface AvailabilityObservation {
  timeMs:number;
  modelGapPp:number;
  marketActive:boolean;
  quoteExecutable:boolean;
  signalCandidate:boolean;
}

export interface SuspensionCensoringResult {
  observations:number;
  candidates:number;
  executableCandidates:number;
  censoredCandidateRate:number;
  executableCoverage:number;
  rawMeanGapPp:number;
  executableMeanGapPp:number;
  edgeInflationPp:number;
  biasScore:number;
  status:"CLEAN"|"WATCH"|"BLOCK";
  hardBlock:boolean;
  reasons:string[];
}
