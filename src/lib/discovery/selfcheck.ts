import { benjaminiHochberg, sequentialAlphaSpend } from "@/lib/discovery/engine";
import { discoveryControl, discoveryTests } from "@/lib/discovery/sandbox";

export const runDiscoveryControlSelfCheck=()=>{
  const bh=benjaminiHochberg(discoveryTests,.05);
  const seq=sequentialAlphaSpend(discoveryTests,.05,.8);
  const checks=[
    {name:"strongest hypotheses survive BH",passed:bh.filter(x=>x.accepted).some(x=>x.id==="h1")&&bh.filter(x=>x.accepted).some(x=>x.id==="h2")},
    {name:"weak hypotheses are rejected by BH",passed:bh.filter(x=>x.id==="h10")[0]?.accepted===false},
    {name:"BH thresholds are monotone",passed:bh.every((x,i)=>i===0||x.threshold>=bh[i-1].threshold)},
    {name:"sequential alpha spend stays within budget",passed:(seq.at(-1)?.cumulativeAlphaSpent??0)<=.05+.000001},
    {name:"streaming thresholds shrink over time",passed:seq.every((x,i)=>i===0||x.alphaAllocated<=seq[i-1].alphaAllocated+.0000001)},
    {name:"discovery count does not exceed tested count",passed:discoveryControl.discoveries<=discoveryControl.tested},
  ];
  return{passed:checks.every(x=>x.passed),checks,sample:discoveryControl};
};
