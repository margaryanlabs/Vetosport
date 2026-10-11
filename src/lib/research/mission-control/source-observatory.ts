import type { PersistedEvent, PersistedMarketQuoteRecord } from "@/lib/persistence/contracts";

/**
 * A timestamped, bounded read of existing VETO Sport storage.
 * This never requests a bookmaker, authenticates a quote, executes a wager,
 * or infers model probability from an offered price.
 */
export type SourceQuoteStatus =
  | "RECENT_PROVIDER_TIMESTAMP"
  | "SUSPENSION_UNKNOWN"
  | "SUSPENDED"
  | "STALE"
  | "NO_PROVIDER_TIMESTAMP"
  | "CLOCK_INCONSISTENT"
  | "INVALID_QUOTE";

export interface SourceQuoteRow {
  eventId: string;
  eventLabel: string;
  sport: string;
  eventState: string;
  bookmaker: string;
  provider: string;
  marketKey: string;
  selectionKey: string;
  selectionLabel: string;
  line: number | null;
  decimalOdds: number;
  capturedAt: string;
  providerLastUpdate: string | null;
  providerAgeSeconds: number | null;
  status: SourceQuoteStatus;
  bookmakerAcceptanceVerified: false;
  executedBet: false;
  validForProfitabilityClaims: false;
}

export interface SourceObservatoryReport {
  model: "veto.zero-s.source-observatory.v1";
  generatedAt: string;
  mode: "NOT_CONFIGURED" | "PERSISTED_UNATTESTED" | "READ_UNAVAILABLE";
  eventCount: number;
  storedQuoteSnapshots: number;
  uniqueContracts: number;
  recentProviderTimestampCount: number;
  suspendedCount: number;
  missingProviderTimestampCount: number;
  staleOrInvalidCount: number;
  lastProviderAt: string | null;
  pricePublicationEnabled: boolean;
  displayedQuotes: SourceQuoteRow[];
  bookmakerAcceptanceVerified: false;
  independentlyCalibratedEdge: false;
  noProviderQuotaSpent: true;
  message: string;
}

const RECENT_SECONDS = 60;
const CLOCK_TOLERANCE_SECONDS = 5;
const MAX_DISPLAY = 25;
const MAX_INPUT = 800;

function asMillis(s: string | undefined | null): number | null {
  if (!s || typeof s !== "string") return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

const isValidPrice = (price: number) =>
  typeof price === "number" && Number.isFinite(price) && price > 1 && price <= 1000;

function classify(
  quote: PersistedMarketQuoteRecord,
  nowMs: number,
): { status: SourceQuoteStatus; age: number | null } {
  if (!isValidPrice(quote.decimalOdds)) return { status: "INVALID_QUOTE", age: null };
  const capturedMs = asMillis(quote.capturedAt);
  const sourceMs = asMillis(quote.providerLastUpdate);
  if (capturedMs === null || capturedMs > nowMs + CLOCK_TOLERANCE_SECONDS * 1000)
    return { status: "CLOCK_INCONSISTENT", age: null };
  if (sourceMs === null) return { status: "NO_PROVIDER_TIMESTAMP", age: null };

  const age = Math.max(0, (nowMs - sourceMs) / 1000);
  if (
    sourceMs > nowMs + CLOCK_TOLERANCE_SECONDS * 1000 ||
    sourceMs > capturedMs + CLOCK_TOLERANCE_SECONDS * 1000
  ) return { status: "CLOCK_INCONSISTENT", age: null };
  if (age > RECENT_SECONDS || nowMs - capturedMs > RECENT_SECONDS * 1000)
    return { status: "STALE", age };
  if (quote.suspended === true) return { status: "SUSPENDED", age };
  if (quote.suspended !== false) return { status: "SUSPENSION_UNKNOWN", age };
  // Even this status NEVER confirms sportsbook acceptance, limits or execution.
  return { status: "RECENT_PROVIDER_TIMESTAMP", age };
}

export function emptySourceReport(
  now: string,
  mode: "NOT_CONFIGURED" | "READ_UNAVAILABLE",
): SourceObservatoryReport {
  return {
    model: "veto.zero-s.source-observatory.v1",
    generatedAt: now,
    mode,
    eventCount: 0,
    storedQuoteSnapshots: 0,
    uniqueContracts: 0,
    recentProviderTimestampCount: 0,
    suspendedCount: 0,
    missingProviderTimestampCount: 0,
    staleOrInvalidCount: 0,
    lastProviderAt: null,
    pricePublicationEnabled: false,
    displayedQuotes: [],
    bookmakerAcceptanceVerified: false,
    independentlyCalibratedEdge: false,
    noProviderQuotaSpent: true,
    message: mode === "NOT_CONFIGURED"
      ? "Storage is not configured. No live odds or acceptance is verified."
      : "Stored quote evidence could not be read. Never substitute example odds.",
  };
}

export function analyzeStoredQuotes(input: {
  events: PersistedEvent[];
  quotes: PersistedMarketQuoteRecord[];
  now: string;
  allowPublicPriceDisplay: boolean;
}): SourceObservatoryReport {
  const { events, quotes, now, allowPublicPriceDisplay } = input;
  const nowMs = asMillis(now);
  if (nowMs === null) throw new Error("Invalid source-observatory clock");
  const eventsById = new Map(events.map(e => [e.id, e.event]));
  const newestFirst = quotes.slice(0, MAX_INPUT).sort((a, b) =>
    (asMillis(b.capturedAt) ?? -Infinity) - (asMillis(a.capturedAt) ?? -Infinity),
  );
  const unique = new Map<string, SourceQuoteRow>();
  let latestProviderMs = -Infinity;
  for (const q of newestFirst) {
    const event = eventsById.get(q.eventId);
    if (!event) continue;
    const key = [q.eventId, q.provider, q.bookmaker, q.marketKey, q.selectionKey, q.line ?? ""].join("\u001f");
    if (unique.has(key)) continue;
    const { status, age } = classify(q, nowMs);
    const providerMs = asMillis(q.providerLastUpdate);
    if (providerMs !== null && providerMs <= nowMs + CLOCK_TOLERANCE_SECONDS * 1000)
      latestProviderMs = Math.max(latestProviderMs, providerMs);
    unique.set(key, {
      eventId: q.eventId,
      eventLabel: [event.home?.name, event.away?.name].filter(Boolean).join(" — ") || event.competition,
      sport: event.sport,
      eventState: event.status,
      bookmaker: q.bookmaker,
      provider: q.provider,
      marketKey: q.marketKey,
      selectionKey: q.selectionKey,
      selectionLabel: q.selectionLabel,
      line: q.line ?? null,
      decimalOdds: q.decimalOdds,
      capturedAt: q.capturedAt,
      providerLastUpdate: q.providerLastUpdate ?? null,
      providerAgeSeconds: age,
      status,
      bookmakerAcceptanceVerified: false,
      executedBet: false,
      validForProfitabilityClaims: false,
    });
  }
  const rows = Array.from(unique.values());
  return {
    model: "veto.zero-s.source-observatory.v1",
    generatedAt: now,
    mode: "PERSISTED_UNATTESTED",
    eventCount: events.length,
    storedQuoteSnapshots: quotes.length,
    uniqueContracts: rows.length,
    recentProviderTimestampCount: rows.filter(r => r.status === "RECENT_PROVIDER_TIMESTAMP" || r.status === "SUSPENSION_UNKNOWN").length,
    suspendedCount: rows.filter(r => r.status === "SUSPENDED").length,
    missingProviderTimestampCount: rows.filter(r => r.status === "NO_PROVIDER_TIMESTAMP").length,
    staleOrInvalidCount: rows.filter(r => ["STALE", "CLOCK_INCONSISTENT", "INVALID_QUOTE"].includes(r.status)).length,
    lastProviderAt: Number.isFinite(latestProviderMs) ? new Date(latestProviderMs).toISOString() : null,
    pricePublicationEnabled: allowPublicPriceDisplay,
    displayedQuotes: allowPublicPriceDisplay ? rows.slice(0, MAX_DISPLAY) : [],
    bookmakerAcceptanceVerified: false,
    independentlyCalibratedEdge: false,
    noProviderQuotaSpent: true,
    message: allowPublicPriceDisplay
      ? "Stored prices are timestamped research snapshots. Provider authenticity, suspension and bet acceptance are not independently attested."
      : "Public odds redistribution is disabled until data rights are confirmed. Only source-health aggregates are shown.",
  };
}

export function runSourceObservatorySelfcheck() {
  const now = "2026-10-12T00:00:00.000Z";
  const events: PersistedEvent[] = [{
    id: "event-1", canonicalKey: "test", event: {
      id: "event-1", sport: "football", competition: "Test", startsAt: "2026-10-11T23:00:00Z", status: "live",
      home: { id: "home", name: "Home" }, away: { id: "away", name: "Away" },
    },
  }];
  const base: PersistedMarketQuoteRecord = {
    eventId: "event-1", provider: "test", bookmaker: "test", marketKey: "totals",
    selectionKey: "under", selectionLabel: "Under", line: 4.5, decimalOdds: 1.05,
    capturedAt: "2026-10-11T23:59:55Z", providerLastUpdate: "2026-10-11T23:59:50Z", suspended: false,
  };
  const q = (changes: Partial<PersistedMarketQuoteRecord>) => ({ ...base, ...changes });
  const checks = [
    { name: "Fresh timestamp does not imply execution", pass: classify(base, Date.parse(now)).status === "RECENT_PROVIDER_TIMESTAMP" },
    { name: "Absent source time is unverified", pass: classify(q({ providerLastUpdate: undefined }), Date.parse(now)).status === "NO_PROVIDER_TIMESTAMP" },
    { name: "Expired provider timestamp is stale", pass: classify(q({ providerLastUpdate: "2026-10-11T23:50:00Z" }), Date.parse(now)).status === "STALE" },
    { name: "Unspecified suspension fails closed", pass: classify(q({ suspended: undefined }), Date.parse(now)).status === "SUSPENSION_UNKNOWN" },
    { name: "Suspension overrides recent price", pass: classify(q({ suspended: true }), Date.parse(now)).status === "SUSPENDED" },
    { name: "Future timestamp is invalid", pass: classify(q({ providerLastUpdate: "2026-10-12T00:01:00Z" }), Date.parse(now)).status === "CLOCK_INCONSISTENT" },
    { name: "Public unlicensed prices are suppressed", pass: analyzeStoredQuotes({ events, quotes: [base], now, allowPublicPriceDisplay: false }).displayedQuotes.length === 0 },
    { name: "Duplicate snapshots count once", pass: analyzeStoredQuotes({ events, quotes: [base, q({ capturedAt: "2026-10-11T23:59:50Z" })], now, allowPublicPriceDisplay: true }).uniqueContracts === 1 },
    { name: "Displayed snapshots never claim accepted bets", pass: analyzeStoredQuotes({ events, quotes: [base], now, allowPublicPriceDisplay: true }).displayedQuotes[0]?.bookmakerAcceptanceVerified === false },
  ];
  return { passed: checks.every(c => c.pass), checks };
}
