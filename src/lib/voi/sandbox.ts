import { routeInformationRequests } from "@/lib/voi/engine";
import type { InformationRequestCandidate, InformationRouterContext } from "@/lib/voi/types";

export const voiContext:InformationRouterContext={
  conflictedFields:["score"],
  missingFields:["lineup"],
  weakFields:["formation","shot_pressure"],
  signalHalfLifeMs:3400,
  maxLatencyMs:1800,
  requestBudgetUsd:.05,
  existingDependencyGroups:["odds-upstream","event-b"],
};

export const voiCandidates:InformationRequestCandidate[]=[
  {id:"official-score",label:"Official score / clock refresh",dependencyGroup:"official",resolvesFields:["score"],expectedUncertaintyReduction:.95,expectedIdentifiabilityGain:.82,latencyMs:220,monetaryCostUsd:.002,failureProbability:.01,freshnessHorizonMs:5000},
  {id:"official-lineup",label:"Official lineup refresh",dependencyGroup:"official",resolvesFields:["lineup","formation"],expectedUncertaintyReduction:.72,expectedIdentifiabilityGain:.9,latencyMs:650,monetaryCostUsd:.004,failureProbability:.03,freshnessHorizonMs:30000},
  {id:"tracking",label:"Premium tracking frame",dependencyGroup:"tracking",resolvesFields:["formation","shot_pressure"],expectedUncertaintyReduction:.82,expectedIdentifiabilityGain:.78,latencyMs:1450,monetaryCostUsd:.025,failureProbability:.05,freshnessHorizonMs:4000},
  {id:"duplicate-odds",label:"Follower bookmaker refresh",dependencyGroup:"odds-upstream",resolvesFields:["score"],expectedUncertaintyReduction:.4,expectedIdentifiabilityGain:.3,latencyMs:450,monetaryCostUsd:.003,failureProbability:.04,freshnessHorizonMs:3000},
  {id:"social",label:"Social chatter scan",dependencyGroup:"social",resolvesFields:["sentiment"],expectedUncertaintyReduction:.18,expectedIdentifiabilityGain:.05,latencyMs:900,monetaryCostUsd:.01,failureProbability:.15,freshnessHorizonMs:10000},
];

export const voiRoutes=routeInformationRequests(voiCandidates,voiContext);
