import { highHazardEstimate, lowHazardEstimate, sparseHazardEstimate } from "@/lib/hazard-calibration/sandbox";
import { evaluateTransitionAuthority } from "@/lib/transition-authority/engine";
import type { HazardCalibrationEstimate } from "@/lib/hazard-calibration/types";

const severeEstimate:HazardCalibrationEstimate={
  regime:"OPEN_TRANSITION",
  hazardScore:.96,
  p1:.68,
  p3:.86,
  p5:.94,
  source:"REGIME",
  status:"CALIBRATED",
  reasons:["synthetic severe calibrated transition risk"],
};

export const lowRiskAuthority=evaluateTransitionAuthority({
  estimate:lowHazardEstimate,
  executionHorizon:3,
  modelAdaptationSpeed:.82,
  regimeCoherent:true,
});

export const highRiskSlowAuthority=evaluateTransitionAuthority({
  estimate:severeEstimate,
  executionHorizon:3,
  modelAdaptationSpeed:.28,
  regimeCoherent:true,
});

export const highRiskFastAuthority=evaluateTransitionAuthority({
  estimate:severeEstimate,
  executionHorizon:3,
  modelAdaptationSpeed:.91,
  regimeCoherent:true,
});

export const sparseAuthority=evaluateTransitionAuthority({
  estimate:sparseHazardEstimate,
  executionHorizon:5,
  modelAdaptationSpeed:.78,
  regimeCoherent:true,
});

export const staleAuthority=evaluateTransitionAuthority({
  estimate:highHazardEstimate,
  executionHorizon:3,
  modelAdaptationSpeed:.90,
  regimeCoherent:false,
});
