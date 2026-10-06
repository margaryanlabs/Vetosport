import type { FusedField, LatentDimensionSpec, SensorIntegrityAnalysis, SensorObservation, SensorValue } from "@/lib/integrity/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const same=(a:SensorValue,b:SensorValue)=>{
  if(typeof a==="number"&&typeof b==="number"){
    const s=Math.max(1,Math.abs(a),Math.abs(b));
    return Math.abs(a-b)/s<=0.015;
  }
  return a===b;
};

const fuse=(field:string,rows:SensorObservation[]):FusedField=>{
  if(!rows.length)return{field,value:null,confidence:0,independentGroups:0,observations:0,disagreement:1,freshness:0,status:"MISSING"};
  const groups=new Map<string,SensorObservation>();
  for(const r of rows){
    const prev=groups.get(r.dependencyGroup);
    if(!prev||r.providerReliability>prev.providerReliability)groups.set(r.dependencyGroup,r);
  }
  const reps=[...groups.values()];
  const weight=(r:SensorObservation)=>r.providerReliability*clamp(1-r.sourceAgeMs/15000)*clamp(1-r.uncertainty);
  let best=reps[0],support=-1;
  for(const c of reps){
    const x=reps.reduce((s,r)=>s+(same(c.value,r.value)?weight(r):0),0);
    if(x>support){support=x;best=c;}
  }
  const total=reps.reduce((s,r)=>s+weight(r),0);
  const disagree=reps.reduce((s,r)=>s+(same(best.value,r.value)?0:weight(r)),0);
  const disagreement=total?clamp(disagree/total):1;
  const freshness=reps.reduce((s,r)=>s+clamp(1-r.sourceAgeMs/15000),0)/reps.length;
  const reliability=reps.reduce((s,r)=>s+r.providerReliability,0)/reps.length;
  const confidence=clamp(.34*(1-disagreement)+.24*freshness+.22*reliability+.20*clamp(reps.length/3));
  const status:FusedField["status"]=disagreement>=.28?"CONFLICT":confidence<.58?"DEGRADED":"HEALTHY";
  return{field,value:best.value,confidence,independentGroups:reps.length,observations:rows.length,disagreement,freshness,status};
};

export const analyzeSensorIntegrity=({observations,dimensions}:{observations:SensorObservation[];dimensions:LatentDimensionSpec[]}):SensorIntegrityAnalysis=>{
  const names=[...new Set([...observations.map(x=>x.field),...dimensions.flatMap(x=>x.requiredFields)])];
  const fields=names.map(n=>fuse(n,observations.filter(x=>x.field===n)));
  const dims=dimensions.map(spec=>{
    const req=spec.requiredFields.map(n=>fields.find(x=>x.field===n));
    const missing=spec.requiredFields.filter(n=>!fields.find(x=>x.field===n)||fields.find(x=>x.field===n)?.status==="MISSING");
    const weak=req.filter((x):x is FusedField=>!!x).filter(x=>x.confidence<spec.minimumFieldConfidence||x.status==="CONFLICT").map(x=>x.field);
    const groups=new Set(observations.filter(o=>spec.requiredFields.includes(o.field)).map(o=>o.dependencyGroup));
    const avg=req.reduce((s,x)=>s+(x?.confidence??0),0)/Math.max(1,req.length);
    const coverage=1-missing.length/Math.max(1,spec.requiredFields.length);
    const conflicts=req.filter(x=>x?.status==="CONFLICT").length/Math.max(1,req.length);
    const score=clamp(.45*avg+.3*coverage+.2*clamp(groups.size/Math.max(1,spec.minimumIndependentGroups))-.3*conflicts+.05*(1-weak.length/Math.max(1,spec.requiredFields.length)));
    return{id:spec.id,label:spec.label,score,identifiable:missing.length===0&&weak.length===0&&groups.size>=spec.minimumIndependentGroups&&score>=.68,missingFields:missing,weakFields:weak,independentGroups:groups.size};
  });
  const integrityScore=fields.reduce((s,x)=>s+x.confidence*(1-.55*x.disagreement),0)/Math.max(1,fields.length);
  const identifiabilityScore=dims.reduce((s,x)=>s+x.score,0)/Math.max(1,dims.length);
  const independentEvidenceRatio=clamp(new Set(observations.map(x=>x.dependencyGroup)).size/Math.max(1,observations.length));
  const conflict=fields.some(x=>x.status==="CONFLICT"), unidentified=dims.some(x=>!x.identifiable);
  const hardBlock=fields.some(x=>["score","clock"].includes(x.field)&&x.status==="CONFLICT")||dims.some(x=>x.score<.45);
  const overallStatus:SensorIntegrityAnalysis["overallStatus"]=hardBlock&&unidentified?"UNIDENTIFIED":conflict?"CONFLICT":unidentified||integrityScore<.68?"DEGRADED":"HEALTHY";
  const reasons=[...fields.filter(x=>x.status!=="HEALTHY").map(x=>`${x.field}: ${x.status.toLowerCase()} sensor state.`),...dims.filter(x=>!x.identifiable).map(x=>`${x.label}: latent state not identifiable.`)];
  return{fields,dimensions:dims,integrityScore,identifiabilityScore,independentEvidenceRatio,overallStatus,hardBlock,reasons};
};
