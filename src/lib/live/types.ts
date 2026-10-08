import type { Decision, EventStatus, Sport } from "@/lib/domain/types";

export interface LivePrimarySignal {
  selectionId: string;
  label: string;
  marketKey: string;
  decision: Decision;
  fairProbability: number;
  marketOdds: number;
  edge: number;
  score: number;
  capturedAt: string;
}

export interface LiveEventSummary {
  id: string;
  source: "persisted" | "sandbox";
  sport: Sport;
  sportLabel: string;
  competition: string;
  status: EventStatus;
  startsAt?: string;
  clock: string;
  period: string;
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
  pulse: "hot" | "stable" | "quiet";
  markets: number;
  repriced: number;
  intelligenceReady: boolean;
  lastUpdatedAt?: string;
  primarySignal?: LivePrimarySignal;
}

export interface LiveQuotePreview {
  provider: string;
  bookmaker: string;
  marketKey: string;
  selectionKey: string;
  selectionLabel: string;
  decimalOdds: number;
  capturedAt: string;
  suspended?: boolean;
}

export interface LiveObservation {
  summary: LiveEventSummary;
  stateSource?: string;
  stateCapturedAt?: string;
  stateLatencyMs?: number;
  state: Record<string, unknown>;
  quotes: LiveQuotePreview[];
  quoteCount: number;
  decisionCount: number;
  latestDecision?: LivePrimarySignal;
}
