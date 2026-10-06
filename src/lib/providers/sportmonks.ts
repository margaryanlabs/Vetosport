import type { MarketQuote, SportEvent } from "@/lib/domain/types";
import type { ProviderEnvelope } from "@/lib/ingestion/types";
import { canonicalSelectionKey } from "@/lib/canonical/id";

type SportmonksParticipant = {
  id: number;
  name: string;
  meta?: { location?: "home" | "away" };
};

type SportmonksFixture = {
  id: number;
  league_id?: number;
  state_id?: number;
  name: string;
  starting_at: string;
  participants?: SportmonksParticipant[];
};

type SportmonksInplayOdd = {
  id: number;
  fixture_id: number;
  market_id: number;
  bookmaker_id: number;
  label: string;
  value: string;
  name?: string;
  market_description?: string;
  probability?: string;
  total?: number | string | null;
  handicap?: number | string | null;
  suspended?: boolean;
  stopped?: boolean;
  latest_bookmaker_update?: string | null;
};

type Paged<T> = { data: T[]; pagination?: unknown };

export interface SportmonksOptions {
  apiToken: string;
  baseUrl?: string;
}

const isoFromSportmonks = (value: string) =>
  value.includes("T") ? new Date(value).toISOString() : new Date(value.replace(" ", "T") + "Z").toISOString();

export class SportmonksFootballClient {
  readonly id = "sportmonks-football";
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(options: SportmonksOptions) {
    this.apiToken = options.apiToken;
    this.baseUrl = options.baseUrl ?? "https://api.sportmonks.com/v3/football";
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<ProviderEnvelope<T>> {
    const requestedAt = new Date();
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("api_token", this.apiToken);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const receivedAt = new Date();

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sportmonks ${response.status}: ${body.slice(0, 300)}`);
    }

    return {
      provider: this.id,
      requestedAt: requestedAt.toISOString(),
      receivedAt: receivedAt.toISOString(),
      latencyMs: receivedAt.getTime() - requestedAt.getTime(),
      data: (await response.json()) as T,
    };
  }

  getFixturesByDate(date: string) {
    return this.request<Paged<SportmonksFixture>>(
      `/fixtures/date/${encodeURIComponent(date)}`,
      { include: "participants" },
    );
  }

  getFixturesBetween(startDate: string, endDate: string) {
    return this.request<Paged<SportmonksFixture>>(
      `/fixtures/between/${encodeURIComponent(startDate)}/${encodeURIComponent(endDate)}`,
      { include: "participants" },
    );
  }

  getInplayOdds(fixtureId: string | number) {
    return this.request<Paged<SportmonksInplayOdd>>(
      `/odds/inplay/fixtures/${encodeURIComponent(String(fixtureId))}`,
      { include: "market;bookmaker" },
    );
  }

  normalizeFixture(fixture: SportmonksFixture): SportEvent {
    const home =
      fixture.participants?.find((participant) => participant.meta?.location === "home") ??
      fixture.participants?.[0];
    const away =
      fixture.participants?.find((participant) => participant.meta?.location === "away") ??
      fixture.participants?.[1];

    return {
      id: String(fixture.id),
      sport: "football",
      competition: fixture.league_id ? `Sportmonks league ${fixture.league_id}` : "Football",
      startsAt: isoFromSportmonks(fixture.starting_at),
      status: fixture.state_id === 5 ? "finished" : "scheduled",
      home: home ? { id: String(home.id), name: home.name } : undefined,
      away: away ? { id: String(away.id), name: away.name } : undefined,
    };
  }

  normalizeInplayOdds(rows: SportmonksInplayOdd[]): MarketQuote[] {
    return rows.flatMap((row) => {
      const decimalOdds = Number(row.value);
      if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return [];

      const lineRaw = row.total ?? row.handicap;
      const line =
        lineRaw == null || lineRaw === ""
          ? undefined
          : Number.isFinite(Number(lineRaw))
            ? Number(lineRaw)
            : undefined;

      return [{
        eventId: String(row.fixture_id),
        marketId: `football.sportmonks-${row.market_id}`,
        selection: {
          id: canonicalSelectionKey({
            label: row.label,
            line,
            participant: row.name,
          }),
          label: row.name ? `${row.name} · ${row.label}` : row.label,
          line,
        },
        bookmaker: `sportmonks-bookmaker-${row.bookmaker_id}`,
        decimalOdds,
        capturedAt: row.latest_bookmaker_update
          ? isoFromSportmonks(row.latest_bookmaker_update)
          : new Date().toISOString(),
      }];
    });
  }
}
