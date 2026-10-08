import type {
  DecisionHistoryRecord,
  PersistedEvent,
  PersistedEventStateRecord,
  PersistedMarketQuoteRecord,
} from "@/lib/persistence/contracts";
import type { LiveEventSummary, LivePrimarySignal } from "@/lib/live/types";

export const isSelfcheckEvent = (event: PersistedEvent) =>
  event.canonicalKey === "veto-sport-storage-selfcheck" ||
  event.event.competition === "VETO Storage Selfcheck";

const codeFor = (name: string | undefined, fallback: string) => {
  if (!name) return fallback;
  const words = name.trim().split(/\s+/).filter(Boolean);
  const code =
    words.length >= 2
      ? words.map((word) => word[0]).join("")
      : name.replace(/[^a-z0-9]/gi, "");
  return code.slice(0, 3).toUpperCase() || fallback;
};

const objectValue = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const printable = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : typeof value === "string" && value.trim()
      ? value.trim()
      : "—";

export const latestByEvent = <T extends { eventId: string }>(rows: T[]) => {
  const map = new Map<string, T>();
  for (const row of rows) if (!map.has(row.eventId)) map.set(row.eventId, row);
  return map;
};

export const signalFromDecision = (
  decision: DecisionHistoryRecord | undefined,
  quotes: PersistedMarketQuoteRecord[],
): LivePrimarySignal | undefined => {
  if (!decision) return undefined;
  const quote = quotes.find(
    (item) =>
      item.eventId === decision.eventId &&
      item.marketKey === decision.marketKey &&
      item.selectionKey === decision.selectionKey,
  );
  const implied = decision.marketOdds > 1 ? 1 / decision.marketOdds : 0;
  return {
    selectionId: decision.selectionKey,
    label: quote?.selectionLabel ?? decision.selectionKey,
    marketKey: decision.marketKey,
    decision: decision.decision,
    fairProbability: decision.fairProbability,
    marketOdds: decision.marketOdds,
    edge: decision.fairProbability - implied,
    score: decision.opportunityScore,
    capturedAt: decision.capturedAt,
  };
};

export const buildPersistedSummary = (input: {
  event: PersistedEvent;
  state?: PersistedEventStateRecord;
  quotes: PersistedMarketQuoteRecord[];
  decision?: DecisionHistoryRecord;
}): LiveEventSummary => {
  const eventQuotes = input.quotes.filter(
    (quote) => quote.eventId === input.event.id,
  );
  const state = input.state?.state ?? {};
  const score = objectValue(state.score);
  const clock = objectValue(state.clock);
  const lastUpdatedAt =
    input.decision?.capturedAt ??
    input.state?.capturedAt ??
    eventQuotes[0]?.capturedAt ??
    input.event.event.startsAt;
  const age = Math.max(0, (Date.now() - new Date(lastUpdatedAt).getTime()) / 1000);

  const displayClock =
    typeof state.clock === "string"
      ? state.clock
      : typeof state.elapsed === "string"
        ? state.elapsed
        : typeof clock?.display === "string"
          ? clock.display
          : input.event.event.status === "live"
            ? "LIVE"
            : input.event.event.status === "finished"
              ? "FT"
              : input.event.event.status === "suspended"
                ? "SUSP"
                : new Date(input.event.event.startsAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  });

  const period =
    typeof state.period === "string"
      ? state.period.toUpperCase()
      : typeof clock?.period === "string"
        ? clock.period.toUpperCase()
        : input.event.event.status.toUpperCase();

  return {
    id: input.event.id,
    source: "persisted",
    sport: input.event.event.sport,
    sportLabel: input.event.event.sport.toUpperCase(),
    competition: input.event.event.competition,
    status: input.event.event.status,
    startsAt: input.event.event.startsAt,
    clock: displayClock,
    period,
    homeCode: codeFor(input.event.event.home?.name, "HOME"),
    awayCode: codeFor(input.event.event.away?.name, "AWAY"),
    homeName: input.event.event.home?.name ?? "Home",
    awayName: input.event.event.away?.name ?? "Away",
    homeScore: printable(score?.home),
    awayScore: printable(score?.away),
    pulse:
      input.event.event.status === "live"
        ? age <= 60
          ? "hot"
          : "stable"
        : "quiet",
    markets: new Set(eventQuotes.map((quote) => quote.marketKey)).size,
    repriced: 0,
    intelligenceReady: Boolean(input.decision),
    lastUpdatedAt,
    primarySignal: signalFromDecision(input.decision, eventQuotes),
  };
};
