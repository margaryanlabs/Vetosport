import { biasedCensoring, cleanCensoring, thinCensoring } from "@/lib/censoring/sandbox";

export const runSuspensionCensoringSelfCheck=()=>{
  const checks=[
    {name:"clean availability stays clean",passed:cleanCensoring.status==="CLEAN"&&!cleanCensoring.hardBlock},
    {name:"best edges during suspension trigger block",passed:biasedCensoring.status==="BLOCK"&&biasedCensoring.hardBlock},
    {name:"biased raw edge exceeds executable edge",passed:biasedCensoring.rawMeanGapPp>biasedCensoring.executableMeanGapPp},
    {name:"thin availability is downgraded",passed:["WATCH","BLOCK"].includes(thinCensoring.status)},
    {name:"bias scores bounded",passed:[cleanCensoring,biasedCensoring,thinCensoring].every(x=>x.biasScore>=0&&x.biasScore<=1)},
  ];
  return{passed:checks.every(x=>x.passed),checks,sample:{clean:cleanCensoring,biased:biasedCensoring,thin:thinCensoring}};
};
