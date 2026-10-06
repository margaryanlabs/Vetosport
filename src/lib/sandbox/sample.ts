import type { MarketQuote, ModelSignal, SportEvent } from "@/lib/domain/types";
import { aggregateCouncil } from "@/lib/intelligence/council";
import { evaluateOpportunity } from "@/lib/intelligence/opportunity";
import { sandboxMarketProbability } from "@/lib/sandbox/football-model";

const at = "2026-10-06T08:00:00.000Z";

export const sandboxEvent: SportEvent = {
  id: "sandbox-ars-liv",
  sport: "football",
  competition: "Premier League · VETO Sandbox",
  startsAt: at,
  status: "live",
  home: { id: "ars", name: "Arsenal", shortName: "ARS" },
  away: { id: "liv", name: "Liverpool", shortName: "LIV" },
  clock: { period: "2H", elapsedSeconds: 64 * 60 + 18 },
  score: { home: 1, away: 1 },
};

const council = (
  probabilities: number[],
  confidence = [0.91, 0.89, 0.8, 0.74],
): ModelSignal[] =>
  probabilities.map((probability, index) => ({
    modelId: ["game-state", "simulation", "historical-similarity", "market-context"][index],
    version: "0.2.0",
    probability,
    weight: [1, 1, 0.72, 0.58][index],
    confidence: confidence[index] ?? 0.75,
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
  bookmaker: "sandbox-consensus",
  decimalOdds: odds,
  capturedAt: at,
  liquidity: 0.8,
});

const candidates = [
  {
    quote: quote("football.total_goals", "under-3.5", "Тотал меньше 3.5", 1.43),
    estimate: aggregateCouncil(council([
      sandboxMarketProbability("football.total_goals", "under-3.5") ?? 0.82,
      0.82,
      0.81,
      0.78,
    ])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 8, liquidityScore: 0.9, correlationRisk: 0.16, marketEfficiency: 0.52 },
  },
  {
    quote: quote("football.player_shots", "saka-over-1.5", "Saka · удары больше 1.5", 1.82),
    estimate: aggregateCouncil(council([0.65, 0.63, 0.67, 0.59])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 11, liquidityScore: 0.75, correlationRisk: 0.32, marketEfficiency: 0.48 },
  },
  {
    quote: quote("football.corners", "over-9.5", "Угловые больше 9.5", 2.04),
    estimate: aggregateCouncil(council([0.56, 0.55, 0.58, 0.51])),
    context: { dataConfidence: "MEDIUM" as const, freshnessSeconds: 16, liquidityScore: 0.68, correlationRisk: 0.28, marketEfficiency: 0.4 },
  },
  {
    quote: quote("football.1x2", "home", "Arsenal победит", 2.16),
    estimate: aggregateCouncil(council([0.48, 0.47, 0.54, 0.46])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 9, liquidityScore: 0.94, correlationRisk: 0.08, marketEfficiency: 0.84 },
  },
  {
    quote: quote("football.btts", "yes", "Обе забьют · Да", 1.71),
    estimate: aggregateCouncil(council([0.61, 0.59, 0.6, 0.57])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 7, liquidityScore: 0.88, correlationRisk: 0.47, marketEfficiency: 0.72 },
  },
  {
    quote: quote("football.asian_handicap", "ars-minus-0.25", "Arsenal −0.25", 2.28),
    estimate: aggregateCouncil(council([0.47, 0.46, 0.5, 0.43])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 10, liquidityScore: 0.86, correlationRisk: 0.42, marketEfficiency: 0.76 },
  },
  {
    quote: quote("football.team_total", "liv-under-1.5", "Liverpool · тотал меньше 1.5", 1.67),
    estimate: aggregateCouncil(council([0.67, 0.66, 0.7, 0.63])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 8, liquidityScore: 0.82, correlationRisk: 0.51, marketEfficiency: 0.64 },
  },
  {
    quote: quote("football.cards", "over-3.5", "Карточки больше 3.5", 1.94),
    estimate: aggregateCouncil(council([0.55, 0.53, 0.57, 0.5], [0.8, 0.78, 0.74, 0.69])),
    context: { dataConfidence: "MEDIUM" as const, freshnessSeconds: 14, liquidityScore: 0.57, correlationRisk: 0.18, marketEfficiency: 0.43 },
  },
  {
    quote: quote("football.player_sot", "salah-over-0.5", "Salah · удар в створ 1+", 1.59),
    estimate: aggregateCouncil(council([0.68, 0.7, 0.66, 0.63])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 6, liquidityScore: 0.79, correlationRisk: 0.34, marketEfficiency: 0.61 },
  },
  {
    quote: quote("football.special", "next-goal-ars", "Следующий гол · Arsenal", 2.52),
    estimate: aggregateCouncil(council([0.43, 0.41, 0.46, 0.39], [0.76, 0.73, 0.7, 0.68])),
    context: { dataConfidence: "MEDIUM" as const, freshnessSeconds: 5, liquidityScore: 0.71, correlationRisk: 0.58, marketEfficiency: 0.55 },
  },
  {
    quote: quote("football.total_goals", "over-4.5", "Тотал больше 4.5", 5.4),
    estimate: aggregateCouncil(council([0.14, 0.16, 0.13, 0.18])),
    context: { dataConfidence: "HIGH" as const, freshnessSeconds: 8, liquidityScore: 0.74, correlationRisk: 0.21, marketEfficiency: 0.66 },
  },
];

export const sandboxOpportunities = candidates.map(({ quote, estimate, context }) =>
  evaluateOpportunity(quote, estimate, context),
);
