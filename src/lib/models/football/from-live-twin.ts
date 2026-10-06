import type { LiveTwinState } from "@/lib/live-twin/types";
import type { FootballLiveInputs } from "./types";

const numeric = (
  features: LiveTwinState["features"],
  key: string,
  fallback?: number,
) => {
  const value = features[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
};

export const footballInputsFromLiveTwin = (
  state: LiveTwinState,
  baseline: {
    prematchExpectedHomeGoals: number;
    prematchExpectedAwayGoals: number;
  },
): FootballLiveInputs => {
  if (state.event.sport !== "football") {
    throw new Error("Live Twin state is not a football event.");
  }

  const elapsedSeconds =
    state.event.clock?.elapsedSeconds ??
    numeric(state.features, "elapsed_seconds", 0) ??
    0;

  return {
    scoreHome: state.event.score?.home ?? numeric(state.features, "score_home", 0) ?? 0,
    scoreAway: state.event.score?.away ?? numeric(state.features, "score_away", 0) ?? 0,
    elapsedMinutes: elapsedSeconds / 60,
    prematchExpectedHomeGoals: baseline.prematchExpectedHomeGoals,
    prematchExpectedAwayGoals: baseline.prematchExpectedAwayGoals,
    liveXgHome: numeric(state.features, "xg_home"),
    liveXgAway: numeric(state.features, "xg_away"),
    tempoIndex: numeric(state.features, "tempo_index", 1),
    homeRedCards: numeric(state.features, "home_red_cards", 0),
    awayRedCards: numeric(state.features, "away_red_cards", 0),
  };
};
