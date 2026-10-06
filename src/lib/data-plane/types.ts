export type JournalStream =
  | "EVENT_STATE"
  | "MARKET_QUOTE"
  | "EVIDENCE"
  | "RULEBOOK"
  | "PROVIDER_HEALTH";

export interface DataPlaneJournalInput<T = unknown> {
  eventId?: string;
  sourceProvider: string;
  sourceRecordId: string;
  stream: JournalStream;
  schemaVersion: string;
  eventOccurredAt: string;
  sourceEmittedAt: string;
  gatewayReceivedAt: string;
  normalizedAt: string;
  knowledgeAvailableAt?: string;
  acquisitionMode?: "LIVE" | "HISTORICAL_BACKFILL";
  sourceClockOffsetMs?: number;
  sourceTimeUncertaintyMs?: number;
  lateArrival?: boolean;
  correctionOf?: string;
  semanticKey?: string;
  providerSequence?: string;
  payload: T;
}

export interface PreparedJournalRecord<T = unknown>
  extends Omit<
    DataPlaneJournalInput<T>,
    "knowledgeAvailableAt" | "acquisitionMode"
  > {
  knowledgeAvailableAt: string;
  acquisitionMode: "LIVE" | "HISTORICAL_BACKFILL";
  dedupeKey: string;
  payloadHash: string;
  recordHash: string;
}

export interface PersistedJournalRecord<T = unknown>
  extends PreparedJournalRecord<T> {
  id: string;
  committedAt: string;
}

export interface ProviderRulebookVersion {
  providerId: string;
  versionId: string;
  sport?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  capturedAt: string;
  sourceRef?: string;
  contentHash: string;
  rules: Record<string, unknown>;
}

export interface DataPlaneReplayQuery {
  eventId: string;
  asOf: string;
  streams?: JournalStream[];
  limit?: number;
}

export interface DataPlaneReplay<T = unknown> {
  eventId: string;
  asOf: string;
  visible: PersistedJournalRecord<T>[];
  active: PersistedJournalRecord<T>[];
  excludedFutureCount: number;
  appliedCorrections: Array<{
    correctionId: string;
    replacesId: string;
  }>;
  lookaheadSafe: boolean;
}

export interface DataPlaneRuntimeStatus {
  persistenceConfigured: boolean;
  sportmonksConfigured: boolean;
  oddsConfigured: boolean;
  ingestionSecretConfigured: boolean;
  mode: "OFFLINE" | "STORAGE_ONLY" | "PARTIAL_FEEDS" | "LIVE_READY";
  blockers: string[];
}
