import type { RegimeCoherenceInput, RegimeCoherenceResult } from "@/lib/regime-coherence/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

export const evaluateRegimeCoherence=(input:RegimeCoherenceInput):RegimeCoherenceResult=>{
  const regimeMatches=input.governedRegime===input.signalRegimeSnapshot;
  const predatesRegime=input.signalCreatedAtMs<input.regimeEnteredAtMs;
  const transitionFragile=
    input.transitionHazard>=.76&&
    input.modelAdaptationSpeed<.55;

  const reasons:string[]=[];
  if(!regimeMatches)reasons.push("signal snapshot regime does not match governed regime");
  if(predatesRegime)reasons.push("signal was created before the current governed regime entered");
  if(transitionFragile)reasons.push("imminent transition hazard exceeds model adaptation capacity");

  const action:RegimeCoherenceResult["action"]=
    !regimeMatches||predatesRegime
      ?"ABSTAIN"
      :transitionFragile
        ?"CAP_TO_WATCH"
        :"PRESERVE";

  const authorityMultiplier=
    action==="ABSTAIN"
      ?0
      :action==="CAP_TO_WATCH"
        ?clamp(.55+.25*input.modelAdaptationSpeed-.20*input.transitionHazard)
        :1;

  return{
    ...input,
    regimeMatches,
    predatesRegime,
    transitionFragile,
    action,
    authorityMultiplier,
    reasons,
  };
};
