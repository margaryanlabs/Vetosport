import {
  liquidityRegime,
  oneSpikeRegime,
  stableRegime,
  transitionRegime,
} from "@/lib/regime/sandbox";

export const runRegimeChangeSelfCheck=()=>{
  const firstTransition=transitionRegime.changePoints[0];
  const firstLiquidity=liquidityRegime.changePoints[0];

  const checks=[
    {
      name:"stable sequence does not create a hard change point",
      passed:stableRegime.changePoints.length===0&&stableRegime.regime==="STABLE_CONTROL",
    },
    {
      name:"single extreme spike does not become structural regime change",
      passed:oneSpikeRegime.changePoints.length===0,
    },
    {
      name:"persistent transition shift is detected",
      passed:transitionRegime.changePoints.length>0&&Boolean(firstTransition),
    },
    {
      name:"transition shift is classified as open transition",
      passed:transitionRegime.regime==="OPEN_TRANSITION",
    },
    {
      name:"liquidity shock is detected and classified separately",
      passed:liquidityRegime.changePoints.length>0&&liquidityRegime.regime==="FRAGILE_LIQUIDITY"&&Boolean(firstLiquidity),
    },
    {
      name:"hard changes require persistence",
      passed:[
        ...transitionRegime.changePoints,
        ...liquidityRegime.changePoints,
      ].every(x=>x.persistence>=3),
    },
    {
      name:"change probabilities remain bounded",
      passed:[
        stableRegime,
        oneSpikeRegime,
        transitionRegime,
        liquidityRegime,
      ].every(result=>result.frames.every(x=>x.changeProbability>=0&&x.changeProbability<=1)),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      stable:stableRegime,
      spike:oneSpikeRegime,
      transition:transitionRegime,
      liquidity:liquidityRegime,
    },
  };
};
