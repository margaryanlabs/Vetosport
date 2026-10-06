import { evaluateTransitionAuthority } from "@/lib/transition-authority/engine";
import type { HazardCalibrationEstimate } from "@/lib/hazard-calibration/types";
import type { AuthorityFrontierInput, AuthorityFrontierPoint, AuthorityFrontierResult } from "@/lib/authority-frontier/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

const point=(p:number,a:number,trusted:boolean,coherent:boolean):AuthorityFrontierPoint=>{
  const probability=clamp(p);
  const adaptation=clamp(a);
  const estimate:HazardCalibrationEstimate={
    regime:"OPEN_TRANSITION",
    hazardScore:probability,
    p1:probability,
    p3:probability,
    p5:probability,
    source:trusted?"REGIME":"POOLED",
    status:trusted?"CALIBRATED":"UNTRUSTED",
    reasons:[],
  };
  const authority=evaluateTransitionAuthority({
    estimate,
    executionHorizon:3,
    modelAdaptationSpeed:adaptation,
    regimeCoherent:coherent,
  });
  return{
    transitionProbability:probability,
    modelAdaptationSpeed:adaptation,
    adaptationRisk:authority.adaptationRisk,
    action:authority.action,
  };
};

export const buildAuthorityFrontier=(input:AuthorityFrontierInput):AuthorityFrontierResult=>{
  const p=clamp(input.transitionProbability);
  const a=clamp(input.modelAdaptationSpeed);
  const current=point(p,a,input.calibrationTrusted,input.regimeCoherent);

  const probabilityToWatch=
    !input.regimeCoherent||!input.calibrationTrusted||a>=1
      ?null
      :clamp(.28/Math.max(1e-9,1-a))-p;

  const adaptationFloorToPreserve=
    !input.regimeCoherent||!input.calibrationTrusted||p<=0
      ?null
      :clamp(1-.28/p);

  const probabilityToAbstain=
    !input.regimeCoherent
      ?0
      :a<.35
        ?Math.max(0,.82-p)
        :null;

  const adaptationCeilingForAbstain=.35;

  const riskMargin=.28-p*(1-a);
  const abstainProbabilityMargin=.82-p;
  const abstainAdaptationMargin=a-.35;

  const safetyMargin=
    current.action==="ABSTAIN"
      ?0
      :Math.max(
          0,
          Math.min(
            input.calibrationTrusted?Math.max(0,riskMargin):0,
            a<.35?Math.max(0,abstainProbabilityMargin):1,
            p>=.82?Math.max(0,abstainAdaptationMargin):1,
          )
        );

  const pGrid=[.1,.3,.5,.7,.85,.95];
  const aGrid=[.2,.4,.6,.8,.95];
  const grid=pGrid.flatMap(probability=>
    aGrid.map(adaptation=>point(
      probability,
      adaptation,
      input.calibrationTrusted,
      input.regimeCoherent,
    ))
  );

  const reasons:string[]=[];
  if(current.action==="PRESERVE")reasons.push("current point is inside full-authority region");
  if(current.action==="CAP_TO_WATCH")reasons.push("current point lies inside reduced-authority region");
  if(current.action==="ABSTAIN")reasons.push("current point lies inside abstention region");
  if(probabilityToWatch!==null&&probabilityToWatch>0)reasons.push(`+${(probabilityToWatch*100).toFixed(1)} pp transition probability reaches WATCH boundary`);
  if(adaptationFloorToPreserve!==null)reasons.push(`preserve requires adaptation ≥ ${(adaptationFloorToPreserve*100).toFixed(0)}% at current probability`);
  if(probabilityToAbstain!==null)reasons.push(`ABSTAIN probability boundary is ${(Math.max(p,.82)*100).toFixed(0)}% while adaptation <35%`);

  return{
    current,
    probabilityToWatch:probabilityToWatch===null?null:Math.max(0,probabilityToWatch),
    adaptationFloorToPreserve,
    probabilityToAbstain,
    adaptationCeilingForAbstain,
    safetyMargin,
    grid,
    reasons,
  };
};
