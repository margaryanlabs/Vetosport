import type { LiveEventSummary } from "@/lib/live/types";

/** Research screening only. A matching snapshot is not an executable betting signal. */
export interface ResearchMatch {
  event: LiveEventSummary;
  minute: number;
  ageSeconds: number | null;
  freshness: "RECENT_SNAPSHOT" | "STALE_SNAPSHOT" | "TIME_UNVERIFIED";
  researchOnly: true;
  selectionToInspect: "Total Under 4.5";
  marketAvailabilityVerified: false;
  quoteVerified: false;
  independentEdgeVerified: false;
}

export function readFootballMinute(clock: string): number | null {
  if (typeof clock !== "string") return null;
  // Accept 80', 80′, 80:12, 90+3 and 90+3′, but never infer clock from "Q4".
  const match = clock.trim().match(/^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?(?=\s|:|['′’]|$)/);
  if (!match) return null;
  const base = Number(match[1]);
  const extra = Number(match[2] ?? 0);
  const minute = base + extra;
  return Number.isFinite(minute) && minute <= 130 ? minute : null;
}

export function screenHistoricalFootballCondition(
  event: LiveEventSummary,
  asOf: string,
): ResearchMatch | null {
  if (event.source !== "persisted" || event.sport !== "football" || event.status !== "live") return null;
  if (event.homeScore !== "1" || event.awayScore !== "1") return null;
  const minute = readFootballMinute(event.clock);
  if (minute === null || minute < 80 || minute > 105) return null;
  const nowMs = Date.parse(asOf);
  const updatedMs = event.lastUpdatedAt ? Date.parse(event.lastUpdatedAt) : NaN;
  const hasTimestamp = Number.isFinite(updatedMs) && Number.isFinite(nowMs) && updatedMs <= nowMs + 5_000;
  const ageSeconds = hasTimestamp ? Math.max(0, (nowMs - updatedMs) / 1000) : null;
  return {
    event,
    minute,
    ageSeconds,
    freshness: ageSeconds === null ? "TIME_UNVERIFIED" : ageSeconds <= 120 ? "RECENT_SNAPSHOT" : "STALE_SNAPSHOT",
    researchOnly: true,
    selectionToInspect: "Total Under 4.5",
    marketAvailabilityVerified: false,
    quoteVerified: false,
    independentEdgeVerified: false,
  };
}

export function screenPersistedResearchMatches(input: {
  mode: string;
  events: LiveEventSummary[];
  asOf: string;
}): ResearchMatch[] {
  // API has a sandbox fallback; never treat those examples as live opportunities.
  if (input.mode !== "persisted") return [];
  return input.events
    .map(event => screenHistoricalFootballCondition(event, input.asOf))
    .filter((item): item is ResearchMatch => item !== null)
    .sort((a, b) => (a.ageSeconds ?? Infinity) - (b.ageSeconds ?? Infinity))
    .slice(0, 12);
}

export function researchWatchlistSelfcheck() {
  const asOf = "2026-10-12T12:00:00.000Z";
  const base: LiveEventSummary = {
    id: "paper-test", source: "persisted", sport: "football", sportLabel: "Football",
    competition: "Synthetic internal test", status: "live", clock: "80:12",
    period: "2H", homeCode: "H", awayCode: "A", homeName: "Home", awayName: "Away",
    homeScore: "1", awayScore: "1", pulse: "quiet", markets: 0, repriced: 0,
    intelligenceReady: false, lastUpdatedAt: "2026-10-12T11:59:55.000Z",
  };
  const update = (patch: Partial<LiveEventSummary>) => ({ ...base, ...patch });
  const checks = [
    { name: "80th-minute persisted event is research-only", pass: screenHistoricalFootballCondition(base, asOf)?.researchOnly === true },
    { name: "79th minute is not a candidate", pass: screenHistoricalFootballCondition(update({clock:"79:30"}), asOf) === null },
    { name: "Other score excluded", pass: screenHistoricalFootballCondition(update({awayScore:"0"}), asOf) === null },
    { name: "Sandbox cannot become a candidate", pass: screenPersistedResearchMatches({mode:"sandbox-fallback",events:[base],asOf}).length === 0 },
    { name: "Sandbox-labeled event rejected in persisted mode", pass: screenHistoricalFootballCondition(update({source:"sandbox"}), asOf) === null },
    { name: "No event timestamp means unverified", pass: screenHistoricalFootballCondition(update({lastUpdatedAt:undefined}), asOf)?.freshness === "TIME_UNVERIFIED" },
    { name: "Stale event never appears fresh", pass: screenHistoricalFootballCondition(update({lastUpdatedAt:"2026-10-12T11:40:00Z"}), asOf)?.freshness === "STALE_SNAPSHOT" },
    { name: "Additional time parsed without fake minute", pass: readFootballMinute("90+5′") === 95 },
    { name: "No verified bookmaker quote or edge", pass: screenHistoricalFootballCondition(base, asOf)?.quoteVerified === false &&
      screenHistoricalFootballCondition(base, asOf)?.independentEdgeVerified === false },
  ];
  return {passed:checks.every(x => x.pass),checks};
}
