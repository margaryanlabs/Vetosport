export interface FootballLiveInputs {
  scoreHome: number;
  scoreAway: number;
  elapsedMinutes: number;

  // Expected full-match goals before kick-off. These can come from a
  // calibrated team-strength model, closing market, or blended baseline.
  prematchExpectedHomeGoals: number;
  prematchExpectedAwayGoals: number;

  // Optional live-state signals.
  liveXgHome?: number;
  liveXgAway?: number;
  tempoIndex?: number; // 1 = baseline, <1 slower, >1 faster
  homeRedCards?: number;
  awayRedCards?: number;
}

export interface RemainingGoalsEstimate {
  home: number;
  away: number;
  total: number;
  baselineHome: number;
  baselineAway: number;
  liveSignalHome?: number;
  liveSignalAway?: number;
  modifiers: {
    tempo: number;
    homeScoreState: number;
    awayScoreState: number;
    homeRedCardAttack: number;
    awayRedCardAttack: number;
    homeOpponentRedCardBoost: number;
    awayOpponentRedCardBoost: number;
  };
}

export interface ScorelineProbability {
  homeGoals: number;
  awayGoals: number;
  probability: number;
}

export interface FootballMarketProbability {
  marketId: string;
  selectionId: string;
  label: string;
  probability: number;
  fairOdds: number;
  line?: number;
  side?: "home" | "away" | "draw" | "yes" | "no" | "over" | "under";
}

export interface FootballProbabilitySurface {
  generatedAt: string;
  inputs: FootballLiveInputs;
  remainingGoals: RemainingGoalsEstimate;
  scorelines: ScorelineProbability[];
  topScorelines: ScorelineProbability[];
  markets: FootballMarketProbability[];
  matrixMass: number;
  truncationMaxAdditionalGoals: number;
}
