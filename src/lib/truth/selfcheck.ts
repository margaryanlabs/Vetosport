import {
  buildPointInTimeTruth,
  evaluateTruthPlaneHealth,
  validateTruthRecord,
  verifyNoLookahead,
} from "@/lib/truth/engine";
import {
  sandboxTruthAfterCorrection,
  sandboxTruthBeforeCorrection,
  sandboxTruthFinal,
  sandboxTruthHealth,
  sandboxTruthJournal,
} from "@/lib/truth/sandbox";
import type { TruthJournalRecord } from "@/lib/truth/types";

export const runTruthPlaneSelfCheck = () => {
  const beforeTempo = sandboxTruthBeforeCorrection.activeRecords.find(
    (record) =>
      record.id === "evt-002" ||
      record.correctionOf === "evt-002",
  );
  const afterTempo = sandboxTruthAfterCorrection.activeRecords.find(
    (record) =>
      record.id === "evt-002" ||
      record.correctionOf === "evt-002",
  );

  const invalid: TruthJournalRecord = {
    id: "invalid",
    source: "BROKEN",
    sourceEventId: "broken-1",
    sequence: 1,
    eventType: "BROKEN",
    eventOccurredAtMs: 5000,
    sourceEmittedAtMs: 5100,
    gatewayReceivedAtMs: 5200,
    normalizedAtMs: 5150,
    stateCommittedAtMs: 5140,
    sourceClockOffsetMs: 0,
    sourceTimeUncertaintyMs: 0,
    lateArrival: false,
    payload: {},
  };

  const replayBeforeFuture = buildPointInTimeTruth(
    sandboxTruthJournal,
    5300,
  );

  const checks = [
    {
      name: "late correction is invisible before receipt",
      passed:
        beforeTempo?.id === "evt-002" &&
        !sandboxTruthBeforeCorrection.appliedCorrections.some(
          (item) => item.replacesId === "evt-002",
        ),
    },
    {
      name: "correction applies only after gateway receipt",
      passed:
        afterTempo?.id === "evt-002-c1" &&
        sandboxTruthAfterCorrection.appliedCorrections.some(
          (item) =>
            item.correctionId === "evt-002-c1" &&
            item.replacesId === "evt-002",
        ),
    },
    {
      name: "future quote excluded from earlier replay",
      passed:
        replayBeforeFuture.excludedFutureRecords.includes("evt-004") &&
        !replayBeforeFuture.visibleRecords.some(
          (record) => record.id === "evt-004",
        ),
    },
    {
      name: "point-in-time view is lookahead safe",
      passed:
        verifyNoLookahead(sandboxTruthBeforeCorrection) &&
        verifyNoLookahead(sandboxTruthAfterCorrection) &&
        verifyNoLookahead(sandboxTruthFinal),
    },
    {
      name: "invalid chronology is rejected",
      passed:
        !validateTruthRecord(invalid).valid &&
        validateTruthRecord(invalid).errors.length >= 2,
    },
    {
      name: "truth health remains bounded",
      passed:
        sandboxTruthHealth.score >= 0 &&
        sandboxTruthHealth.score <= 1,
    },
    {
      name: "sandbox journal validates cleanly",
      passed: sandboxTruthJournal.every(
        (record) => validateTruthRecord(record).valid,
      ),
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      health: sandboxTruthHealth,
      beforeCorrection: sandboxTruthBeforeCorrection,
      afterCorrection: sandboxTruthAfterCorrection,
      final: sandboxTruthFinal,
      invalid: validateTruthRecord(invalid),
    },
  };
};
