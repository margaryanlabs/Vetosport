import { cleanLeakageMonitor, leakingLeakageMonitor, warningLeakageMonitor } from "@/lib/leakage/sandbox";

export const runLeakageSelfCheck=()=>{
  const future=leakingLeakageMonitor.controls.find(x=>x.id==="future-close");
  const checks=[
    {name:"clean negative controls remain clean",passed:cleanLeakageMonitor.status==="CLEAN"&&!cleanLeakageMonitor.hardBlock},
    {name:"future proxy triggers hard leakage block",passed:leakingLeakageMonitor.status==="LEAKAGE"&&leakingLeakageMonitor.hardBlock&&future?.temporalLeak===true},
    {name:"warning control does not hard block",passed:warningLeakageMonitor.status==="WARNING"&&!warningLeakageMonitor.hardBlock},
    {name:"leakage lowers clean rate",passed:leakingLeakageMonitor.cleanRate<cleanLeakageMonitor.cleanRate},
    {name:"scores remain bounded",passed:[cleanLeakageMonitor,warningLeakageMonitor,leakingLeakageMonitor].every(x=>x.leakageScore>=0&&x.leakageScore<=1)},
  ];
  return{passed:checks.every(x=>x.passed),checks,sample:{clean:cleanLeakageMonitor,warning:warningLeakageMonitor,leaking:leakingLeakageMonitor}};
};
