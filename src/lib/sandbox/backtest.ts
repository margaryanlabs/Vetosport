import type { BacktestRow } from "@/lib/backtest/types";
import { runBacktest } from "@/lib/backtest/runner";
import { summarizeWalkForward } from "@/lib/backtest/walk-forward";

const markets = [
  { id: "football.total_goals", selection: "under-3.5", baseP: 0.71, baseOdds: 1.49 },
  { id: "football.btts", selection: "no", baseP: 0.57, baseOdds: 1.84 },
  { id: "football.1x2", selection: "home", baseP: 0.49, baseOdds: 2.16 },
  { id: "football.team_total", selection: "away-under-1.5", baseP: 0.64, baseOdds: 1.68 },
  { id: "football.handicap", selection: "home--0.5", baseP: 0.47, baseOdds: 2.22 },
];

const competitions = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Champions League",
];

const deterministicUnit = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const sandboxBacktestRows: BacktestRow[] = Array.from(
  { length: 210 },
  (_, index) => {
    const market = markets[index % markets.length];
    const competition = competitions[index % competitions.length];
    const date = new Date(Date.UTC(2026, 0, 1 + index));
    const eventStart = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const predictionAt = new Date(eventStart.getTime() - 95 * 60 * 1000);
    const settledAt = new Date(eventStart.getTime() + 3 * 60 * 60 * 1000);

    const modelNoise = (deterministicUnit(index + 11) - 0.5) * 0.09;
    const fairProbability = Math.min(
      0.88,
      Math.max(0.25, market.baseP + modelNoise),
    );

    // Sandbox gives VETO a modest but not perfect tendency to beat the close.
    const entryOdds = Math.max(
      1.12,
      market.baseOdds * (0.965 + deterministicUnit(index + 37) * 0.09),
    );
    const closingOdds = Math.max(
      1.08,
      entryOdds * (0.94 + deterministicUnit(index + 71) * 0.075),
    );

    const outcomeDraw = deterministicUnit(index + 101);
    const result = outcomeDraw < fairProbability ? "win" : "loss";

    const decision =
      fairProbability * entryOdds - 1 > 0.035 &&
      deterministicUnit(index + 131) > 0.18
        ? "EDGE"
        : deterministicUnit(index + 151) > 0.48
          ? "WATCH"
          : "PASS";

    return {
      id: `sandbox-bt-${index + 1}`,
      eventId: `sandbox-event-${index + 1}`,
      sport: "football",
      competition,
      marketId: market.id,
      selectionId: market.selection,
      predictionAt: predictionAt.toISOString(),
      eventStartsAt: eventStart.toISOString(),
      settledAt: settledAt.toISOString(),
      modelVersion: "football.goal-state.v1-sandbox",
      decisionMode: "BALANCED",
      decision,
      fairProbability,
      entryOdds,
      closingOdds,
      stake: 1,
      result,
      tags: ["synthetic", "sandbox"],
    };
  },
);

export const sandboxBacktestReport = runBacktest(sandboxBacktestRows, {
  calibrationBuckets: 8,
  defaultStake: 1,
});

export const sandboxWalkForward = summarizeWalkForward(
  sandboxBacktestRows,
  {
    trainDays: 60,
    testDays: 30,
    stepDays: 30,
    minimumTrainRows: 45,
    minimumTestRows: 20,
  },
);
