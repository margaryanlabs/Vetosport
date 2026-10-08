import type {
  PersistedEvent,
  PersistedMarketQuoteRecord,
} from "@/lib/persistence/contracts";
import type {
  FootballMarketProbability,
  FootballProbabilitySurface,
} from "@/lib/models/football/types";

export interface MappedFootballQuote {
  quote: PersistedMarketQuoteRecord;
  modelMarket: FootballMarketProbability;
}

const norm = (value: string | undefined) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const near = (a: number | undefined, b: number | undefined) =>
  a != null && b != null && Math.abs(a - b) < 0.0001;

const lineFrom = (quote: PersistedMarketQuoteRecord) => {
  if (quote.line != null && Number.isFinite(quote.line)) return quote.line;
  const values = `${quote.selectionKey} ${quote.selectionLabel}`.match(/-?\d+(?:\.\d+)?/g);
  if (!values?.length) return undefined;
  const value = Number(values.at(-1));
  return Number.isFinite(value) ? value : undefined;
};

const sideFrom = (
  quote: PersistedMarketQuoteRecord,
  event: PersistedEvent,
) => {
  const key = norm(quote.selectionKey);
  const label = norm(quote.selectionLabel);
  const joined = `${key} ${label}`;
  const home = norm(event.event.home?.name);
  const away = norm(event.event.away?.name);

  if (/\b(draw|tie|x)\b/.test(joined)) return "draw" as const;
  if (/\b(over|o)\b/.test(joined) || key.startsWith("over")) return "over" as const;
  if (/\b(under|u)\b/.test(joined) || key.startsWith("under")) return "under" as const;
  if (/\b(yes|y)\b/.test(joined) || key === "yes") return "yes" as const;
  if (/\b(no|n)\b/.test(joined) || key === "no") return "no" as const;
  if (key === "home" || (home && joined.includes(home))) return "home" as const;
  if (key === "away" || (away && joined.includes(away))) return "away" as const;
  return undefined;
};

const exact = (
  surface: FootballProbabilitySurface,
  marketId: string,
  side: FootballMarketProbability["side"] | undefined,
  line?: number,
) =>
  surface.markets.find(
    (market) =>
      market.marketId === marketId &&
      (side == null || market.side === side) &&
      (line == null || near(market.line, line)),
  );

export const mapFootballQuoteToModel = (input: {
  event: PersistedEvent;
  quote: PersistedMarketQuoteRecord;
  surface: FootballProbabilitySurface;
}): MappedFootballQuote | null => {
  const { event, quote, surface } = input;
  if (quote.suspended || !Number.isFinite(quote.decimalOdds) || quote.decimalOdds <= 1) {
    return null;
  }

  const marketKey = quote.marketKey;
  const side = sideFrom(quote, event);
  const line = lineFrom(quote);
  let modelMarket: FootballMarketProbability | undefined;

  if (marketKey === "football.1x2" || /(?:^|\.)h2h$/.test(marketKey)) {
    if (side === "home" || side === "away" || side === "draw") {
      modelMarket = exact(surface, "football.1x2", side);
    }
  } else if (
    marketKey === "football.total_goals" ||
    /(?:^|\.)totals$/.test(marketKey)
  ) {
    if ((side === "over" || side === "under") && line != null) {
      modelMarket = exact(surface, "football.total_goals", side, line);
    }
  } else if (
    marketKey === "football.handicap" ||
    /(?:^|\.)spreads$/.test(marketKey)
  ) {
    if ((side === "home" || side === "away") && line != null) {
      modelMarket = exact(surface, "football.handicap", side, line);
    }
  } else if (marketKey === "football.btts") {
    if (side === "yes" || side === "no") {
      modelMarket = exact(surface, "football.btts", side);
    }
  } else if (marketKey === "football.team_total") {
    const text = norm(`${quote.selectionKey} ${quote.selectionLabel}`);
    const home = norm(event.event.home?.name);
    const away = norm(event.event.away?.name);
    const team =
      text.includes("home") || (home && text.includes(home))
        ? "home"
        : text.includes("away") || (away && text.includes(away))
          ? "away"
          : undefined;
    if (team && (side === "over" || side === "under") && line != null) {
      modelMarket = surface.markets.find(
        (market) =>
          market.marketId === "football.team_total" &&
          market.selectionId === `${team}-${side}-${line}`,
      );
    }
  }

  return modelMarket ? { quote, modelMarket } : null;
};

export const mapLatestFootballQuotes = (input: {
  event: PersistedEvent;
  quotes: PersistedMarketQuoteRecord[];
  surface: FootballProbabilitySurface;
}) => {
  const latest = new Map<string, PersistedMarketQuoteRecord>();
  for (const quote of input.quotes) {
    if (quote.eventId !== input.event.id) continue;
    const key = `${quote.marketKey}|${quote.selectionKey}`;
    if (!latest.has(key)) latest.set(key, quote);
  }

  return [...latest.values()]
    .map((quote) =>
      mapFootballQuoteToModel({
        event: input.event,
        quote,
        surface: input.surface,
      }),
    )
    .filter((row): row is MappedFootballQuote => Boolean(row));
};
