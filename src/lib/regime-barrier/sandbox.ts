import { findRegimeBarrier } from "@/lib/regime-barrier/engine";
import type { RegimeObservation } from "@/lib/regime/types";
import { stableSeries } from "@/lib/regime/sandbox";

const precursorTransition:RegimeObservation[]=[
  ...stableSeries.slice(0,10),
  {timeMs:10000,tempo:.58,shotPressure:.47,transitionRate:.40,territorialControl:.56,priceVelocity:.13,spreadStress:.20,suspensionRisk:.11},
  {timeMs:11000,tempo:.59,shotPressure:.48,transitionRate:.42,territorialControl:.56,priceVelocity:.14,spreadStress:.21,suspensionRisk:.12},
  {timeMs:12000,tempo:.60,shotPressure:.49,transitionRate:.43,territorialControl:.57,priceVelocity:.14,spreadStress:.21,suspensionRisk:.12},
  {timeMs:13000,tempo:.60,shotPressure:.49,transitionRate:.43,territorialControl:.57,priceVelocity:.14,spreadStress:.21,suspensionRisk:.12},
];

const precursorLiquidity:RegimeObservation[]=[
  ...stableSeries.slice(0,10),
  {timeMs:10000,tempo:.51,shotPressure:.43,transitionRate:.32,territorialControl:.54,priceVelocity:.17,spreadStress:.27,suspensionRisk:.18},
  {timeMs:11000,tempo:.51,shotPressure:.43,transitionRate:.32,territorialControl:.54,priceVelocity:.18,spreadStress:.29,suspensionRisk:.19},
  {timeMs:12000,tempo:.52,shotPressure:.44,transitionRate:.33,territorialControl:.54,priceVelocity:.18,spreadStress:.30,suspensionRisk:.20},
  {timeMs:13000,tempo:.52,shotPressure:.44,transitionRate:.33,territorialControl:.54,priceVelocity:.18,spreadStress:.30,suspensionRisk:.20},
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
