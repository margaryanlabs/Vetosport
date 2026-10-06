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
  "home-win": 0.32,
  draw: 0.47,
  "away-win": 0.21,
  "total-under-2.5": 0.46,
  "total-under-3.5": 0.699,
  "total-under-4.5": 0.86,
  "home-over-1.5": 0.45,
  "away-over-1.5": 0.4,
  "home-over-2.5": 0.19,
  "away-over-2.5": 0.15,
};

export const sandboxParallaxContracts =
  buildFootballParallaxContracts(
    sandboxParallaxSnapshot,
    sandboxFootballInputs,
  );

export const sandboxParallaxAnalysis = analyzeFootballParallax({
  scorelines: sandboxFootballSurface.scorelines,
  inputs: sandboxFootballInputs,
  contracts: sandboxParallaxContracts,
  primaryContractId: "total-under-3.5",
  halfLifeSeconds: 21,
  ageSeconds: 8,
});
