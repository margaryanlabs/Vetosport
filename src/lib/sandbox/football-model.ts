import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";
import type { FootballLiveInputs } from "@/lib/models/football/types";

export const sandboxFootballInputs: FootballLiveInputs = {
  scoreHome: 1,
  scoreAway: 1,
  elapsedMinutes: 64.3,
  prematchExpectedHomeGoals: 1.62,
  prematchExpectedAwayGoals: 1.29,
  liveXgHome: 1.31,
  liveXgAway: 0.96,
  tempoIndex: 0.81,
  homeRedCards: 0,
  awayRedCards: 0,
};

export const sandboxFootballBeforeInputs: FootballLiveInputs = {
  ...sandboxFootballInputs,
  elapsedMinutes: 60,
  liveXgHome: 1.24,
  liveXgAway: 0.91,
  tempoIndex: 0.92,
};

export const sandboxFootballBeforeSurface =
  buildFootballProbabilitySurface(sandboxFootballBeforeInputs);

export const sandboxFootballSurface =
  buildFootballProbabilitySurface(sandboxFootballInputs);

export const sandboxMarketProbability = (
  marketId: string,
  selectionId: string,
) =>
  sandboxFootballSurface.markets.find(
    (market) =>
      market.marketId === marketId && market.selectionId === selectionId,
  )?.probability;
