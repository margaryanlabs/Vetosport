import type { RegimeLabel } from "@/lib/regime/types";
import type { TransitionHazardAnalysis, TransitionHazardFrame, TransitionHazardStatus } from "@/lib/transition-hazard/types";
import type { ChangePointFrame } from "@/lib/regime/types";

const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));

const trend=(frames:ChangePointFrame[],index:number)=>{
  const start=Math.max(0,index-3);
  const slice=frames.slice(start,index+1);
  if(slice.length<2)return 0;
  const first=slice[0].changeProbability;
  const last=slice[slice.length-1].changeProbability;
  return clamp((last-first)/.35,-1,1);
};

const alternativeState=(frame:ChangePointFrame,activeRegime:RegimeLabel)=>{
  const entries=(Object.entries(frame.regimeScores) as [RegimeLabel,number][])
    .filter(([label])=>label!==activeRegime)
    .sort((a,b)=>b[1]-a[1]);
  const dominant=entries[0]??null;
  const alternativeMass=clamp(1-(frame.regimeScores[activeRegime]??0));
  return{
    dominantAlternative:dominant?.[0]??null,
    dominantAlternativeScore:dominant?.[1]??0,
    alternativeMass,
  };
};

const statusFor=(score:number,persistence:number):TransitionHazardStatus=>{
  if(score>=.76&&persistence>=2)return"IMMINENT";
  if(score>=.56)return"ARMED";
  if(score>=.36)return"PRECURSOR";
  return"STABLE";
};

export const analyzeTransitionHazard=(
  frames:ChangePointFrame[],
  activeRegime:RegimeLabel,
):TransitionHazardAnalysis=>{
  const out:TransitionHazardFrame[]=frames.map((frame,index)=>{
    const alt=alternativeState(frame,activeRegime);
    const changeTrend=trend(frames,index);
    const persistenceFactor=clamp(frame.persistence/4);
    const ewmaFactor=clamp(frame.ewmaShift/2.2);
    const cusumFactor=clamp(frame.cusum/7);
    const disagreementFactor=frame.regime===activeRegime?0:alt.dominantAlternativeScore;
    const structuralPressure=clamp(
      .34*frame.changeProbability+
      .19*persistenceFactor+
      .16*ewmaFactor+
      .10*cusumFactor+
      .13*alt.alternativeMass+
      .08*Math.max(0,changeTrend)
    );

    const hazardScore=clamp(
      .82*structuralPressure+
      .18*disagreementFactor
    );

    return{
      timeMs:frame.timeMs,
      activeRegime,
      rawRegime:frame.regime,
      hazardScore,
      status:statusFor(hazardScore,frame.persistence),
      alternativeMass:alt.alternativeMass,
      dominantAlternative:alt.dominantAlternative,
      changeTrend,
      structuralPressure,
      persistence:frame.persistence,
      hardChange:frame.hardChange,
    };
  });

  const first=(status:TransitionHazardStatus)=>out.find(x=>x.status===status)??null;
  const firstHardChange=frames.find(x=>x.hardChange)??null;
  const firstArmed=first("ARMED");
  const firstImminent=first("IMMINENT");
  const firstPrecursor=first("PRECURSOR");
  const warningFrame=firstImminent??firstArmed??firstPrecursor;
  const leadMsToHardChange=
    firstHardChange&&warningFrame&&warningFrame.timeMs<firstHardChange.timeMs
      ? firstHardChange.timeMs-warningFrame.timeMs
      : null;
  const current=out[out.length-1]??null;
  const reasons:string[]=[];
  if(firstPrecursor)reasons.push(`precursor state first appeared at t=${firstPrecursor.timeMs}ms`);
  if(firstArmed)reasons.push(`transition hazard armed at t=${firstArmed.timeMs}ms`);
  if(firstImminent)reasons.push(`transition became imminent at t=${firstImminent.timeMs}ms`);
  if(leadMsToHardChange!==null)reasons.push(`warning preceded confirmed hard change by ${leadMsToHardChange}ms`);
  if(current?.dominantAlternative)reasons.push(`dominant alternative regime: ${current.dominantAlternative}`);

  return{
    activeRegime,
    frames:out,
    current,
    firstPrecursor,
    firstArmed,
    firstImminent,
    firstHardChange,
    leadMsToHardChange,
    status:current?.status??"STABLE",
    hazardScore:current?.hazardScore??0,
    reasons,
  };
};
