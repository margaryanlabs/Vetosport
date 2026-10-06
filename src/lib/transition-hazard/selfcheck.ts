import {
  liquidityHazard,
  oneSpikeHazard,
  stableHazard,
  transitionHazard,
} from "@/lib/transition-hazard/sandbox";

export const runTransitionHazardSelfCheck=()=>{
  const checks=[
    {
      name:"stable stream does not arm transition hazard",
      passed:!stableHazard.frames.some(x=>x.status==="ARMED"||x.status==="IMMINENT"),
    },
    {
      name:"transition early warning precedes confirmed hard change",
      passed:(transitionHazard.leadMsToHardChange??0)>0&&Boolean(transitionHazard.firstHardChange),
    },
    {
      name:"liquidity early warning precedes confirmed hard change",
      passed:(liquidityHazard.leadMsToHardChange??0)>0&&Boolean(liquidityHazard.firstHardChange),
    },
    {
      name:"single spike never becomes imminent transition",
      passed:!oneSpikeHazard.frames.some(x=>x.status==="IMMINENT"),
    },
    {
      name:"imminent state requires persistent evidence",
      passed:[transitionHazard,liquidityHazard,oneSpikeHazard].every(result=>result.frames.filter(x=>x.status==="IMMINENT").every(x=>x.persistence>=2)),
    },
    {
      name:"transition identifies open transition as dominant alternative",
      passed:transitionHazard.current?.dominantAlternative==="OPEN_TRANSITION",
    },
    {
      name:"liquidity identifies fragile liquidity as dominant alternative",
      passed:liquidityHazard.current?.dominantAlternative==="FRAGILE_LIQUIDITY",
    },
    {
      name:"hazard index remains bounded",
      passed:[stableHazard,transitionHazard,liquidityHazard,oneSpikeHazard].every(result=>result.frames.every(x=>x.hazardScore>=0&&x.hazardScore<=1)),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      stable:stableHazard,
      transition:transitionHazard,
      liquidity:liquidityHazard,
      spike:oneSpikeHazard,
    },
  };
};
