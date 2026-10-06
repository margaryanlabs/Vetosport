export interface TruthJournalRecord<T = unknown> {
  id: string;
  source: string;
  sourceEventId: string;
  sequence: number;
  eventType: string;
  eventOccurredAtMs: number;
  sourceEmittedAtMs: number;
  gatewayReceivedAtMs: number;
  normalizedAtMs: number;
  stateCommittedAtMs: number;
  sourceClockOffsetMs: number;
  sourceTimeUncertaintyMs: number;
  lateArrival: boolean;
  correctionOf?: string;
  payload: T;
}

export interface TruthRecordValidation {
  recordId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  pipelineLatencyMs: number;
  receiveLatencyMs: number;
  normalizationLatencyMs: number;
  commitLatencyMs: number;
  correctedEventOccurredAtMs: number;
}

export interface PointInTimeTruth<T = unknown> {
  asOfMs: number;
  visibleRecords: TruthJournalRecord<T>[];
  activeRecords: TruthJournalRecord<T>[];
  excludedFutureRecords: string[];
  appliedCorrections: Array<{
    correctionId: string;
    replacesId: string;
  }>;
  watermarkMs: number | null;
}

export interface TruthPlaneHealth {
  score: number;
  validRecordRate: number;
  clockConfidence: number;
  freshnessConfidence: number;
  correctionIntegrity: number;
  lookaheadSafe: boolean;
  warnings: string[];
}
