import type { MarketDefinition } from "./types";

export const MARKET_CATALOG: MarketDefinition[] = [
  { id: "football.1x2", sport: "football", family: "moneyline", label: "1X2", live: true },
  { id: "football.double_chance", sport: "football", family: "moneyline", label: "Double chance", live: true },
  { id: "football.total_goals", sport: "football", family: "total", label: "Total goals", live: true },
  { id: "football.asian_total", sport: "football", family: "total", label: "Asian total", live: true },
  { id: "football.asian_handicap", sport: "football", family: "spread", label: "Asian handicap", live: true },
  { id: "football.team_total", sport: "football", family: "team_total", label: "Team total", live: true },
  { id: "football.btts", sport: "football", family: "special", label: "Both teams to score", live: true },
  { id: "football.corners", sport: "football", family: "corners", label: "Corners", live: true },
  { id: "football.cards", sport: "football", family: "cards", label: "Cards", live: true },
  { id: "football.player_shots", sport: "football", family: "shots", label: "Player shots", live: true },
  { id: "football.player_sot", sport: "football", family: "shots", label: "Player shots on target", live: true },
  { id: "football.player_goals", sport: "football", family: "player_prop", label: "Player goals", live: true },
  { id: "football.first_half", sport: "football", family: "period", label: "First half", live: true },

  { id: "basketball.moneyline", sport: "basketball", family: "moneyline", label: "Moneyline", live: true },
  { id: "basketball.spread", sport: "basketball", family: "spread", label: "Spread", live: true },
  { id: "basketball.total", sport: "basketball", family: "total", label: "Game total", live: true },
  { id: "basketball.team_total", sport: "basketball", family: "team_total", label: "Team total", live: true },
  { id: "basketball.player_points", sport: "basketball", family: "player_prop", label: "Player points", live: true },
  { id: "basketball.player_rebounds", sport: "basketball", family: "player_prop", label: "Player rebounds", live: true },
  { id: "basketball.player_assists", sport: "basketball", family: "player_prop", label: "Player assists", live: true },
  { id: "basketball.quarter", sport: "basketball", family: "period", label: "Quarter markets", live: true },

  { id: "tennis.match_winner", sport: "tennis", family: "moneyline", label: "Match winner", live: true },
  { id: "tennis.set_winner", sport: "tennis", family: "period", label: "Set winner", live: true },
  { id: "tennis.games_total", sport: "tennis", family: "total", label: "Total games", live: true },
  { id: "tennis.games_handicap", sport: "tennis", family: "spread", label: "Games handicap", live: true },
  { id: "tennis.aces", sport: "tennis", family: "player_prop", label: "Aces", live: true },
];

export const marketsForSport = (sport: MarketDefinition["sport"]) =>
  MARKET_CATALOG.filter((market) => market.sport === sport);
