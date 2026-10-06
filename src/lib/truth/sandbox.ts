import type { TruthJournalRecord } from "@/lib/truth/types";
import {
  buildPointInTimeTruth,
  evaluateTruthPlaneHealth,
} from "@/lib/truth/engine";

export interface SandboxTruthPayload {
  label: string;
  value: string | number;
}

export const sandboxTruthJournal: TruthJournalRecord<SandboxTruthPayload>[] = [
  {
    id: "evt-001",
    source: "SPORT-FEED-A",
    sourceEventId: "a-1001",
    sequence: 1001,
    eventType: "MATCH_CLOCK",
    eventOccurredAtMs: 1000,
    sourceEmittedAtMs: 1110,
    gatewayReceivedAtMs: 1320,
    normalizedAtMs: 1370,
    stateCommittedAtMs: 1410,
    sourceClockOffsetMs: 40,
    sourceTimeUncertaintyMs: 120,
    lateArrival: false,
    payload: { label: "clock", value: "63:58" },
  },
  {
    id: "evt-002",
    source: "SPORT-FEED-A",
    sourceEventId: "a-1002",
    sequence: 1002,
    eventType: "TEMPO_STATE",
    eventOccurredAtMs: 2200,
    sourceEmittedAtMs: 2310,
    gatewayReceivedAtMs: 2480,
    normalizedAtMs: 2530,
    stateCommittedAtMs: 2580,
    sourceClockOffsetMs: 40,
    sourceTimeUncertaintyMs: 120,
    lateArrival: false,
    payload: { label: "tempo", value: 74 },
  },
  {
    id: "evt-003",
    source: "ODDS-FEED-A",
    sourceEventId: "o-7781",
    sequence: 7781,
    eventType: "MARKET_QUOTE",
    eventOccurredAtMs: 2700,
    sourceEmittedAtMs: 2780,
    gatewayReceivedAtMs: 2940,
    normalizedAtMs: 2990,
    stateCommittedAtMs: 3020,
    sourceClockOffsetMs: -20,
    sourceTimeUncertaintyMs: 90,
    lateArrival: false,
    payload: { label: "U3.5", value: 1.47 },
  },
  {
    id: "evt-002-c1",
    source: "SPORT-FEED-A",
    sourceEventId: "a-1002-correction",
    sequence: 1010,
    eventType: "TEMPO_STATE_CORRECTION",
    eventOccurredAtMs: 2200,
    sourceEmittedAtMs: 4380,
    gatewayReceivedAtMs: 4720,
    normalizedAtMs: 4770,
    stateCommittedAtMs: 4810,
    sourceClockOffsetMs: 40,
    sourceTimeUncertaintyMs: 130,
    lateArrival: true,
    correctionOf: "evt-002",
    payload: { label: "tempo", value: 71 },
  },
  {
    id: "evt-004",
    source: "ODDS-FEED-A",
    sourceEventId: "o-7782",
    sequence: 7782,
    eventType: "MARKET_QUOTE",
    eventOccurredAtMs: 5100,
    sourceEmittedAtMs: 5190,
    gatewayReceivedAtMs: 5380,
    normalizedAtMs: 5430,
    stateCommittedAtMs: 5470,
    sourceClockOffsetMs: -20,
    sourceTimeUncertaintyMs: 90,
    lateArrival: false,
    payload: { label: "U3.5", value: 1.43 },
  },
];

export const sandboxTruthBeforeCorrection =
  buildPointInTimeTruth(sandboxTruthJournal, 4000);

export const sandboxTruthAfterCorrection =
  buildPointInTimeTruth(sandboxTruthJournal, 5000);

export const sandboxTruthFinal =
  buildPointInTimeTruth(sandboxTruthJournal, 5600);

export const sandboxTruthHealth =
  evaluateTruthPlaneHealth(sandboxTruthJournal, 5600);
