import { buildAuthorityFrontier } from "@/lib/authority-frontier/engine";

export const safeFrontier=buildAuthorityFrontier({
  transitionProbability:.34,
  modelAdaptationSpeed:.82,
  calibrationTrusted:true,
  regimeCoherent:true,
});

export const watchFrontier=buildAuthorityFrontier({
  transitionProbability:.70,
  modelAdaptationSpeed:.48,
  calibrationTrusted:true,
  regimeCoherent:true,
});

export const abstainFrontier=buildAuthorityFrontier({
  transitionProbability:.88,
  modelAdaptationSpeed:.27,
  calibrationTrusted:true,
  regimeCoherent:true,
});

export const pooledFrontier=buildAuthorityFrontier({
  transitionProbability:.44,
  modelAdaptationSpeed:.80,
  calibrationTrusted:false,
  regimeCoherent:true,
});
