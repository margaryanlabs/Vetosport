import type { MarketQuote, ModelSignal, SportEvent } from "@/lib/domain/types";
import { aggregateCouncil } from "@/lib/intelligence/council";
import { evaluateOpportunity } from "@/lib/intelligence/opportunity";

const at = "2026-10-06T08:00:00.000Z";

export const sandboxEvent: SportEvent = {
  id: "sandbox-ars-liv",
  sport: "football",
  competition: "VETO Sandbox League",
  startsAt: at,
  status: "live",
  home: { id: "ars", name: "Arsenal", shortName: "ARS" },
  away: { id: "liv", name: "Liverpool", shortName: "LIV" },
  clock: { period: "2H", elapsedSeconds: 64 * 60 + 18 },
  score: { home: 1, away: 1 },
};

const council = (probabilities: number[]): ModelSignal[] =>
  probabilities.map((probability, index) => ({
    modelId: ["game-state", "simulation", "historical-similarity", "market-context"][index],
    version: "0.1.0",
    probability,
    weight: [1, 1, 0.72, 0.58][index],
    confidence: [0.91, 0.89, 0.8, 0.74][index],
    generatedAt: at,
  }));

const quote = (
  marketId: string,
  selectionId: string,
  label: string,
  odds: number,
): MarketQuote => ({
  eventId: sandboxEvent.id,
  marketId,
  selection: { id: selectionId, label },
  bookmaker: "sandbox-market",
  decimalOdds: odds,
  capturedAt: at,
  liquidity: 0.8,
});

export const sandboxOpportunities = [
  {
    quote: quote("football.total_goals", "under-3.5", "Under 3.5", 1.43),
    estimate: aggregateCouncil(council([0.79, 0.77, 0.8, 0.74])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 8, liquidityScore: 0.9, correlationRisk: 0.16, marketEfficiency: 0.52 },
  },
  {
    quote: quote("football.player_shots", "saka-over-1.5", "Saka shots O1.5", 1.82),
    estimate: aggregateCouncil(council([0.65, 0.63, 0.67, 0.59])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 11, liquidityScore: 0.75, correlationRisk: 0.32, marketEfficiency: 0.48 },
  },
  {
    quote: quote("football.corners", "over-9.5", "Corners O9.5", 2.04),
    estimate: aggregateCouncil(council([0.56, 0.55, 0.58, 0.51])),
    context: { dataConfidence: "MEDIUM" as const, freshnessSeconds: 16, liquidityScore: 0.68, correlationRisk: 0.28, marketEfficiency: 0.4 },
  },
  {
    quote: quote("football.1x2", "home", "Arsenal win", 2.16),
    estimate: aggregateCouncil(council([0.48, 0.47, 0.54, 0.46])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 9, liquidityScore: 0.94, correlationRisk: 0.08, marketEfficiency: 0.84 },
  },
].map(({ quote, estimate, context }) => evaluateOpportunity(quote, estimate, context));
