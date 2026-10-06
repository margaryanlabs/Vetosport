import type { ParallaxMarketContract } from "@/lib/parallax/types";

export const footballParallaxContractIds = [
  "home-win",
  "draw",
  "away-win",
  "total-under-2.5",
  "total-under-3.5",
  "btts-yes",
  "home-over-0.5",
  "away-over-0.5",
  "home-over-1.5",
] as const;

export type FootballParallaxContractId =
  (typeof footballParallaxContractIds)[number];

export type FootballParallaxMarketSnapshot = Record<
  FootballParallaxContractId,
  number
>;

export const buildFootballParallaxContracts = (
  snapshot: FootballParallaxMarketSnapshot,
): ParallaxMarketContract[] => [
  {
    id: "home-win",
    label: "Home win",
    family: "1X2",
    marketProbability: snapshot["home-win"],
    weight: 1,
    predicate: (state) => state.homeGoals > state.awayGoals,
  },
  {
    id: "draw",
    label: "Draw",
    family: "1X2",
    marketProbability: snapshot.draw,
    weight: 1,
    predicate: (state) => state.homeGoals === state.awayGoals,
  },
  {
    id: "away-win",
    label: "Away win",
    family: "1X2",
    marketProbability: snapshot["away-win"],
    weight: 1,
    predicate: (state) => state.homeGoals < state.awayGoals,
  },
  {
    id: "total-under-2.5",
    label: "Under 2.5",
    family: "TOTAL",
    marketProbability: snapshot["total-under-2.5"],
    weight: 0.95,
    predicate: (state) => state.homeGoals + state.awayGoals < 2.5,
  },
  {
    id: "total-under-3.5",
    label: "Under 3.5",
    family: "TOTAL",
    marketProbability: snapshot["total-under-3.5"],
    weight: 1,
    predicate: (state) => state.homeGoals + state.awayGoals < 3.5,
  },
  {
    id: "btts-yes",
    label: "BTTS Yes",
    family: "BTTS",
    marketProbability: snapshot["btts-yes"],
    weight: 0.9,
    predicate: (state) => state.homeGoals > 0 && state.awayGoals > 0,
  },
  {
    id: "home-over-0.5",
    label: "Home over 0.5",
    family: "TEAM TOTAL",
    marketProbability: snapshot["home-over-0.5"],
    weight: 0.85,
    predicate: (state) => state.homeGoals > 0.5,
  },
  {
    id: "away-over-0.5",
    label: "Away over 0.5",
    family: "TEAM TOTAL",
    marketProbability: snapshot["away-over-0.5"],
    weight: 0.85,
    predicate: (state) => state.awayGoals > 0.5,
  },
  {
    id: "home-over-1.5",
    label: "Home over 1.5",
    family: "TEAM TOTAL",
    marketProbability: snapshot["home-over-1.5"],
    weight: 0.9,
    predicate: (state) => state.homeGoals > 1.5,
  },
];
