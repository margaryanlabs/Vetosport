import type { MarketDefinition, Sport } from "@/lib/domain/types";

export type ModelCadence = "prematch" | "live" | "both";
export type ModelStage = "baseline" | "specialist" | "context" | "meta";

export interface SpecialistModelDefinition {
  id: string;
  sport: Sport;
  stage: ModelStage;
  cadence: ModelCadence;
  targetFamilies: MarketDefinition["family"][];
  requiredFeatures: string[];
  optionalFeatures: string[];
  description: string;
}

export const MODEL_CATALOG: SpecialistModelDefinition[] = [
  {
    id: "football.goal-state",
    sport: "football",
    stage: "specialist",
    cadence: "live",
    targetFamilies: ["total", "team_total", "moneyline", "spread", "special"],
    requiredFeatures: ["score", "clock", "xg", "shots", "red_cards"],
    optionalFeatures: ["field_tilt", "pressure", "substitutions", "formation_state"],
    description: "Remaining-goals and outcome model conditioned on live match state.",
  },
  {
    id: "football.dixon-coles",
    sport: "football",
    stage: "baseline",
    cadence: "both",
    targetFamilies: ["moneyline", "total", "team_total", "spread"],
    requiredFeatures: ["team_attack_strength", "team_defence_strength", "venue"],
    optionalFeatures: ["lineups", "rest_days", "competition_strength"],
    description: "Low-score-aware football baseline for scoreline distribution.",
  },
  {
    id: "football.micro-markets",
    sport: "football",
    stage: "specialist",
    cadence: "live",
    targetFamilies: ["corners", "cards", "shots", "player_prop"],
    requiredFeatures: ["clock", "player_state", "team_state", "event_stream"],
    optionalFeatures: ["referee", "tracking", "tactical_shape"],
    description: "Separate hazard models for corners, cards, shots and player props.",
  },
  {
    id: "basketball.possession-state",
    sport: "basketball",
    stage: "specialist",
    cadence: "live",
    targetFamilies: ["moneyline", "spread", "total", "team_total"],
    requiredFeatures: ["score", "clock", "possessions", "pace", "lineups"],
    optionalFeatures: ["foul_state", "timeouts", "shot_quality"],
    description: "Possession-level win, spread and total distribution.",
  },
  {
    id: "basketball.player-usage",
    sport: "basketball",
    stage: "specialist",
    cadence: "both",
    targetFamilies: ["player_prop"],
    requiredFeatures: ["minutes_projection", "usage", "lineup_state"],
    optionalFeatures: ["matchup", "foul_risk", "on_off"],
    description: "Player points, assists, rebounds and derivative prop model.",
  },
  {
    id: "tennis.serve-return",
    sport: "tennis",
    stage: "specialist",
    cadence: "both",
    targetFamilies: ["moneyline", "spread", "total", "period", "player_prop"],
    requiredFeatures: ["surface", "serve_strength", "return_strength", "score_state"],
    optionalFeatures: ["fatigue", "travel", "weather", "injury"],
    description: "Point-to-game-to-set hierarchy with surface-adjusted player strength.",
  },
  {
    id: "hockey.xg-goalie",
    sport: "hockey",
    stage: "specialist",
    cadence: "both",
    targetFamilies: ["moneyline", "spread", "total", "team_total"],
    requiredFeatures: ["xg", "shots", "goalie_strength", "clock"],
    optionalFeatures: ["special_teams", "rest", "line_changes"],
    description: "Shot-quality and goalie-adjusted game-state model.",
  },
  {
    id: "baseball.run-state",
    sport: "baseball",
    stage: "specialist",
    cadence: "both",
    targetFamilies: ["moneyline", "spread", "total", "team_total", "player_prop"],
    requiredFeatures: ["pitcher", "lineup", "inning", "base_out_state"],
    optionalFeatures: ["park", "weather", "bullpen_fatigue", "platoon_splits"],
    description: "Pitcher/batter and base-out run-distribution model.",
  },
  {
    id: "mma.style-bayes",
    sport: "mma",
    stage: "specialist",
    cadence: "prematch",
    targetFamilies: ["moneyline", "special"],
    requiredFeatures: ["fighter_ratings", "style_profile", "age", "weight_class"],
    optionalFeatures: ["reach", "camp_change", "layoff", "weight_cut"],
    description: "Bayesian matchup model focused on interaction between fighting styles.",
  },
  {
    id: "esports.map-draft",
    sport: "esports",
    stage: "specialist",
    cadence: "both",
    targetFamilies: ["moneyline", "spread", "total", "period", "player_prop"],
    requiredFeatures: ["roster", "map_pool", "draft_state", "recent_form"],
    optionalFeatures: ["patch_version", "side_bias", "travel"],
    description: "Roster, map and draft-conditioned esports model.",
  },
];

export const modelsForSport = (sport: Sport) =>
  MODEL_CATALOG.filter((model) => model.sport === sport);

export const modelsForMarketFamily = (
  sport: Sport,
  family: MarketDefinition["family"],
) =>
  MODEL_CATALOG.filter(
    (model) => model.sport === sport && model.targetFamilies.includes(family),
  );
