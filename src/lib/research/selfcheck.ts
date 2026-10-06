import {
  buildExperimentLedger,
  evaluateExperimentIntegrity,
  evaluatePromotionGate,
  hashExperimentProtocol,
  verifyExperimentLedger,
} from "@/lib/research/experiment-ledger";
import {
  sandboxExperimentLedger,
  sandboxExperimentObservation,
  sandboxLedgerVerified,
  sandboxPromotionGate,
  sandboxRegisteredExperiment,
} from "@/lib/research/sandbox";

export const runExperimentLedgerSelfCheck = () => {
  const mutatedProtocol = {
    ...sandboxRegisteredExperiment,
    minimumEffect: 0.004,
    fdrThreshold: 0.15,
  };

  const mutatedIntegrity = evaluateExperimentIntegrity(
    mutatedProtocol,
    sandboxExperimentObservation,
  );
  const mutatedGate = evaluatePromotionGate(
    mutatedProtocol,
    sandboxExperimentObservation,
  );

  const overVariantObservation = {
    ...sandboxExperimentObservation,
    evaluatedVariants:
      sandboxRegisteredExperiment.allowedVariants + 9,
  };
  const overVariantGate = evaluatePromotionGate(
    sandboxRegisteredExperiment,
    overVariantObservation,
  );

  const lowSampleObservation = {
    ...sandboxExperimentObservation,
    sampleSize: 420,
    oosWindows: 4,
    positiveWindows: 3,
  };
  const lowSampleGate = evaluatePromotionGate(
    sandboxRegisteredExperiment,
    lowSampleObservation,
  );

  const tamperedLedger = sandboxExperimentLedger.map((row) => ({
    ...row,
  }));
  tamperedLedger[1] = {
    ...tamperedLedger[1],
    payloadDigest: "tampered",
  };

  const checks = [
    {
      name: "registered protocol hash is stable",
      passed:
        sandboxExperimentObservation.observedProtocolHash ===
        hashExperimentProtocol(sandboxRegisteredExperiment),
    },
    {
      name: "untampered protocol integrity passes",
      passed:
        evaluateExperimentIntegrity(
          sandboxRegisteredExperiment,
          sandboxExperimentObservation,
        ).valid,
    },
    {
      name: "post-hoc protocol mutation is blocked",
      passed:
        !mutatedIntegrity.valid &&
        mutatedGate.status === "BLOCK",
    },
    {
      name: "variant budget cannot be silently exceeded",
      passed: overVariantGate.status === "BLOCK",
    },
    {
      name: "insufficient sample stays out of canary",
      passed: lowSampleGate.status !== "ELIGIBLE_FOR_CANARY",
    },
    {
      name: "strong preregistered experiment can reach canary eligibility",
      passed:
        sandboxPromotionGate.status === "ELIGIBLE_FOR_CANARY",
    },
    {
      name: "ledger hash chain verifies",
      passed: sandboxLedgerVerified,
    },
    {
      name: "tampered ledger fails verification",
      passed: !verifyExperimentLedger(tamperedLedger),
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      protocol: sandboxRegisteredExperiment,
      observation: sandboxExperimentObservation,
      gate: sandboxPromotionGate,
      ledger: sandboxExperimentLedger,
      controls: {
        mutatedIntegrity,
        mutatedGate,
        overVariantGate,
        lowSampleGate,
      },
    },
  };
};
