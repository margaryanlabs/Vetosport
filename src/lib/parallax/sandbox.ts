import {
  buildFootballParallaxContracts,
  type FootballParallaxMarketSnapshot,
} from "@/lib/parallax/football-contracts";
import { analyzeFootballParallax } from "@/lib/parallax/engine";
import {
  sandboxFootballInputs,
  sandboxFootballSurface,
} from "@/lib/sandbox/football-model";

export const sandboxParallaxSnapshot: FootballParallaxMarketSnapshot = {
  "home-win": 0.43,
  draw: 0.27,
  "away-win": 0.3,
  "total-under-2.5": 0.46,
  "total-under-3.5": 0.699,
  "btts-yes": 0.69,
  "home-over-0.5": 0.66,
  "away-over-0.5": 0.68,
  "home-over-1.5": 0.41,
};

export const sandboxParallaxContracts =
  buildFootballParallaxContracts(sandboxParallaxSnapshot);

export const sandboxParallaxAnalysis = analyzeFootballParallax({
  scorelines: sandboxFootballSurface.scorelines,
  inputs: sandboxFootballInputs,
  contracts: sandboxParallaxContracts,
  primaryContractId: "total-under-3.5",
  halfLifeSeconds: 21,
  ageSeconds: 8,
});
