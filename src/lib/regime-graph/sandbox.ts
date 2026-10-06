import { assessRegimePath, buildRegimeTransitionGraph } from "@/lib/regime-graph/engine";
import type { RegimeLabel } from "@/lib/regime/types";

const seq=(...parts:Array<[RegimeLabel,number]>)=>
  parts.flatMap(([regime,count])=>Array.from({length:count},()=>regime));

export const regimeHistory:RegimeLabel[][]=[
  seq(["STABLE_CONTROL",6],["OPEN_TRANSITION",4],["PRESSURE_SIEGE",3],["STABLE_CONTROL",7]),
  seq(["STABLE_CONTROL",7],["OPEN_TRANSITION",5],["STABLE_CONTROL",5]),
  seq(["STABLE_CONTROL",5],["OPEN_TRANSITION",4],["PRESSURE_SIEGE",4],["STABLE_CONTROL",6]),
  seq(["STABLE_CONTROL",8],["OPEN_TRANSITION",3],["STABLE_CONTROL",6]),
  seq(["STABLE_CONTROL",6],["FRAGILE_LIQUIDITY",3],["STABLE_CONTROL",7]),
  seq(["STABLE_CONTROL",7],["OPEN_TRANSITION",4],["DISLOCATED",2],["STABLE_CONTROL",6]),
];

export const regimeGraph=buildRegimeTransitionGraph(regimeHistory,.5);

export const commonPath=assessRegimePath(
  regimeGraph,
  "STABLE_CONTROL",
  "OPEN_TRANSITION",
  6,
);

export const earlyCommonPath=assessRegimePath(
  regimeGraph,
  "STABLE_CONTROL",
  "OPEN_TRANSITION",
  1,
);

export const rarePath=assessRegimePath(
  regimeGraph,
  "PRESSURE_SIEGE",
  "FRAGILE_LIQUIDITY",
  1,
);

export const liquidityReturnPath=assessRegimePath(
  regimeGraph,
  "FRAGILE_LIQUIDITY",
  "STABLE_CONTROL",
  3,
);
