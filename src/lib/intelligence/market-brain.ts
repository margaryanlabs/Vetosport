import type { MarketQuote } from "@/lib/domain/types";
import { impliedProbability } from "./math";

export interface SelectionMarketConsensus {
  marketId: string;
  selectionId: string;
  selectionLabel: string;
  bookmakerCount: number;
  bestOdds: number;
  worstOdds: number;
  medianOdds: number;
  meanImpliedProbability: number;
  normalizedConsensusProbability?: number;
  dispersion: number;
  newestQuoteAt: string;
}

export interface MarketMovementPoint {
  capturedAt: string;
  decimalOdds: number;
}

export interface MarketMovement {
  fromOdds: number;
  toOdds: number;
  probabilityShift: number;
  oddsVelocityPerMinute: number;
  secondsElapsed: number;
  direction: "shortening" | "drifting" | "flat";
}

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const stdDev = (values: number[]) => {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      values.length,
  );
};

export const buildSelectionConsensus = (
  quotes: MarketQuote[],
): SelectionMarketConsensus[] => {
  const groups = new Map<string, MarketQuote[]>();

  for (const quote of quotes) {
    const key = `${quote.marketId}::${quote.selection.id}`;
    const current = groups.get(key) ?? [];
    current.push(quote);
    groups.set(key, current);
  }

  return [...groups.values()].map((rows) => {
    const odds = rows.map((row) => row.decimalOdds);
    const probabilities = odds.map(impliedProbability);
    const newestQuoteAt = rows
      .map((row) => row.capturedAt)
      .sort()
      .at(-1) ?? new Date(0).toISOString();

    return {
      marketId: rows[0].marketId,
      selectionId: rows[0].selection.id,
      selectionLabel: rows[0].selection.label,
      bookmakerCount: new Set(rows.map((row) => row.bookmaker)).size,
      bestOdds: Math.max(...odds),
      worstOdds: Math.min(...odds),
      medianOdds: median(odds),
      meanImpliedProbability:
        probabilities.reduce((sum, probability) => sum + probability, 0) /
        probabilities.length,
      dispersion: stdDev(probabilities),
      newestQuoteAt,
    };
  });
};

export const attachNoVigConsensus = (
  selections: SelectionMarketConsensus[],
): SelectionMarketConsensus[] => {
  const byMarket = new Map<string, SelectionMarketConsensus[]>();

  for (const selection of selections) {
    const current = byMarket.get(selection.marketId) ?? [];
    current.push(selection);
    byMarket.set(selection.marketId, current);
  }

  return selections.map((selection) => {
    const siblings = byMarket.get(selection.marketId) ?? [selection];
    const denominator = siblings.reduce(
      (sum, row) => sum + row.meanImpliedProbability,
      0,
    );

    return {
      ...selection,
      normalizedConsensusProbability:
        denominator > 0
          ? selection.meanImpliedProbability / denominator
          : undefined,
    };
  });
};

export const calculateMarketMovement = (
  points: MarketMovementPoint[],
): MarketMovement | null => {
  if (points.length < 2) return null;

  const sorted = [...points].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const secondsElapsed = Math.max(
    1,
    (new Date(last.capturedAt).getTime() - new Date(first.capturedAt).getTime()) /
      1000,
  );

  const firstProbability = impliedProbability(first.decimalOdds);
  const lastProbability = impliedProbability(last.decimalOdds);
  const probabilityShift = lastProbability - firstProbability;
  const minutes = secondsElapsed / 60;
  const oddsVelocityPerMinute = (last.decimalOdds - first.decimalOdds) / minutes;

  return {
    fromOdds: first.decimalOdds,
    toOdds: last.decimalOdds,
    probabilityShift,
    oddsVelocityPerMinute,
    secondsElapsed,
    direction:
      Math.abs(oddsVelocityPerMinute) < 0.001
        ? "flat"
        : oddsVelocityPerMinute < 0
          ? "shortening"
          : "drifting",
  };
};

export interface PriceLagAssessment {
  vetoProbability: number;
  marketProbability: number;
  probabilityGap: number;
  fairOdds: number;
  bestMarketOdds: number;
  edgeAtBestPrice: number;
  classification: "aligned" | "watch" | "market-lag";
}

export const assessPriceLag = (input: {
  vetoProbability: number;
  marketProbability: number;
  fairOdds: number;
  bestMarketOdds: number;
}): PriceLagAssessment => {
  const probabilityGap = input.vetoProbability - input.marketProbability;
  const edgeAtBestPrice = input.vetoProbability * input.bestMarketOdds - 1;

  return {
    ...input,
    probabilityGap,
    edgeAtBestPrice,
    classification:
      probabilityGap >= 0.06 && edgeAtBestPrice >= 0.05
        ? "market-lag"
        : probabilityGap >= 0.025 && edgeAtBestPrice > 0
          ? "watch"
          : "aligned",
  };
};
