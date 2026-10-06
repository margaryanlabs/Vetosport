export interface HypothesisTest {
  id:string;
  family:string;
  pValue:number;
  effect:number;
}

export interface BatchFdrDecision extends HypothesisTest {
  rank:number;
  threshold:number;
  accepted:boolean;
}

export interface SequentialTestDecision extends HypothesisTest {
  index:number;
  alphaAllocated:number;
  accepted:boolean;
  cumulativeAlphaSpent:number;
}

export interface DiscoveryControlResult {
  batch:BatchFdrDecision[];
  sequential:SequentialTestDecision[];
  discoveries:number;
  tested:number;
  q:number;
  alphaBudget:number;
}
