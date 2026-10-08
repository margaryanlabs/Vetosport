import type {
  DecisionLedgerEntry,
  Evidence,
  MarketQuote,
  MarketSelection,
  SportEvent,
} from "@/lib/domain/types";
import type {
  DataPlaneReplayQuery,
  PersistedJournalRecord,
  PreparedJournalRecord,
  ProviderRulebookVersion,
} from "@/lib/data-plane/types";

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

export interface UnsettledDecision {
  decisionId: string;
  eventId: string;
  sport: SportEvent["sport"];
  marketKey: string;
  selectionKey: string;
  selectionLine?: number;
  selectionSide?: MarketSelection["side"];
  capturedAt: string;
  marketOdds: number;
  fairProbability: number;
}

export interface DecisionHistoryRecord {
  id: string;
  eventId: string;
  marketKey: string;
  selectionKey: string;
  decision: DecisionLedgerEntry["decision"];
  decisionMode: string;
  marketOdds: number;
  fairProbability: number;
  opportunityScore: number;
  capturedAt: string;
  immutableFingerprint: string;
  modelVersionSet: string[];
}

export interface DecisionOutcomeRecord {
  decisionId: string;
  result: "win" | "half_win" | "push" | "half_loss" | "loss" | "void";
  closingOdds?: number;
  settledAt: string;
  rawOutcome?: Record<string, unknown>;
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

  findUnsettledDecisions(eventId: string): Promise<UnsettledDecision[]>;

  listDecisionHistory(input: {
    eventId: string;
    marketKey?: string;
    selectionKey?: string;
    limit?: number;
  }): Promise<DecisionHistoryRecord[]>;

  appendDecisionOutcome(outcome: DecisionOutcomeRecord): Promise<void>;

  appendTruthJournal(
    records: PreparedJournalRecord[],
  ): Promise<number>;

  listTruthAsOf(
    input: DataPlaneReplayQuery,
  ): Promise<PersistedJournalRecord[]>;

  appendRulebookVersion(
    version: ProviderRulebookVersion,
  ): Promise<void>;

  findRulebookVersionAt(input: {
    providerId: string;
    sport?: string;
    asOf: string;
  }): Promise<ProviderRulebookVersion | null>;
}
