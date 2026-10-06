import type { RegimeExpertProfile, RegimeExpertRouting, RegimeRouterContext, RoutedExpert } from "@/lib/regime-router/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

const capAndNormalize=(rows:{id:string;value:number}[],cap=.42)=>{
  const values=new Map(rows.map(x=>[x.id,Math.max(0,x.value)]));
  for(let iter=0;iter<8;iter++){
    const total=[...values.values()].reduce((s,v)=>s+v,0);
    if(total<=0)break;
    const normalized=[...values.entries()].map(([id,v])=>[id,v/total] as const);
    const over=normalized.filter(([,w])=>w>cap);
    if(!over.length)return new Map(normalized);
    const locked=new Set(over.map(([id])=>id));
    const lockedMass=over.length*cap;
    const free=normalized.filter(([id])=>!locked.has(id));
    const freeRaw=free.reduce((s,[id])=>s+(values.get(id)??0),0);
    for(const [id] of over)values.set(id,cap);
    for(const [id] of free){
      const share=freeRaw>0?(values.get(id)??0)/freeRaw:1/Math.max(1,free.length);
      values.set(id,share*Math.max(0,1-lockedMass));
    }
  }
  const total=[...values.values()].reduce((s,v)=>s+v,0);
  return new Map([...values.entries()].map(([id,v])=>[id,total>0?v/total:0]));
};

export const routeExpertsByRegime=(
  profiles:RegimeExpertProfile[],
  context:RegimeRouterContext,
):RegimeExpertRouting=>{
  const fastRegime=["OPEN_TRANSITION","FRAGILE_LIQUIDITY","DISLOCATED"].includes(context.regime);
  const freshness=Math.exp(-Math.max(0,context.structuralChangeAgeMs)/Math.max(1,context.signalHalfLifeMs));

  const raw=profiles.map(profile=>{
    const regimeReliability=clamp(profile.regimeReliability[context.regime]);
    const dependencyQuality=clamp(profile.independence*(1-clamp(profile.dependencyPenalty)));
    const adaptationPenalty=fastRegime
      ? clamp((1-profile.adaptationSpeed)*freshness*.72)
      : clamp((1-profile.adaptationSpeed)*freshness*.18);

    const regimeMultiplier=(1-context.regimeConfidence)+context.regimeConfidence*regimeReliability;
    const rawAuthority=Math.max(
      0,
      profile.baseWeight*
      clamp(profile.confidence)*
      dependencyQuality*
      regimeMultiplier*
      (1-adaptationPenalty)
    );

    const reasons:string[]=[];
    if(regimeReliability<.55)reasons.push("weak historical reliability in current regime");
    if(adaptationPenalty>.25)reasons.push("slow adaptation after structural shift");
    if(profile.dependencyPenalty>.35)reasons.push("shared-dependency penalty");
    if(profile.independence<.55)reasons.push("limited independent evidence");

    return{profile,regimeReliability,adaptationPenalty,rawAuthority,reasons};
  });

  const capped=capAndNormalize(raw.map(x=>({id:x.profile.id,value:x.rawAuthority})),.42);
  const experts:RoutedExpert[]=raw.map(x=>{
    const weight=capped.get(x.profile.id)??0;
    const status:RoutedExpert["status"]=
      weight<.07||x.rawAuthority<=.015?"SUPPRESSED":
      weight<.15?"REDUCED":
      "ACTIVE";
    return{
      id:x.profile.id,
      label:x.profile.label,
      rawAuthority:x.rawAuthority,
      weight,
      regimeReliability:x.regimeReliability,
      adaptationPenalty:x.adaptationPenalty,
      status,
      reasons:x.reasons,
    };
  }).sort((a,b)=>b.weight-a.weight);

  const hhi=experts.reduce((s,x)=>s+x.weight*x.weight,0);
  const effectiveExperts=hhi>0?1/hhi:0;
  const concentration=experts.slice(0,2).reduce((s,x)=>s+x.weight,0);
  const maxWeight=experts[0]?.weight??0;
  const dominantExpertId=experts[0]?.id??null;
  const reasons:string[]=[];
  if(fastRegime&&freshness>.5)reasons.push("recent fast regime: adaptation speed materially affects authority");
  if(effectiveExperts<3)reasons.push("council effective diversity is compressed");
  if(maxWeight>=.4)reasons.push("anti-dominance cap is active near 42%");

  return{
    regime:context.regime,
    regimeConfidence:context.regimeConfidence,
    experts,
    effectiveExperts,
    concentration,
    maxWeight,
    dominantExpertId,
    reasons,
  };
};
