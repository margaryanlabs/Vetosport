import { evaluateRegimeCoherence } from "@/lib/regime-coherence/engine";

export const coherentRegimeGate=evaluateRegimeCoherence({
  governedRegime:"OPEN_TRANSITION",
  signalRegimeSnapshot:"OPEN_TRANSITION",
  signalCreatedAtMs:5200,
  regimeEnteredAtMs:4100,
  transitionHazard:.28,
  modelAdaptationSpeed:.82,
});

export const staleSnapshotGate=evaluateRegimeCoherence({
  governedRegime:"PRESSURE_SIEGE",
  signalRegimeSnapshot:"OPEN_TRANSITION",
  signalCreatedAtMs:7600,
  regimeEnteredAtMs:7000,
  transitionHazard:.91,
  modelAdaptationSpeed:.82,
});

export const preRegimeGate=evaluateRegimeCoherence({
  governedRegime:"OPEN_TRANSITION",
  signalRegimeSnapshot:"OPEN_TRANSITION",
  signalCreatedAtMs:3200,
  regimeEnteredAtMs:4100,
  transitionHazard:.42,
  modelAdaptationSpeed:.80,
});

export const slowImminentGate=evaluateRegimeCoherence({
  governedRegime:"OPEN_TRANSITION",
  signalRegimeSnapshot:"OPEN_TRANSITION",
  signalCreatedAtMs:5200,
  regimeEnteredAtMs:4100,
  transitionHazard:.88,
  modelAdaptationSpeed:.31,
});

export const fastImminentGate=evaluateRegimeCoherence({
  governedRegime:"OPEN_TRANSITION",
  signalRegimeSnapshot:"OPEN_TRANSITION",
  signalCreatedAtMs:5200,
  regimeEnteredAtMs:4100,
  transitionHazard:.88,
  modelAdaptationSpeed:.87,
});
