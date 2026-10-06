export interface MarketCapacityInput {
  marketId:string;
  robustGapPp:number;
  quoteAgeMs:number;
  signalHalfLifeMs:number;
  acceptanceDelayMs:number;
  executableCoverage:number;
  limitReliability:number;
  liquidityProxy:number;
  rejectionRate:number;
  suspensionRate:number;
  expectedSlippagePp:number;
  spreadPp:number;
}

export interface MarketCapacityResult extends MarketCapacityInput {
  survivalFraction:number;
  postExecutionGapPp:number;
  capacityScore:number;
  class:"ZERO"|"FRAGILE"|"THIN"|"TRADEABLE"|"DEEP";
  hardBlock:boolean;
  reasons:string[];
}
