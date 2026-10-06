import type {
  PointInTimeTruth,
  TruthJournalRecord,
  TruthPlaneHealth,
  TruthRecordValidation,
} from "@/lib/truth/types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const validateTruthRecord = (
  record: TruthJournalRecord,
): TruthRecordValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const correctedEventOccurredAtMs =
    record.eventOccurredAtMs - record.sourceClockOffsetMs;

  if (
    record.gatewayReceivedAtMs <
    record.sourceEmittedAtMs - record.sourceTimeUncertaintyMs
  ) {
    errors.push(
      "Gateway receive time precedes source emission beyond clock uncertainty.",
    );
  }

  if (record.normalizedAtMs < record.gatewayReceivedAtMs) {
    errors.push("Normalization precedes gateway receipt.");
  }

  if (record.stateCommittedAtMs < record.normalizedAtMs) {
    errors.push("State commit precedes normalization.");
  }

  if (
    correctedEventOccurredAtMs >
    record.gatewayReceivedAtMs + record.sourceTimeUncertaintyMs
  ) {
    errors.push(
      "Corrected event time occurs after the record was received.",
    );
  }

  if (
    record.sourceEmittedAtMs <
    correctedEventOccurredAtMs - record.sourceTimeUncertaintyMs
  ) {
    warnings.push(
      "Source emission appears earlier than corrected event time.",
    );
  }

  if (record.lateArrival) {
    warnings.push("Record marked as late arrival.");
  }

  if (record.sourceTimeUncertaintyMs > 1500) {
    warnings.push("High source clock uncertainty.");
  }

  const receiveLatencyMs = Math.max(
    0,
    record.gatewayReceivedAtMs - correctedEventOccurredAtMs,
  );
  const normalizationLatencyMs = Math.max(
    0,
    record.normalizedAtMs - record.gatewayReceivedAtMs,
  );
  const commitLatencyMs = Math.max(
    0,
    record.stateCommittedAtMs - record.normalizedAtMs,
  );

  return {
    recordId: record.id,
    valid: errors.length === 0,
    errors,
    warnings,
    pipelineLatencyMs:
      receiveLatencyMs + normalizationLatencyMs + commitLatencyMs,
    receiveLatencyMs,
    normalizationLatencyMs,
    commitLatencyMs,
    correctedEventOccurredAtMs,
  };
};

const activeCorrectionMap = <T>(
  visibleRecords: TruthJournalRecord<T>[],
) => {
  const corrections = new Map<string, TruthJournalRecord<T>>();
  for (const record of visibleRecords) {
    if (!record.correctionOf) continue;
    const current = corrections.get(record.correctionOf);
    if (
      !current ||
      record.gatewayReceivedAtMs > current.gatewayReceivedAtMs
    ) {
      corrections.set(record.correctionOf, record);
    }
  }
  return corrections;
};

export const buildPointInTimeTruth = <T>(
  records: TruthJournalRecord<T>[],
  asOfMs: number,
  allowedLatenessMs = 2500,
): PointInTimeTruth<T> => {
  const visibleRecords = [...records]
    .filter((record) => record.gatewayReceivedAtMs <= asOfMs)
    .sort((a, b) => {
      if (a.gatewayReceivedAtMs !== b.gatewayReceivedAtMs) {
        return a.gatewayReceivedAtMs - b.gatewayReceivedAtMs;
      }
      return a.sequence - b.sequence;
    });

  const excludedFutureRecords = records
    .filter((record) => record.gatewayReceivedAtMs > asOfMs)
    .map((record) => record.id);

  const correctionMap = activeCorrectionMap(visibleRecords);
  const replaced = new Set(correctionMap.keys());

  const activeRecords = visibleRecords.filter((record) => {
    if (record.correctionOf) {
      const activeCorrection = correctionMap.get(record.correctionOf);
      return activeCorrection?.id === record.id;
    }
    return !replaced.has(record.id);
  });

  const appliedCorrections = [...correctionMap.entries()].map(
    ([replacesId, correction]) => ({
      correctionId: correction.id,
      replacesId,
    }),
  );

  const eventTimes = visibleRecords
    .filter((record) => !record.lateArrival)
    .map(
      (record) =>
        record.eventOccurredAtMs - record.sourceClockOffsetMs,
    );

  const maxSafeEventTime =
    eventTimes.length === 0 ? null : Math.max(...eventTimes);

  return {
    asOfMs,
    visibleRecords,
    activeRecords,
    excludedFutureRecords,
    appliedCorrections,
    watermarkMs:
      maxSafeEventTime == null
        ? null
        : maxSafeEventTime - allowedLatenessMs,
  };
};

export const verifyNoLookahead = <T>(
  pointInTime: PointInTimeTruth<T>,
) =>
  pointInTime.activeRecords.every(
    (record) => record.gatewayReceivedAtMs <= pointInTime.asOfMs,
  );

export const evaluateTruthPlaneHealth = <T>(
  records: TruthJournalRecord<T>[],
  asOfMs: number,
): TruthPlaneHealth => {
  const validations = records.map((record) =>
    validateTruthRecord(record),
  );
  const view = buildPointInTimeTruth(records, asOfMs);

  const validRecordRate =
    validations.length === 0
      ? 0
      : validations.filter((item) => item.valid).length /
        validations.length;

  const averageClockUncertainty =
    records.length === 0
      ? 9999
      : records.reduce(
          (sum, record) => sum + record.sourceTimeUncertaintyMs,
          0,
        ) / records.length;
  const clockConfidence = clamp(
    1 - averageClockUncertainty / 2500,
  );

  const visibleLatencies = view.visibleRecords.map(
    (record) => validateTruthRecord(record).pipelineLatencyMs,
  );
  const averageLatency =
    visibleLatencies.length === 0
      ? 9999
      : visibleLatencies.reduce((a, b) => a + b, 0) /
        visibleLatencies.length;
  const freshnessConfidence = clamp(1 - averageLatency / 7000);

  const correctionRows = view.visibleRecords.filter(
    (record) => record.correctionOf,
  );
  const uniqueTargets = new Set(
    correctionRows.map((record) => record.correctionOf),
  );
  const correctionIntegrity =
    correctionRows.length === 0
      ? 1
      : clamp(uniqueTargets.size / correctionRows.length);

  const lookaheadSafe = verifyNoLookahead(view);
  const warnings = validations.flatMap((item) => item.warnings);
  if (!lookaheadSafe) warnings.push("Point-in-time view contains lookahead.");

  const score = clamp(
    0.32 * validRecordRate +
      0.2 * clockConfidence +
      0.2 * freshnessConfidence +
      0.14 * correctionIntegrity +
      0.14 * (lookaheadSafe ? 1 : 0),
  );

  return {
    score,
    validRecordRate,
    clockConfidence,
    freshnessConfidence,
    correctionIntegrity,
    lookaheadSafe,
    warnings,
  };
};
