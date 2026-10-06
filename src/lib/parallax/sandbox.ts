import type { ParallaxMarketContract } from "@/lib/parallax/types";
import {
  sandboxFootballInputs,
  sandboxFootballSurface,
} from "@/lib/sandbox/football-model";
import { analyzeFootballParallax } from "@/lib/parallax/engine";

export const sandboxParallaxContracts: ParallaxMarketContract[] = [
  {
    id: "home-win",
    label: "Home win",
    family: "1X2",
    marketProbability: 0.43,
    weight: 1,
    predicate: (state) => state.homeGoals > state.awayGoals,
  },
  {
    id: "draw",
    label: "Draw",
    family: "1X2",
    marketProbability: 0.27,
    weight: 1,
    predicate: (state) => state.homeGoals === state.awayGoals,
  },
  {
    id: "away-win",
    label: "Away win",
    family: "1X2",
    marketProbability: 0.3,
    weight: 1,
    predicate: (state) => state.homeGoals < state.awayGoals,
  },
  {
    id: "total-under-2.5",
    label: "Under 2.5",
    family: "TOTAL",
    marketProbability: 0.46,
    weight: 0.95,
    predicate: (state) => state.homeGoals + state.awayGoals < 2.5,
  },
  {
    id: "total-under-3.5",
    label: "Under 3.5",
    family: "TOTAL",
    marketProbability: 0.699,
    weight: 1,
    predicate: (state) => state.homeGoals + state.awayGoals < 3.5,
  },
  {
    id: "btts-yes",
    label: "BTTS Yes",
    family: "BTTS",
    marketProbability: 0.69,
    weight: 0.9,
    predicate: (state) => state.homeGoals > 0 && state.awayGoals > 0,
  },
  {
    id: "home-over-0.5",
    label: "Home over 0.5",
    family: "TEAM TOTAL",
    marketProbability: 0.66,
    weight: 0.85,
    predicate: (state) => state.homeGoals > 0.5,
  },
  {
    id: "away-over-0.5",
    label: "Away over 0.5",
    family: "TEAM TOTAL",
    marketProbability: 0.68,
    weight: 0.85,
    predicate: (state) => state.awayGoals > 0.5,
  },
  {
    id: "home-over-1.5",
    label: "Home over 1.5",
    family: "TEAM TOTAL",
    marketProbability: 0.41,
    weight: 0.9,
    predicate: (state) => state.homeGoals > 1.5,
  },
];

export const sandboxParallaxAnalysis = analyzeFootballParallax({
  scorelines: sandboxFootballSurface.scorelines,
  inputs: sandboxFootballInputs,
  contracts: sandboxParallaxContracts,
  primaryContractId: "total-under-3.5",
  halfLifeSeconds: 21,
  ageSeconds: 8,
});
