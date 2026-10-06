import { findRegimeBarrier } from "@/lib/regime-barrier/engine";
import type { RegimeObservation } from "@/lib/regime/types";
import { stableSeries } from "@/lib/regime/sandbox";

const precursorTransition:RegimeObservation[]=[
  ...stableSeries.slice(0,10),
  {timeMs:10000,tempo:.51,shotPressure:.43,transitionRate:.32,territorialControl:.54,priceVelocity:.11,spreadStress:.18,suspensionRisk:.10},
  {timeMs:11000,tempo:.51,shotPressure:.43,transitionRate:.32,territorialControl:.54,priceVelocity:.11,spreadStress:.18,suspensionRisk:.10},
  {timeMs:12000,tempo:.65,shotPressure:.50,transitionRate:.50,territorialControl:.58,priceVelocity:.15,spreadStress:.22,suspensionRisk:.13},
  {timeMs:13000,tempo:.67,shotPressure:.51,transitionRate:.52,territorialControl:.59,priceVelocity:.16,spreadStress:.23,suspensionRisk:.14},
];

const precursorLiquidity:RegimeObservation[]=[
  ...stableSeries.slice(0,10),
  {timeMs:10000,tempo:.50,shotPressure:.42,transitionRate:.31,territorialControl:.54,priceVelocity:.10,spreadStress:.18,suspensionRisk:.10},
  {timeMs:11000,tempo:.50,shotPressure:.42,transitionRate:.31,territorialControl:.54,priceVelocity:.10,spreadStress:.18,suspensionRisk:.10},
  {timeMs:12000,tempo:.52,shotPressure:.44,transitionRate:.33,territorialControl:.54,priceVelocity:.26,spreadStress:.43,suspensionRisk:.31},
  {timeMs:13000,tempo:.52,shotPressure:.44,transitionRate:.33,territorialControl:.54,priceVelocity:.29,spreadStress:.47,suspensionRisk:.35},
];

export const openBarrierNear=findRegimeBarrier(
  precursorTransition,
  "OPEN_TRANSITION",
  {sustainFrames:4,maxSigma:18,step:.5},
);

export const openBarrierFar=findRegimeBarrier(
  stableSeries.slice(0,14),
  "OPEN_TRANSITION",
  {sustainFrames:4,maxSigma:30,step:.5},
);

export const liquidityBarrierNear=findRegimeBarrier(
  precursorLiquidity,
  "FRAGILE_LIQUIDITY",
  {sustainFrames:4,maxSigma:18,step:.5},
);
