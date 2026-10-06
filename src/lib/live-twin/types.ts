import type { SportEvent } from "@/lib/domain/types";

export type LiveDeltaKind =
  | "score"
  | "clock"
  | "period"
  | "card"
  | "substitution"
  | "injury"
  | "stat"
  | "lineup"
  | "odds"
  | "state";

export interface LiveDelta {
  id: string;
  eventId: string;
  kind: LiveDeltaKind;
  capturedAt: string;
  source: string;
  payload: Record<string, unknown>;
  materiality: number;
}

export interface LiveTwinState {
  event: SportEvent;
  version: number;
  capturedAt: string;
  lastDeltaAt?: string;
  features: Record<string, number | string | boolean | null>;
  recentDeltaIds: string[];
}

export interface LiveTwinRepriceRequest {
  state: LiveTwinState;
  deltas: LiveDelta[];
  affectedMarketIds?: string[];
}

export interface LiveTwinExplanation {
  headline: string;
  summary: string;
  drivers: Array<{
    label: string;
    impact: string;
    confidence: number;
  }>;
}
