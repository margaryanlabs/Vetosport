export interface EdgeMemoryNode {
  id: string;
  sport: string;
  marketFamily: string;
  stateTags: string[];
  sampleSize: number;
  oosWindows: number;
  meanNetClv: number;
  positiveClvWindowRate: number;
  signalSurvivalRate: number;
  calibrationGain: number;
  regimeStability: number;
  fdrQValue: number;
  executableCoverage: number;
}

export interface EdgeMemoryMatch extends EdgeMemoryNode {
  stateSimilarity: number;
  evidenceQuality: number;
  memoryScore: number;
}

export interface AlphaHypothesis {
  id: string;
  title: string;
  sport: string;
  marketFamily: string;
  stateTags: string[];
  registeredVariants: number;
  sampleSize: number;
  oosWindows: number;
  positiveClvWindows: number;
  meanNetClv: number;
  calibrationGain: number;
  logLossGain: number;
  fdrQValue: number;
  regimeStability: number;
  executableSurvivalRate: number;
  leakageFlags: number;
}

export interface AlphaGateResult {
  status: "REJECT" | "RESEARCH_ONLY" | "SHADOW_CANDIDATE";
  score: number;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    hard: boolean;
    detail: string;
  }>;
  blockers: string[];
  warnings: string[];
}

export interface AlphaMemoryAnalysis {
  current: {
    sport: string;
    marketFamily: string;
    stateTags: string[];
  };
  matches: EdgeMemoryMatch[];
  hypothesis: AlphaHypothesis;
  gate: AlphaGateResult;
}
