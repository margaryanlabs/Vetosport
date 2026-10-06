import type { ScorelineProbability } from "@/lib/models/football/types";

export interface ParallaxMarketContract {
  id: string;
  label: string;
  family: string;
  marketProbability: number;
  weight: number;
  predicate: (state: ScorelineProbability) => boolean;
}

export interface ParallaxContractResult {
  id: string;
  label: string;
  family: string;
  vetoProbability: number;
  marketProbability: number;
  projectedMarketProbability: number;
  vetoGap: number;
  consistencyResidual: number;
  weight: number;
}

export interface ParallaxUncertainty {
  model: number;
  data: number;
  execution: number;
  clock: number;
  combined: number;
}

export interface ParallaxSignalDecay {
  peakGap: number;
  currentGap: number;
  halfLifeSeconds: number;
  ageSeconds: number;
  survival20s: number;
  expectedGap20s: number;
  status: "FRESH" | "DECAYING" | "EXPIRED";
}

export interface ParallaxCounterfactual {
  id: string;
  label: string;
  probability: number;
  robustGap: number;
  status: "SURVIVES" | "WATCH" | "INVALIDATES";
}

export interface ParallaxAnalysis {
  consistencyScore: number;
  residualRmse: number;
  converged: boolean;
  iterations: number;
  contracts: ParallaxContractResult[];
  inconsistencyCluster: ParallaxContractResult[];
  marketWorld: ScorelineProbability[];
  primary: {
    contractId: string;
    label: string;
    fairProbability: number;
    marketProbability: number;
    rawGap: number;
    robustFloor: number;
    robustGap: number;
    fairOdds: number;
    marketFairOdds: number;
    breakEvenOdds: number;
  };
  uncertainty: ParallaxUncertainty;
  decay: ParallaxSignalDecay;
  counterfactuals: ParallaxCounterfactual[];
}
