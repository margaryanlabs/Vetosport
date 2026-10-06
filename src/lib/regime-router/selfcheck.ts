import {
  liquidityRouting,
  stableRouting,
  transitionRouting,
} from "@/lib/regime-router/sandbox";

const sum=(xs:number[])=>xs.reduce((a,b)=>a+b,0);

export const runRegimeRouterSelfCheck=()=>{
  const stableMarket=stableRouting.experts.find(x=>x.id==="market-context");
  const liquidityMarket=liquidityRouting.experts.find(x=>x.id==="market-context");
  const stableSimilarity=stableRouting.experts.find(x=>x.id==="similarity");
  const transitionSimilarity=transitionRouting.experts.find(x=>x.id==="similarity");
  const transitionMonteCarlo=transitionRouting.experts.find(x=>x.id==="monte-carlo");

  const checks=[
    {
      name:"router weights normalize",
      passed:[stableRouting,transitionRouting,liquidityRouting].every(r=>Math.abs(sum(r.experts.map(x=>x.weight))-1)<1e-6),
    },
    {
      name:"anti-dominance cap holds",
      passed:[stableRouting,transitionRouting,liquidityRouting].every(r=>r.maxWeight<=.420001),
    },
    {
      name:"market context gains authority in fragile liquidity",
      passed:(liquidityMarket?.weight??0)>(stableMarket?.weight??1),
    },
    {
      name:"slow similarity expert loses authority after fast transition",
      passed:(transitionSimilarity?.weight??1)<(stableSimilarity?.weight??0),
    },
    {
      name:"slow experts receive adaptation penalty",
      passed:(transitionMonteCarlo?.adaptationPenalty??0)>.1&&(transitionSimilarity?.adaptationPenalty??0)>.1,
    },
    {
      name:"effective expert count remains positive and bounded",
      passed:[stableRouting,transitionRouting,liquidityRouting].every(r=>r.effectiveExperts>0&&r.effectiveExperts<=r.experts.length+.000001),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      stable:stableRouting,
      transition:transitionRouting,
      liquidity:liquidityRouting,
    },
  };
};
