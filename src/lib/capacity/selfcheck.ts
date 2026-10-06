import { capacityScenarios } from "@/lib/capacity/sandbox";

export const runCapacitySelfCheck=()=>{
  const {healthy,thin,fakeEdge,slow}=capacityScenarios;
  const checks=[
    {name:"healthy market remains tradable",passed:["TRADEABLE","DEEP"].includes(healthy.class)&&!healthy.hardBlock},
    {name:"thin market is downgraded",passed:["FRAGILE","THIN"].includes(thin.class)},
    {name:"large displayed edge with no capacity is blocked",passed:fakeEdge.class==="ZERO"&&fakeEdge.hardBlock},
    {name:"slow acceptance destroys decaying edge",passed:slow.hardBlock||slow.class==="ZERO"||slow.postExecutionGapPp<1},
    {name:"post-execution gap never exceeds robust gap",passed:[healthy,thin,fakeEdge,slow].every(x=>x.postExecutionGapPp<=x.robustGapPp)},
    {name:"capacity scores bounded",passed:[healthy,thin,fakeEdge,slow].every(x=>x.capacityScore>=0&&x.capacityScore<=1)},
  ];
  return{passed:checks.every(x=>x.passed),checks,sample:capacityScenarios};
};
