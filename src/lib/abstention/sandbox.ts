import { evaluateDecisionBoundary } from "@/lib/abstention/engine";
import type { DecisionEvidence } from "@/lib/abstention/types";

export const healthyDecisionEvidence:DecisionEvidence={
  robustGapPp:5.4,
  uncertaintyWidthPp:6.1,
  sensorIntegrity:.90,
  identifiability:.96,
  councilConfidence:.58,
  effectiveModels:3.06,
  dataCompleteness:.91,
  quoteFreshness:.88,
  executionSurvival:.80,
  capacityScore:.83,
  capacityClass:"DEEP",
  contractComparable:true,
  semanticFreeze:false,
  leakageBlock:false,
  calibrationKill:false,
  censoringBlock:false,
  outOfDistribution:false,
};

export const healthyBoundary=evaluateDecisionBoundary(healthyDecisionEvidence);
export const leakageBoundary=evaluateDecisionBoundary({...healthyDecisionEvidence,robustGapPp:12.8,leakageBlock:true});
export const semanticBoundary=evaluateDecisionBoundary({...healthyDecisionEvidence,semanticFreeze:true});
export const oodBoundary=evaluateDecisionBoundary({...healthyDecisionEvidence,outOfDistribution:true});
export const weakBoundary=evaluateDecisionBoundary({
  ...healthyDecisionEvidence,
  robustGapPp:1.7,
  uncertaintyWidthPp:9.5,
  sensorIntegrity:.66,
  identifiability:.63,
  councilConfidence:.48,
  effectiveModels:1.6,
  dataCompleteness:.69,
  quoteFreshness:.57,
  executionSurvival:.39,
  capacityScore:.51,
  capacityClass:"THIN",
});
