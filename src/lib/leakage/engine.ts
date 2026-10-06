import type { LeakageControlResult, LeakageMonitorResult, NegativeControlTest } from "@/lib/leakage/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

const evaluate=(test:NegativeControlTest):LeakageControlResult=>{
  const excessEffect=Math.max(0,Math.abs(test.observedEffect)-Math.abs(test.expectedMaxAbsEffect));
  const temporalLeak=
    typeof test.featureAvailableAtMs==="number" &&
    typeof test.decisionAtMs==="number" &&
    test.featureAvailableAtMs>test.decisionAtMs;

  const statisticalLeak=
    excessEffect>0 &&
    test.qValue<=.05 &&
    Math.abs(test.observedEffect)>=Math.max(.002,Math.abs(test.expectedMaxAbsEffect)*1.5);

  const suspicious=
    !temporalLeak &&
    !statisticalLeak &&
    ((test.qValue<=.1&&excessEffect>0)||Math.abs(test.observedEffect)>=Math.abs(test.expectedMaxAbsEffect)*1.25);

  const score=clamp(
    (temporalLeak?.72:0)+
    (statisticalLeak?.58:0)+
    clamp(excessEffect/Math.max(.001,Math.abs(test.expectedMaxAbsEffect)*2))*.25+
    clamp((.1-test.qValue)/.1)*.15
  );

  const status:LeakageControlResult["status"]=
    temporalLeak||statisticalLeak?"LEAKAGE":
    suspicious?"WARNING":
    "CLEAN";

  const reasons:string[]=[];
  if(temporalLeak)reasons.push("feature became available after decision timestamp");
  if(statisticalLeak)reasons.push("negative control shows statistically meaningful excess effect");
  if(suspicious)reasons.push("control effect is larger than expected null band");

  return{...test,status,excessEffect,temporalLeak,score,reasons};
};

export const evaluateLeakageControls=(tests:NegativeControlTest[]):LeakageMonitorResult=>{
  const controls=tests.map(evaluate);
  const leaks=controls.filter(x=>x.status==="LEAKAGE");
  const warnings=controls.filter(x=>x.status==="WARNING");
  const cleanRate=controls.length?controls.filter(x=>x.status==="CLEAN").length/controls.length:0;
  const leakageScore=controls.length?controls.reduce((s,x)=>s+x.score,0)/controls.length:1;
  const hardBlock=leaks.length>0;
  const status:LeakageMonitorResult["status"]=hardBlock?"LEAKAGE":warnings.length?"WARNING":"CLEAN";
  const reasons=[...leaks,...warnings].flatMap(x=>x.reasons.map(reason=>`${x.label}: ${reason}`));
  return{controls,leakageScore,cleanRate,hardBlock,status,reasons};
};
