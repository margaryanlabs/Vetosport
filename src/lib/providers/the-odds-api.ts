import type { MarketQuote, Sport, SportEvent } from "@/lib/domain/types";
import type { ProviderEnvelope } from "@/lib/ingestion/types";
import { canonicalSelectionKey } from "@/lib/canonical/id";

type OddsApiOutcome = {
  name: string;
  price: number;
  point?: number;
  description?: string;
};

type OddsApiMarket = {
  key: string;
  last_update?: string;
  outcomes: OddsApiOutcome[];
};

type OddsApiBookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
};

export type OddsApiEvent = {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
};

export interface OddsApiClientOptions {
  apiKey: string;
  regions?: string[];
  baseUrl?: string;
}

export class TheOddsApiClient {
  readonly id = "the-odds-api";
  private readonly apiKey: string;
  private readonly regions: string[];
  private readonly baseUrl: string;

  constructor(options: OddsApiClientOptions) {
    this.apiKey = options.apiKey;
    this.regions = options.regions ?? ["eu"];
    this.baseUrl = options.baseUrl ?? "https://api.the-odds-api.com/v4";
  }

  async getOdds(input: {
    sportKey: string;
    markets?: string[];
    eventId?: string;
  }): Promise<ProviderEnvelope<OddsApiEvent[]>> {
    const requestedAt = new Date();
    const markets = input.markets ?? ["h2h", "spreads", "totals"];
    const eventPath = input.eventId
      ? `/sports/${encodeURIComponent(input.sportKey)}/events/${encodeURIComponent(input.eventId)}/odds`
      : `/sports/${encodeURIComponent(input.sportKey)}/odds`;

    const url = new URL(`${this.baseUrl}${eventPath}`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("regions", this.regions.join(","));
    url.searchParams.set("markets", markets.join(","));
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const receivedAt = new Date();

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`The Odds API ${response.status}: ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as OddsApiEvent | OddsApiEvent[];
    const quotaRemainingRaw = response.headers.get("x-requests-remaining");
    const data = Array.isArray(json) ? json : [json];

    return {
      provider: this.id,
      requestedAt: requestedAt.toISOString(),
      receivedAt: receivedAt.toISOString(),
      latencyMs: receivedAt.getTime() - requestedAt.getTime(),
      quotaRemaining: quotaRemainingRaw == null ? undefined : Number(quotaRemainingRaw),
      data,
    };
  }

  normalizeEvent(event: OddsApiEvent, sport: Sport): SportEvent {
    return {
      id: event.id,
      sport,
      competition: event.sport_title ?? event.sport_key,
      startsAt: new Date(event.commence_time).toISOString(),
      status:
        new Date(event.commence_time).getTime() <= Date.now()
          ? "live"
          : "scheduled",
      home: { id: event.home_team, name: event.home_team },
      away: { id: event.away_team, name: event.away_team },
    };
  }

  normalizeQuotes(event: OddsApiEvent): MarketQuote[] {
    const quotes: MarketQuote[] = [];

    for (const bookmaker of event.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {
        for (const outcome of market.outcomes ?? []) {
          if (!Number.isFinite(outcome.price) || outcome.price <= 1) continue;

          const selectionLabel = outcome.description
            ? `${outcome.description} · ${outcome.name}`
            : outcome.name;

          quotes.push({
            eventId: event.id,
            marketId: `${event.sport_key}.${market.key}`,
            selection: {
              id: canonicalSelectionKey({
                label: outcome.name,
                line: outcome.point,
                participant: outcome.description,
              }),
              label: selectionLabel,
              line: outcome.point,
            },
            bookmaker: bookmaker.title || bookmaker.key,
            decimalOdds: outcome.price,
            capturedAt: market.last_update ?? bookmaker.last_update ?? new Date().toISOString(),
          });
        }
      }
    }

    return quotes;
  }
}
