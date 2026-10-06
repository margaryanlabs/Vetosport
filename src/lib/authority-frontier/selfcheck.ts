import {
  abstainFrontier,
  pooledFrontier,
  safeFrontier,
  watchFrontier,
} from "@/lib/authority-frontier/sandbox";

export const runAuthorityFrontierSelfCheck=()=>{
  const checks=[
    {
      name:"safe point remains preserve with positive watch distance",
      passed:safeFrontier.current.action==="PRESERVE"&&(safeFrontier.probabilityToWatch??0)>0,
    },
    {
      name:"watch point lies inside reduced authority region",
      passed:watchFrontier.current.action==="CAP_TO_WATCH"&&watchFrontier.current.adaptationRisk>=.28,
    },
    {
      name:"abstain point lies inside hard transition region",
      passed:abstainFrontier.current.action==="ABSTAIN"&&abstainFrontier.current.transitionProbability>=.82&&abstainFrontier.current.modelAdaptationSpeed<.35,
    },
    {
      name:"untrusted calibration cannot claim preserve frontier",
      passed:pooledFrontier.current.action==="CAP_TO_WATCH"&&pooledFrontier.safetyMargin===0,
    },
    {
      name:"frontier grid is bounded and finite",
      passed:[safeFrontier,watchFrontier,abstainFrontier,pooledFrontier].every(result=>result.grid.every(point=>point.transitionProbability>=0&&point.transitionProbability<=1&&point.modelAdaptationSpeed>=0&&point.modelAdaptationSpeed<=1&&point.adaptationRisk>=0&&point.adaptationRisk<=1)),
    },
    {
      name:"preserve adaptation floor is bounded when defined",
      passed:[safeFrontier,watchFrontier,abstainFrontier].every(result=>result.adaptationFloorToPreserve===null||(result.adaptationFloorToPreserve>=0&&result.adaptationFloorToPreserve<=1)),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      safe:safeFrontier,
      watch:watchFrontier,
      abstain:abstainFrontier,
      pooled:pooledFrontier,
    },
  };
};
