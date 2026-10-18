import type { MarketQuote, SportEvent } from "@/lib/domain/types";
import type { ProviderEnvelope } from "@/lib/ingestion/types";
import { canonicalSelectionKey } from "@/lib/canonical/id";

type SportmonksParticipant = {
  id: number;
  name: string;
  meta?: { location?: "home" | "away" };
};

type SportmonksState = {
  id: number;
  state: string;
  name: string;
  short_name?: string;
  developer_name?: string;
};

type SportmonksScore = {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  description?: string;
  score?: {
    goals?: number;
    participant?: "home" | "away";
  };
};

type SportmonksPeriod={
  id?:number;fixture_id?:number;started?:number;ended?:number|null;
  counts_from?:number;sort_order?:number;ticking?:boolean;
  minutes?:number;seconds?:number;has_timer?:boolean;
};
type SportmonksFixture = {
  periods?:SportmonksPeriod[];
  id: number;
  league_id?: number;
  state_id?: number;
  name: string;
  starting_at: string;
  participants?: SportmonksParticipant[];
  state?: SportmonksState;
  scores?: SportmonksScore[];
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

type Pagination = {
  count?: number;
  per_page?: number;
  current_page?: number;
  next_page?: string | null;
  has_more?: boolean;
};

type Paged<T> = { data: T[]; pagination?: Pagination };

export interface SportmonksOptions {
  apiToken: string;
  baseUrl?: string;
}

const isoFromSportmonks = (value: string) =>
  value.includes("T")
    ? new Date(value).toISOString()
    : new Date(value.replace(" ", "T") + "Z").toISOString();

const liveStateIds = new Set([2, 3, 4, 6, 7, 22]);
const finishedStateIds = new Set([5, 8]);
const suspendedStateIds = new Set([12, 15, 16, 17, 18]);

const normalizeStatus = (fixture: SportmonksFixture): SportEvent["status"] => {
  const stateId = fixture.state?.id ?? fixture.state_id;
  if (stateId != null && finishedStateIds.has(stateId)) return "finished";
  if (stateId != null && suspendedStateIds.has(stateId)) return "suspended";
  if (stateId != null && liveStateIds.has(stateId)) return "live";
  return "scheduled";
};

export class SportmonksFootballClient {
  readonly id = "sportmonks-football";
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(options: SportmonksOptions) {
    this.apiToken = options.apiToken;
    this.baseUrl = options.baseUrl ?? "https://api.sportmonks.com/v3/football";
  }

  private async request<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<ProviderEnvelope<T>> {
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
      // Never echo provider response or query-token in user-facing errors.
      // Provider restrictions are meaningful to the operator but may contain
      // account identifiers or API tokens.
      throw new Error(response.status===401?"SPORTMONKS_AUTH":
       response.status===403?"SPORTMONKS_SUBSCRIPTION":
       response.status===429?"SPORTMONKS_QUOTA":"SPORTMONKS_UPSTREAM");
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
      { include: "participants;state" },
    );
  }

  getFixturesBetween(
    startDate: string,
    endDate: string,
    page = 1,
    perPage = 50,
  ) {
    return this.request<Paged<SportmonksFixture>>(
      `/fixtures/between/${encodeURIComponent(startDate)}/${encodeURIComponent(endDate)}`,
      {
        include: "participants;state;scores",
        page: String(page),
        per_page: String(Math.min(50, Math.max(1, perPage))),
      },
    );
  }

  async getAllFixturesBetween(
    startDate: string,
    endDate: string,
    maxPages = 20,
  ): Promise<ProviderEnvelope<SportmonksFixture[]>> {
    const startedAt = new Date();
    const fixtures: SportmonksFixture[] = [];
    let page = 1;
    let latencyMs = 0;

    while (page <= maxPages) {
      const response = await this.getFixturesBetween(startDate, endDate, page, 50);
      latencyMs += response.latencyMs;
      fixtures.push(...response.data.data);

      if (!response.data.pagination?.has_more) break;
      page += 1;
    }

    return {
      provider: this.id,
      requestedAt: startedAt.toISOString(),
      receivedAt: new Date().toISOString(),
      latencyMs,
      data: fixtures,
    };
  }

  /** Every 5-minute cron must poll the FULL live-score window.
   * /fixtures/latest and /livescores/latest ONLY return a 10-second update
   * window; sampling those every 5 minutes misses most actual games.
   * /livescores retains in-play games and 15 minutes of completed fixtures. */
  getActiveLivescores(){
    return this.request<Paged<SportmonksFixture>>(
      "/livescores",{include:"participants;state;scores;periods"},
    );
  }
  getLatestUpdatedFixtures() {
    return this.request<Paged<SportmonksFixture>>(
      "/fixtures/latest",
      { include: "participants;state;scores;periods" },
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
      competition: fixture.league_id
        ? `Sportmonks league ${fixture.league_id}`
        : "Football",
      startsAt: isoFromSportmonks(fixture.starting_at),
      status: normalizeStatus(fixture),
      home: home ? { id: String(home.id), name: home.name } : undefined,
      away: away ? { id: String(away.id), name: away.name } : undefined,
    };
  }

  extractFinalScore(fixture: SportmonksFixture) {
    const scores = fixture.scores ?? [];
    const preferred = scores.filter((row) =>
      ["CURRENT", "FULLTIME", "FULL_TIME"].includes(
        (row.description ?? "").toUpperCase(),
      ),
    );
    const source = preferred.length > 0 ? preferred : scores;

    const latestBySide = new Map<"home" | "away", number>();
    for (const row of source) {
      const side = row.score?.participant;
      const goals = row.score?.goals;
      if (
        (side === "home" || side === "away") &&
        typeof goals === "number" &&
        Number.isFinite(goals)
      ) {
        latestBySide.set(
          side,
          Math.max(latestBySide.get(side) ?? 0, goals),
        );
      }
    }

    const home = latestBySide.get("home");
    const away = latestBySide.get("away");
    return home == null || away == null ? null : { home, away };
  }

  /** Reject aggregated HALF-time / extra-time score instead of guessing
   * CURRENT = full score. The score side is checked against the same two
   * fixture-specific participants; duplicates fail closed. */
  extractVerifiedCurrentScore(raw:SportmonksFixture):{home:number;away:number}|null{
    const home=raw.participants?.filter(p=>p.meta?.location==="home")??[];
    const away=raw.participants?.filter(p=>p.meta?.location==="away")??[];
    if(home.length!==1||away.length!==1||home[0].id===away[0].id)return null;
    const list=(raw.scores??[]).filter(s=>s.fixture_id===raw.id&&
      s.description?.toUpperCase()==="CURRENT");
    const h=list.filter(s=>s.score?.participant==="home"&&s.participant_id===home[0].id);
    const a=list.filter(s=>s.score?.participant==="away"&&s.participant_id===away[0].id);
    if(h.length!==1||a.length!==1||list.length!==2)return null;
    const goals=[h[0].score?.goals,a[0].score?.goals];
    if(!goals.every(v=>Number.isInteger(v)&&typeof v==="number"&&v>=0&&v<=12))
      return null;
    return {home:goals[0] as number,away:goals[1] as number};
  }
  /** Official Sportmonks period counters are cumulative minutes. For model
   * inference demand a ticking regular period, not fixture kickoff elapsed
   * wall-clock, a break, injury time, or extra-time phase. */
  extractVerifiedLiveClock(raw:SportmonksFixture):
   {period:"1H"|"2H";minute:number}|null{
    const code=raw.state?.id??raw.state_id;
    const expected=code===2?{period:"1H" as const,order:1,from:0}:
      code===6?{period:"2H" as const,order:2,from:45}:null;
    if(!expected)return null;
    const active=(raw.periods??[]).filter(p=>p.ticking===true&&
      p.fixture_id===raw.id&&p.sort_order===expected.order&&
      p.counts_from===expected.from);
    if(active.length!==1)return null;
    const {minutes,seconds}=active[0];
    if(!Number.isInteger(minutes)||minutes===undefined||minutes<0||minutes>89||
      expected.period==="1H"&&minutes>=45||
      expected.period==="2H"&&minutes<45||
      seconds!==undefined&&(!Number.isInteger(seconds)||seconds<0||seconds>59))
      return null;
    return{period:expected.period,minute:minutes};
  }
  getLiveState(raw:SportmonksFixture):{score:{home:number;away:number};
   period:"1H"|"2H";minute:number}|null{
    const score=this.extractVerifiedCurrentScore(raw);
    const clock=this.extractVerifiedLiveClock(raw);
    return score&&clock?{score,...clock}:null;
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
        sourceProvider: this.id,
        providerLastUpdate: row.latest_bookmaker_update
          ? isoFromSportmonks(row.latest_bookmaker_update)
          : undefined,
        suspended: Boolean(row.suspended || row.stopped),
        raw: {
          providerQuoteId: row.id,
          providerMarketId: row.market_id,
          providerBookmakerId: row.bookmaker_id,
          providerFixtureId: row.fixture_id,
          providerProbability: row.probability,
          providerTotal: row.total,
          providerHandicap: row.handicap,
          stopped: row.stopped,
        },
      }];
    });
  }
}
