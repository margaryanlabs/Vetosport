import { attributeRegimeDrivers } from "@/lib/regime-attribution/engine";
import {
  liquidityShockSeries,
  stableSeries,
  transitionSeries,
} from "@/lib/regime/sandbox";

export const stableAttribution=attributeRegimeDrivers(stableSeries);
export const transitionAttribution=attributeRegimeDrivers(transitionSeries);
export const liquidityAttribution=attributeRegimeDrivers(liquidityShockSeries);
