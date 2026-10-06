import type {
  ExperimentObservation,
  RegisteredExperimentProtocol,
} from "@/lib/research/types";
import {
  buildExperimentLedger,
  evaluateExperimentIntegrity,
  evaluatePromotionGate,
  hashExperimentProtocol,
  verifyExperimentLedger,
} from "@/lib/research/experiment-ledger";

export const sandboxRegisteredExperiment: RegisteredExperimentProtocol = {
  id: "exp-parallax-late-lowtempo-001",
  title: "Late low-tempo propagation lag",
  sport: "football",
  marketFamily: "total_goals",
  registeredAt: "2026-08-01T00:00:00.000Z",
  trainingCutoff: "2026-07-31T23:59:59.999Z",
  evaluationStart: "2026-08-01T00:00:00.000Z",
  evaluationEnd: "2026-09-30T23:59:59.999Z",
  primaryMetric: "net_clv",
  minimumEffect: 0.01,
  fdrThreshold: 0.08,
  minimumSample: 800,
  minimumOosWindows: 6,
  requiredPositiveWindowRate: 0.67,
  allowedVariants: 12,
  stateTags: [
    "late-game",
    "draw-state",
    "low-tempo",
    "goal-hazard-down",
    "market-lag",
  ],
  frozenFeatures: [
    "remaining-goal-hazard",
    "tempo-index",
    "market-response-lag",
    "team-total-propagation",
  ],
  forbiddenLookaheadFields: [
    "closing-price",
    "future-event",
    "settlement",
    "post-signal-market-state",
  ],
};

const protocolHash = hashExperimentProtocol(
  sandboxRegisteredExperiment,
);

export const sandboxExperimentObservation: ExperimentObservation = {
  experimentId: sandboxRegisteredExperiment.id,
  sampleSize: 1120,
  oosWindows: 8,
  positiveWindows: 6,
  meanNetClv: 0.0148,
  logLossGain: 0.0043,
  brierGain: 0.0032,
  fdrQValue: 0.041,
  leakageFlags: 0,
  executionSurvivalRate: 0.64,
  evaluatedVariants: 12,
  observedProtocolHash: protocolHash,
};

export const sandboxExperimentIntegrity =
  evaluateExperimentIntegrity(
    sandboxRegisteredExperiment,
    sandboxExperimentObservation,
  );

export const sandboxPromotionGate = evaluatePromotionGate(
  sandboxRegisteredExperiment,
  sandboxExperimentObservation,
);

export const sandboxExperimentLedger = buildExperimentLedger({
  protocol: sandboxRegisteredExperiment,
  observation: sandboxExperimentObservation,
});

export const sandboxLedgerVerified = verifyExperimentLedger(
  sandboxExperimentLedger,
);
