import {
  buildDataPlaneReplay,
  prepareJournalRecord,
} from "@/lib/data-plane/engine";
import type {
  PersistedJournalRecord,
  PreparedJournalRecord,
} from "@/lib/data-plane/types";

const persist = <T>(
  id: string,
  record: PreparedJournalRecord<T>,
  committedAt: string,
): PersistedJournalRecord<T> => ({
  ...record,
  id,
  committedAt,
});

export const runDataPlaneSelfCheck = () => {
  const base = prepareJournalRecord({
    eventId: "event-1",
    sourceProvider: "odds-a",
    sourceRecordId: "quote-1",
    stream: "MARKET_QUOTE",
    schemaVersion: "veto.market-quote.v2",
    eventOccurredAt: "2026-10-06T16:00:01.000Z",
    sourceEmittedAt: "2026-10-06T16:00:01.100Z",
    gatewayReceivedAt: "2026-10-06T16:00:01.450Z",
    normalizedAt: "2026-10-06T16:00:01.500Z",
    semanticKey: "football.total|under|2.5",
    payload: {
      bookmaker: "A",
      odds: 1.91,
      selection: "UNDER",
    },
  });

  const duplicate = prepareJournalRecord({
    eventId: "event-1",
    sourceProvider: "odds-a",
    sourceRecordId: "quote-1",
    stream: "MARKET_QUOTE",
    schemaVersion: "veto.market-quote.v2",
    eventOccurredAt: "2026-10-06T16:00:01.000Z",
    sourceEmittedAt: "2026-10-06T16:00:01.100Z",
    gatewayReceivedAt: "2026-10-06T16:00:01.450Z",
    normalizedAt: "2026-10-06T16:00:01.500Z",
    semanticKey: "football.total|under|2.5",
    payload: {
      selection: "UNDER",
      odds: 1.91,
      bookmaker: "A",
    },
  });

  const changed = prepareJournalRecord({
    ...base,
    payload: {
      bookmaker: "A",
      odds: 1.88,
      selection: "UNDER",
    },
  });

  const correction = prepareJournalRecord({
    eventId: "event-1",
    sourceProvider: "odds-a",
    sourceRecordId: "quote-1-correction",
    stream: "MARKET_QUOTE",
    schemaVersion: "veto.market-quote.v2",
    eventOccurredAt: "2026-10-06T16:00:01.000Z",
    sourceEmittedAt: "2026-10-06T16:00:04.000Z",
    gatewayReceivedAt: "2026-10-06T16:00:04.300Z",
    normalizedAt: "2026-10-06T16:00:04.350Z",
    correctionOf: base.recordHash,
    semanticKey: "football.total|under|2.5",
    payload: {
      bookmaker: "A",
      odds: 1.9,
      selection: "UNDER",
      corrected: true,
    },
  });

  const historical = prepareJournalRecord({
    eventId: "event-1",
    sourceProvider: "odds-history",
    sourceRecordId: "snapshot-0900",
    stream: "MARKET_QUOTE",
    schemaVersion: "veto.market-quote.v2",
    eventOccurredAt: "2026-10-06T15:00:00.000Z",
    sourceEmittedAt: "2026-10-06T15:00:00.000Z",
    gatewayReceivedAt: "2026-10-06T18:00:00.000Z",
    normalizedAt: "2026-10-06T18:00:00.100Z",
    knowledgeAvailableAt: "2026-10-06T15:00:00.000Z",
    acquisitionMode: "HISTORICAL_BACKFILL",
    semanticKey: "football.total|under|2.5",
    payload: {
      bookmaker: "History A",
      odds: 1.95,
      selection: "UNDER",
    },
  });

  const liveFuture = prepareJournalRecord({
    eventId: "event-1",
    sourceProvider: "odds-b",
    sourceRecordId: "quote-future",
    stream: "MARKET_QUOTE",
    schemaVersion: "veto.market-quote.v2",
    eventOccurredAt: "2026-10-06T16:00:08.000Z",
    sourceEmittedAt: "2026-10-06T16:00:08.050Z",
    gatewayReceivedAt: "2026-10-06T16:00:08.400Z",
    normalizedAt: "2026-10-06T16:00:08.450Z",
    semanticKey: "football.total|under|2.5",
    payload: {
      bookmaker: "B",
      odds: 1.87,
      selection: "UNDER",
    },
  });

  const rows = [
    persist("row-base", base, "2026-10-06T16:00:01.550Z"),
    persist(
      "row-correction",
      correction,
      "2026-10-06T16:00:04.400Z",
    ),
    persist(
      "row-history",
      historical,
      "2026-10-06T18:00:00.200Z",
    ),
    persist(
      "row-future",
      liveFuture,
      "2026-10-06T16:00:08.500Z",
    ),
  ];

  const beforeCorrection = buildDataPlaneReplay(rows, {
    eventId: "event-1",
    asOf: "2026-10-06T16:00:02.000Z",
  });

  const afterCorrection = buildDataPlaneReplay(rows, {
    eventId: "event-1",
    asOf: "2026-10-06T16:00:05.000Z",
  });

  const checks = [
    {
      name: "canonical payload ordering keeps hash stable",
      passed:
        base.payloadHash === duplicate.payloadHash &&
        base.dedupeKey === duplicate.dedupeKey &&
        base.recordHash === duplicate.recordHash,
    },
    {
      name: "changed quote produces new immutable record hash",
      passed:
        changed.recordHash !== base.recordHash &&
        changed.payloadHash !== base.payloadHash,
    },
    {
      name: "historical backfill preserves historical knowledge time",
      passed:
        historical.acquisitionMode === "HISTORICAL_BACKFILL" &&
        historical.knowledgeAvailableAt ===
          "2026-10-06T15:00:00.000Z" &&
        historical.gatewayReceivedAt ===
          "2026-10-06T18:00:00.000Z",
    },
    {
      name: "future live quote is excluded from earlier replay",
      passed:
        beforeCorrection.excludedFutureCount >= 2 &&
        !beforeCorrection.visible.some(
          (record) => record.id === "row-future",
        ),
    },
    {
      name: "historical snapshot can be replay-visible without pretending live acquisition",
      passed:
        beforeCorrection.visible.some(
          (record) =>
            record.id === "row-history" &&
            record.acquisitionMode === "HISTORICAL_BACKFILL",
        ),
    },
    {
      name: "correction is absent before its knowledge time",
      passed:
        beforeCorrection.active.some(
          (record) => record.id === "row-base",
        ) &&
        !beforeCorrection.active.some(
          (record) => record.id === "row-correction",
        ),
    },
    {
      name: "correction replaces prior record after knowledge time",
      passed:
        afterCorrection.active.some(
          (record) => record.id === "row-correction",
        ) &&
        !afterCorrection.active.some(
          (record) => record.id === "row-base",
        ),
    },
    {
      name: "point-in-time replay remains lookahead safe",
      passed:
        beforeCorrection.lookaheadSafe &&
        afterCorrection.lookaheadSafe,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      base,
      correction,
      historical,
      beforeCorrection,
      afterCorrection,
    },
  };
};
