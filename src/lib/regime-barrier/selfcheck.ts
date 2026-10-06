import {
  liquidityBarrierNear,
  openBarrierFar,
  openBarrierNear,
} from "@/lib/regime-barrier/sandbox";

export const runRegimeBarrierSelfCheck=()=>{
  const checks=[
    {
      name:"near transition boundary is reachable in tested state space",
      passed:Boolean(openBarrierNear.best?.achieved),
    },
    {
      name:"near liquidity boundary is reachable in tested state space",
      passed:Boolean(liquidityBarrierNear.best?.achieved),
    },
    {
      name:"near transition state is closer than far stable state",
      passed:
        openBarrierNear.barrierCost!==null&&
        openBarrierFar.barrierCost!==null&&
        openBarrierNear.barrierCost<openBarrierFar.barrierCost,
    },
    {
      name:"transition barrier is driven by transition-state features",
      passed:Boolean(openBarrierNear.best?.features.some(x=>["transitionRate","tempo","shotPressure"].includes(x))),
    },
    {
      name:"liquidity barrier is driven by liquidity-state features",
      passed:Boolean(liquidityBarrierNear.best?.features.some(x=>["spreadStress","suspensionRisk","priceVelocity"].includes(x))),
    },
    {
      name:"reported barriers have positive finite normalized cost",
      passed:[openBarrierNear,openBarrierFar,liquidityBarrierNear].every(x=>x.barrierCost!==null&&Number.isFinite(x.barrierCost)&&x.barrierCost>0),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      openNear:openBarrierNear,
      openFar:openBarrierFar,
      liquidityNear:liquidityBarrierNear,
    },
  };
};
