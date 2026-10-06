import {
  conformalBoundary,
  healthyBoundary,
  leakageBoundary,
  oodBoundary,
  semanticBoundary,
  weakBoundary,
} from "@/lib/abstention/sandbox";

export const runAbstentionSelfCheck=()=>{
  const checks=[
    {name:"healthy evidence can reach shadow candidate",passed:healthyBoundary.decision==="SHADOW_CANDIDATE"},
    {name:"large gap cannot override leakage",passed:leakageBoundary.decision==="ABSTAIN"&&leakageBoundary.blockers.length>0},
    {name:"semantic freeze forces abstention",passed:semanticBoundary.decision==="ABSTAIN"},
    {name:"OOD state forces abstention",passed:oodBoundary.decision==="ABSTAIN"},
    {name:"conformal uncertainty hard block forces abstention",passed:conformalBoundary.decision==="ABSTAIN"&&conformalBoundary.blockers.some(x=>x.includes("conformal"))},
    {name:"weak but non-fatal evidence becomes watch",passed:weakBoundary.decision==="WATCH"},
    {name:"evidence margins remain bounded",passed:[healthyBoundary,leakageBoundary,semanticBoundary,oodBoundary,conformalBoundary,weakBoundary].every(x=>x.evidenceMargin>=0&&x.evidenceMargin<=1)},
  ];
  return{passed:checks.every(x=>x.passed),checks,sample:{healthy:healthyBoundary,leakage:leakageBoundary,semantic:semanticBoundary,ood:oodBoundary,conformal:conformalBoundary,weak:weakBoundary}};
};
