import type { MarketQuote } from "@/lib/domain/types";

export interface ClosingConsensus {
  marketId: string;
  selectionId: string;
  capturedAt: string;
  bookmakerCount: number;
  bestOdds: number;
  medianOdds: number;
  meanOdds: number;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

export const chooseClosingConsensus = (
  quotes: MarketQuote[],
  eventStartsAt: string,
  maximumLookbackMinutes = 90,
): ClosingConsensus[] => {
  const start = new Date(eventStartsAt).getTime();
  const floor = start - maximumLookbackMinutes * 60_000;
  const eligible = quotes.filter((quote) => {
    const at = new Date(quote.capturedAt).getTime();
    return at <= start && at >= floor && quote.decimalOdds > 1;
  });

  const latestByBookSelection = new Map<string, MarketQuote>();
  for (const quote of eligible) {
    const key = `${quote.marketId}::${quote.selection.id}::${quote.bookmaker}`;
    const previous = latestByBookSelection.get(key);
    if (
      !previous ||
      new Date(previous.capturedAt).getTime() <
        new Date(quote.capturedAt).getTime()
    ) {
      latestByBookSelection.set(key, quote);
    }
  }

  const groups = new Map<string, MarketQuote[]>();
  for (const quote of latestByBookSelection.values()) {
    const key = `${quote.marketId}::${quote.selection.id}`;
    groups.set(key, [...(groups.get(key) ?? []), quote]);
  }

  return [...groups.values()].map((rows) => {
    const odds = rows.map((row) => row.decimalOdds);
    return {
      marketId: rows[0].marketId,
      selectionId: rows[0].selection.id,
      capturedAt: rows.map((row) => row.capturedAt).sort().at(-1)!,
      bookmakerCount: new Set(rows.map((row) => row.bookmaker)).size,
      bestOdds: Math.max(...odds),
      medianOdds: median(odds),
      meanOdds: odds.reduce((sum, value) => sum + value, 0) / odds.length,
    };
  });
};
