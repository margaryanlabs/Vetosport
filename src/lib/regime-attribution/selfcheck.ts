import {
  liquidityAttribution,
  stableAttribution,
  transitionAttribution,
} from "@/lib/regime-attribution/sandbox";

const approxOne=(v:number)=>Math.abs(v-1)<1e-6;

export const runRegimeAttributionSelfCheck=()=>{
  const transitionTop=transitionAttribution.drivers[0]?.feature;
  const liquidityTop=liquidityAttribution.drivers[0]?.feature;
  const transitionShare=transitionAttribution.drivers.reduce((s,x)=>s+x.share,0);
  const liquidityShare=liquidityAttribution.drivers.reduce((s,x)=>s+x.share,0);

  const checks=[
    {
      name:"transition attribution preserves full regime",
      passed:transitionAttribution.fullRegime==="OPEN_TRANSITION",
    },
    {
      name:"transition primary driver is tempo or transition rate",
      passed:["tempo","transitionRate"].includes(String(transitionTop)),
    },
    {
      name:"liquidity primary driver belongs to liquidity state",
      passed:["spreadStress","suspensionRisk","priceVelocity"].includes(String(liquidityTop)),
    },
    {
      name:"driver shares normalize when evidence exists",
      passed:transitionAttribution.drivers.some(x=>x.contribution>0)&&approxOne(transitionShare)&&approxOne(liquidityShare),
    },
    {
      name:"driver contributions are non-negative",
      passed:[transitionAttribution,liquidityAttribution,stableAttribution].every(result=>result.drivers.every(x=>x.contribution>=0&&x.share>=0&&x.share<=1)),
    },
    {
      name:"at least one ablation can change transition regime classification",
      passed:transitionAttribution.drivers.some(x=>x.flipsRegime)||liquidityAttribution.drivers.some(x=>x.flipsRegime),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      stable:stableAttribution,
      transition:transitionAttribution,
      liquidity:liquidityAttribution,
    },
  };
};
