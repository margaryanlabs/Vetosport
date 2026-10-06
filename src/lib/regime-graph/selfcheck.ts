import {
  commonPath,
  earlyCommonPath,
  rarePath,
  regimeGraph,
} from "@/lib/regime-graph/sandbox";

export const runRegimeGraphSelfCheck=()=>{
  const rowSums=regimeGraph.regimes.map(from=>
    regimeGraph.edges
      .filter(edge=>edge.from===from)
      .reduce((sum,edge)=>sum+edge.probability,0)
  );

  const checks=[
    {
      name:"transition rows are probability-normalized",
      passed:rowSums.every(sum=>Math.abs(sum-1)<1e-9),
    },
    {
      name:"frequent stable-to-open path outranks unseen pressure-to-liquidity path",
      passed:commonPath.transitionProbability>rarePath.transitionProbability,
    },
    {
      name:"Dirichlet smoothing keeps unseen paths non-zero",
      passed:rarePath.transitionProbability>0,
    },
    {
      name:"rare short-dwell jump is flagged rare or watch",
      passed:["RARE","WATCH"].includes(rarePath.status),
    },
    {
      name:"same common transition becomes more plausible after dwell",
      passed:commonPath.plausibility>earlyCommonPath.plausibility,
    },
    {
      name:"dwell statistics are finite and non-negative",
      passed:regimeGraph.dwell.every(x=>Number.isFinite(x.meanFrames)&&x.meanFrames>=0&&x.medianFrames>=0&&x.p90Frames>=0),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      common:commonPath,
      early:earlyCommonPath,
      rare:rarePath,
      dwell:regimeGraph.dwell,
    },
  };
};
