import type { MarketQuote, SportEvent } from "@/lib/domain/types";

export interface ProviderEnvelope<T> {
  provider: string;
  requestedAt: string;
  receivedAt: string;
  latencyMs: number;
  quotaRemaining?: number;
  data: T;
}

export interface NormalizedEventBatch {
  events: SportEvent[];
  providerRefs: Record<string, string>;
}

export interface NormalizedQuoteBatch {
  quotes: MarketQuote[];
  sourceEventId: string;
  sportKey: string;
}

export interface IngestionRunSummary {
  provider: string;
  startedAt: string;
  finishedAt: string;
  eventsSeen: number;
  quotesSeen: number;
  warnings: string[];
}
