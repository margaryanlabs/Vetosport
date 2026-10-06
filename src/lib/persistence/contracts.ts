import type {
  DecisionLedgerEntry,
  Evidence,
  MarketQuote,
  SportEvent,
} from "@/lib/domain/types";

export interface PersistedEvent {
  id: string;
  canonicalKey: string;
  event: SportEvent;
}

export interface EventStateSnapshot {
  eventId: string;
  sourceProvider: string;
  capturedAt: string;
  sourceLatencyMs?: number;
  state: Record<string, unknown>;
  fingerprint?: string;
}

export interface PredictionRecord {
  eventId: string;
  featureSnapshotId: string;
  marketKey: string;
  selectionKey: string;
  fairProbability: number;
  fairOdds: number;
  modelAgreement: number;
  uncertainty: number;
  modelSignals: unknown[];
  capturedAt: string;
}

export interface ProviderHealthSample {
  providerId: string;
  status: "healthy" | "degraded" | "offline";
  checkedAt: string;
  latencyMs?: number;
  freshnessSeconds?: number;
  quotaRemaining?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface HistoricalImportRecord {
  provider: string;
  datasetKind: string;
  sport: string;
  competition?: string;
  fromAt?: string;
  toAt?: string;
  rowsImported: number;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface VetoPersistence {
  upsertEvent(event: SportEvent, canonicalKey: string, providerRef?: {
    provider: string;
    id: string;
  }): Promise<PersistedEvent>;

  findEventsAround(input: {
    sport: SportEvent["sport"];
    startsAt: string;
    toleranceMinutes?: number;
  }): Promise<PersistedEvent[]>;

  appendEventState(snapshot: EventStateSnapshot): Promise<void>;

  appendQuotes(eventId: string, quotes: MarketQuote[]): Promise<number>;

  appendEvidence(eventId: string, evidence: Evidence[]): Promise<number>;

  appendFeatureSnapshot(input: {
    eventId: string;
    version: string;
    features: Record<string, unknown>;
    capturedAt: string;
  }): Promise<string>;

  appendPrediction(input: PredictionRecord): Promise<string>;

  appendDecision(entry: DecisionLedgerEntry & {
    predictionSnapshotId: string;
    decisionMode: string;
    immutableFingerprint: string;
  }): Promise<void>;

  appendProviderHealth(sample: ProviderHealthSample): Promise<void>;

  recordHistoricalImport(record: HistoricalImportRecord): Promise<void>;
}
