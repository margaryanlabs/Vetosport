import type {
  TransitionAuthorityInput,
  TransitionAuthorityResult,
} from "@/lib/transition-authority/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

export const evaluateTransitionAuthority=(
  input:TransitionAuthorityInput,
):TransitionAuthorityResult=>{
  const selectedProbability=
    input.executionHorizon===1
      ?input.estimate.p1
      :input.executionHorizon===3
        ?input.estimate.p3
        :input.estimate.p5;

  const calibrationTrusted=
    input.estimate.status==="CALIBRATED"&&
    input.estimate.source==="REGIME";

  const adaptationRisk=clamp(
    selectedProbability*(1-clamp(input.modelAdaptationSpeed))
  );

  const reasons:string[]=[];
  if(!input.regimeCoherent)reasons.push("signal regime snapshot is stale");
  if(!calibrationTrusted)reasons.push("transition probability is not regime-calibrated");
  if(selectedProbability>=.55)reasons.push(`transition probability within execution horizon is ${(selectedProbability*100).toFixed(0)}%`);
  if(input.modelAdaptationSpeed<.55)reasons.push(`model adaptation speed is only ${(input.modelAdaptationSpeed*100).toFixed(0)}%`);

  const action:TransitionAuthorityResult["action"]=
    !input.regimeCoherent
      ?"ABSTAIN"
      :calibrationTrusted&&selectedProbability>=.82&&input.modelAdaptationSpeed<.35
        ?"ABSTAIN"
        :!calibrationTrusted||adaptationRisk>=.28
          ?"CAP_TO_WATCH"
          :"PRESERVE";

  const authorityMultiplier=
    action==="ABSTAIN"
      ?0
      :action==="CAP_TO_WATCH"
        ?clamp(.72-.55*adaptationRisk)
        :1;

  return{
    action,
    selectedProbability,
    executionHorizon:input.executionHorizon,
    adaptationRisk,
    calibrationTrusted,
    authorityMultiplier,
    reasons,
  };
};
