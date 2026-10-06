import { createHash } from "node:crypto";
import type {
  ExperimentIntegrityResult,
  ExperimentLedgerRecord,
  ExperimentObservation,
  PromotionGateResult,
  RegisteredExperimentProtocol,
} from "@/lib/research/types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const canonicalize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${canonicalize(item)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const digest = (value: unknown) =>
  createHash("sha256").update(canonicalize(value)).digest("hex");

export const hashExperimentProtocol = (
  protocol: RegisteredExperimentProtocol,
) => digest(protocol);

export const evaluateExperimentIntegrity = (
  protocol: RegisteredExperimentProtocol,
  observation: ExperimentObservation,
): ExperimentIntegrityResult => {
  const expectedProtocolHash = hashExperimentProtocol(protocol);
  const protocolMutated =
    expectedProtocolHash !== observation.observedProtocolHash;
  const variantBudgetExceeded =
    observation.evaluatedVariants > protocol.allowedVariants;
  const leakageFree = observation.leakageFlags === 0;

  const reasons: string[] = [];
  if (protocolMutated)
    reasons.push("Observed protocol hash does not match preregistration.");
  if (variantBudgetExceeded)
    reasons.push(
      `Evaluated ${observation.evaluatedVariants} variants; registered budget is ${protocol.allowedVariants}.`,
    );
  if (!leakageFree)
    reasons.push(`${observation.leakageFlags} leakage flag(s) detected.`);

  return {
    valid:
      !protocolMutated &&
      !variantBudgetExceeded &&
      leakageFree,
    expectedProtocolHash,
    observedProtocolHash: observation.observedProtocolHash,
    protocolMutated,
    variantBudgetExceeded,
    leakageFree,
    reasons,
  };
};

export const evaluatePromotionGate = (
  protocol: RegisteredExperimentProtocol,
  observation: ExperimentObservation,
): PromotionGateResult => {
  const integrity = evaluateExperimentIntegrity(protocol, observation);
  const positiveWindowRate =
    observation.oosWindows <= 0
      ? 0
      : observation.positiveWindows / observation.oosWindows;

  const primaryValue =
    protocol.primaryMetric === "net_clv"
      ? observation.meanNetClv
      : protocol.primaryMetric === "log_loss"
        ? observation.logLossGain
        : observation.brierGain;

  const checks: PromotionGateResult["checks"] = [
    {
      id: "integrity",
      label: "Preregistered protocol intact",
      passed: integrity.valid,
      hard: true,
      detail: integrity.valid
        ? "Protocol hash, leakage and variant budget are intact."
        : integrity.reasons.join(" "),
    },
    {
      id: "primary",
      label: "Primary metric threshold",
      passed: primaryValue >= protocol.minimumEffect,
      hard: true,
      detail: `${protocol.primaryMetric}=${primaryValue.toFixed(
        4,
      )}; required ≥${protocol.minimumEffect.toFixed(4)}.`,
    },
    {
      id: "fdr",
      label: "Registered FDR threshold",
      passed: observation.fdrQValue <= protocol.fdrThreshold,
      hard: true,
      detail: `q=${observation.fdrQValue.toFixed(
        3,
      )}; required ≤${protocol.fdrThreshold.toFixed(3)}.`,
    },
    {
      id: "sample",
      label: "Minimum sample",
      passed: observation.sampleSize >= protocol.minimumSample,
      hard: false,
      detail: `${observation.sampleSize}/${protocol.minimumSample} observations.`,
    },
    {
      id: "windows",
      label: "OOS window count",
      passed: observation.oosWindows >= protocol.minimumOosWindows,
      hard: false,
      detail: `${observation.oosWindows}/${protocol.minimumOosWindows} windows.`,
    },
    {
      id: "window-stability",
      label: "Positive-window rate",
      passed:
        positiveWindowRate >= protocol.requiredPositiveWindowRate,
      hard: false,
      detail: `${(positiveWindowRate * 100).toFixed(
        0,
      )}% vs required ${(
        protocol.requiredPositiveWindowRate * 100
      ).toFixed(0)}%.`,
    },
    {
      id: "execution-survival",
      label: "Execution survival",
      passed: observation.executionSurvivalRate >= 0.55,
      hard: false,
      detail: `${(observation.executionSurvivalRate * 100).toFixed(
        0,
      )}% survives execution assumptions.`,
    },
    {
      id: "secondary-logloss",
      label: "Log-loss non-regression",
      passed: observation.logLossGain >= 0,
      hard: false,
      detail: `${observation.logLossGain.toFixed(4)} log-loss gain.`,
    },
    {
      id: "secondary-brier",
      label: "Brier non-regression",
      passed: observation.brierGain >= 0,
      hard: false,
      detail: `${observation.brierGain.toFixed(4)} Brier gain.`,
    },
  ];

  const hardFailure = checks.some(
    (check) => check.hard && !check.passed,
  );
  const soft = checks.filter((check) => !check.hard);
  const softPassRate =
    soft.filter((check) => check.passed).length /
    Math.max(1, soft.length);

  const score = clamp(
    0.23 * clamp(primaryValue / Math.max(0.0001, protocol.minimumEffect * 2)) +
      0.17 * clamp(1 - observation.fdrQValue / Math.max(0.001, protocol.fdrThreshold * 1.5)) +
      0.13 * clamp(observation.sampleSize / protocol.minimumSample) +
      0.1 * clamp(observation.oosWindows / protocol.minimumOosWindows) +
      0.11 * positiveWindowRate +
      0.1 * observation.executionSurvivalRate +
      0.08 * clamp(observation.logLossGain / 0.01) +
      0.08 * softPassRate,
  );

  const blockers = checks
    .filter((check) => check.hard && !check.passed)
    .map((check) => check.detail);
  const warnings = checks
    .filter((check) => !check.hard && !check.passed)
    .map((check) => check.detail);

  const status: PromotionGateResult["status"] =
    hardFailure
      ? "BLOCK"
      : score >= 0.76 &&
          observation.sampleSize >= protocol.minimumSample &&
          observation.oosWindows >= protocol.minimumOosWindows &&
          positiveWindowRate >= protocol.requiredPositiveWindowRate
        ? "ELIGIBLE_FOR_CANARY"
        : "KEEP_SHADOW";

  return {
    status,
    score,
    checks,
    blockers,
    warnings,
  };
};

export const buildExperimentLedger = ({
  protocol,
  observation,
}: {
  protocol: RegisteredExperimentProtocol;
  observation: ExperimentObservation;
}): ExperimentLedgerRecord[] => {
  const protocolHash = hashExperimentProtocol(protocol);
  const rows: Array<{
    stage: ExperimentLedgerRecord["stage"];
    payload: unknown;
  }> = [
    { stage: "REGISTERED", payload: protocol },
    { stage: "EVALUATED", payload: observation },
    {
      stage: "PROMOTION_REVIEW",
      payload: evaluatePromotionGate(protocol, observation),
    },
  ];

  const ledger: ExperimentLedgerRecord[] = [];
  let previousHash: string | null = null;

  rows.forEach((row, index) => {
    const payloadDigest = digest(row.payload);
    const recordBase = {
      index,
      previousHash,
      protocolHash,
      experimentId: protocol.id,
      stage: row.stage,
      payloadDigest,
    };
    const recordHash = digest(recordBase);
    ledger.push({
      ...recordBase,
      recordHash,
    });
    previousHash = recordHash;
  });

  return ledger;
};

export const verifyExperimentLedger = (
  ledger: ExperimentLedgerRecord[],
) =>
  ledger.every((record, index) => {
    const expectedPrevious =
      index === 0 ? null : ledger[index - 1].recordHash;
    if (record.previousHash !== expectedPrevious) return false;
    const { recordHash, ...base } = record;
    return digest(base) === recordHash;
  });
