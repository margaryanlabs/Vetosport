import { analyzeTransitionHazard } from "@/lib/transition-hazard/engine";
import {
  liquidityRegime,
  oneSpikeRegime,
  stableRegime,
  transitionRegime,
} from "@/lib/regime/sandbox";

export const stableHazard=analyzeTransitionHazard(
  stableRegime.frames,
  "STABLE_CONTROL",
);

export const transitionHazard=analyzeTransitionHazard(
  transitionRegime.frames,
  "STABLE_CONTROL",
);

export const liquidityHazard=analyzeTransitionHazard(
  liquidityRegime.frames,
  "STABLE_CONTROL",
);

export const oneSpikeHazard=analyzeTransitionHazard(
  oneSpikeRegime.frames,
  "STABLE_CONTROL",
);
