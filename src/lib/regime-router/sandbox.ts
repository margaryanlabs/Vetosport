import { routeExpertsByRegime } from "@/lib/regime-router/engine";
import type { RegimeExpertProfile } from "@/lib/regime-router/types";

export const regimeExperts:RegimeExpertProfile[]=[
  {
    id:"game-state",
    label:"Game State",
    baseWeight:.23,
    confidence:.91,
    independence:.78,
    dependencyPenalty:.28,
    adaptationSpeed:.82,
    regimeReliability:{
      STABLE_CONTROL:.92,
      OPEN_TRANSITION:.76,
      PRESSURE_SIEGE:.81,
      FRAGILE_LIQUIDITY:.48,
      DISLOCATED:.52,
    },
  },
  {
    id:"monte-carlo",
    label:"Monte Carlo",
    baseWeight:.21,
    confidence:.89,
    independence:.72,
    dependencyPenalty:.31,
    adaptationSpeed:.46,
    regimeReliability:{
      STABLE_CONTROL:.88,
      OPEN_TRANSITION:.61,
      PRESSURE_SIEGE:.68,
      FRAGILE_LIQUIDITY:.42,
      DISLOCATED:.47,
    },
  },
  {
    id:"similarity",
    label:"Similarity",
    baseWeight:.18,
    confidence:.80,
    independence:.69,
    dependencyPenalty:.22,
    adaptationSpeed:.31,
    regimeReliability:{
      STABLE_CONTROL:.84,
      OPEN_TRANSITION:.46,
      PRESSURE_SIEGE:.54,
      FRAGILE_LIQUIDITY:.36,
      DISLOCATED:.39,
    },
  },
  {
    id:"market-context",
    label:"Market Context",
    baseWeight:.22,
    confidence:.84,
    independence:.93,
    dependencyPenalty:.08,
    adaptationSpeed:.94,
    regimeReliability:{
      STABLE_CONTROL:.73,
      OPEN_TRANSITION:.88,
      PRESSURE_SIEGE:.76,
      FRAGILE_LIQUIDITY:.94,
      DISLOCATED:.91,
    },
  },
  {
    id:"tactical-state",
    label:"Tactical State",
    baseWeight:.16,
    confidence:.82,
    independence:.81,
    dependencyPenalty:.15,
    adaptationSpeed:.76,
    regimeReliability:{
      STABLE_CONTROL:.76,
      OPEN_TRANSITION:.83,
      PRESSURE_SIEGE:.95,
      FRAGILE_LIQUIDITY:.55,
      DISLOCATED:.58,
    },
  },
];

export const stableRouting=routeExpertsByRegime(regimeExperts,{
  regime:"STABLE_CONTROL",
  regimeConfidence:.22,
  structuralChangeAgeMs:12000,
  signalHalfLifeMs:4500,
});

export const transitionRouting=routeExpertsByRegime(regimeExperts,{
  regime:"OPEN_TRANSITION",
  regimeConfidence:.94,
  structuralChangeAgeMs:900,
  signalHalfLifeMs:3400,
});

export const liquidityRouting=routeExpertsByRegime(regimeExperts,{
  regime:"FRAGILE_LIQUIDITY",
  regimeConfidence:.97,
  structuralChangeAgeMs:600,
  signalHalfLifeMs:2500,
});
