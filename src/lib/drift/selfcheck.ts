import { detectSemanticDrift } from "@/lib/drift/engine";
import { baseSemantic, breakingDrift, stableDrift } from "@/lib/drift/sandbox";

export const runSemanticDriftSelfCheck=()=>{
  const identical=detectSemanticDrift(baseSemantic,{...baseSemantic});
  const checks=[
    {name:"identical version has no drift",passed:identical.changes.length===0&&!identical.breaking},
    {name:"alias addition is non-breaking",passed:stableDrift.changes.length===1&&!stableDrift.breaking&&!stableDrift.freezeRequired},
    {name:"overtime or period change is breaking",passed:breakingDrift.breaking&&breakingDrift.freezeRequired},
    {name:"schema type change is breaking",passed:breakingDrift.changes.some(x=>x.path==="schema.line"&&x.severity==="BREAKING")},
    {name:"breaking drift requires replay repair actions",passed:breakingDrift.actions.some(x=>x.includes("re-run point-in-time replay"))},
    {name:"drift score bounded",passed:[stableDrift,breakingDrift].every(x=>x.driftScore>=0&&x.driftScore<=1)},
  ];
  return{passed:checks.every(x=>x.passed),checks,sample:{stable:stableDrift,breaking:breakingDrift}};
};
