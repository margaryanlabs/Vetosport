import { analyzeRegimeChange } from "@/lib/regime/engine";
import type { RegimeBarrierCandidate, RegimeBarrierFeature, RegimeBarrierResult } from "@/lib/regime-barrier/types";
import type { RegimeLabel, RegimeObservation } from "@/lib/regime/types";

const plans:Record<RegimeLabel,Array<Array<[RegimeBarrierFeature,1|-1]>>>={
  STABLE_CONTROL:[],
  OPEN_TRANSITION:[
    [["transitionRate",1]],
    [["tempo",1]],
    [["shotPressure",1]],
    [["transitionRate",1],["tempo",1]],
    [["transitionRate",1],["shotPressure",1]],
  ],
  PRESSURE_SIEGE:[
    [["shotPressure",1]],
    [["territorialControl",1]],
    [["shotPressure",1],["territorialControl",1]],
    [["shotPressure",1],["tempo",-1]],
  ],
  FRAGILE_LIQUIDITY:[
    [["spreadStress",1]],
    [["suspensionRisk",1]],
    [["priceVelocity",1]],
    [["spreadStress",1],["suspensionRisk",1]],
    [["spreadStress",1],["priceVelocity",1]],
  ],
  DISLOCATED:[
    [["priceVelocity",1]],
    [["spreadStress",1]],
    [["priceVelocity",1],["spreadStress",1]],
  ],
};

const perturb=(
  rows:RegimeObservation[],
  baseline:ReturnType<typeof analyzeRegimeChange>["baseline"],
  plan:Array<[RegimeBarrierFeature,1|-1]>,
  sigma:number,
  sustainFrames:number,
)=>{
  const start=Math.max(0,rows.length-sustainFrames);
  return rows.map((row,index)=>{
    if(index<start)return row;
    const next={...row};
    for(const [feature,direction] of plan){
      next[feature]=row[feature]+direction*sigma*baseline[feature].std;
    }
    return next;
  });
};

export const findRegimeBarrier=(
  rows:RegimeObservation[],
  targetRegime:RegimeLabel,
  {
    sustainFrames=4,
    maxSigma=30,
    step=.5,
    baselineCount=10,
  }:{
    sustainFrames?:number;
    maxSigma?:number;
    step?:number;
    baselineCount?:number;
  }={}
):RegimeBarrierResult=>{
  const initial=analyzeRegimeChange(rows,{baselineCount});
  const candidates:RegimeBarrierCandidate[]=[];
  const initialConfirmed=
    initial.regime===targetRegime&&
    Boolean(initial.current?.hardChange)&&
    (initial.current?.changeProbability??0)>=.72;

  if(initialConfirmed){
    const zero:RegimeBarrierCandidate={
      features:[],
      sigma:0,
      cost:0,
      achieved:true,
      resultingRegime:initial.regime,
      changeProbability:initial.current?.changeProbability??0,
      hardChange:true,
    };
    return{
      fromRegime:initial.changePoints.length?initial.regime:"STABLE_CONTROL",
      targetRegime,
      sustainFrames,
      best:zero,
      candidates:[zero],
      barrierCost:0,
      fragile:true,
      reasons:["target structural regime is already confirmed; counterfactual barrier is zero"],
    };
  }

  for(const plan of plans[targetRegime]){
    let bestForPlan:RegimeBarrierCandidate|null=null;

    for(let sigma=step;sigma<=maxSigma+1e-9;sigma+=step){
      const shifted=perturb(rows,initial.baseline,plan,sigma,sustainFrames);
      const result=analyzeRegimeChange(shifted,{baselineCount});
      const current=result.current;
      const achieved=
        result.regime===targetRegime&&
        Boolean(current?.hardChange)&&
        (current?.changeProbability??0)>=.72;

      const candidate:RegimeBarrierCandidate={
        features:plan.map(([feature])=>feature),
        sigma:Number(sigma.toFixed(3)),
        cost:Number((sigma*Math.sqrt(plan.length)).toFixed(3)),
        achieved,
        resultingRegime:result.regime,
        changeProbability:current?.changeProbability??0,
        hardChange:Boolean(current?.hardChange),
      };

      if(achieved){
        bestForPlan=candidate;
        break;
      }
    }

    if(bestForPlan)candidates.push(bestForPlan);
  }

  candidates.sort((a,b)=>a.cost-b.cost);
  const best=candidates[0]??null;
  const barrierCost=best?.cost??null;
  const fragile=barrierCost!==null&&barrierCost<=5;
  const reasons:string[]=[];

  if(best){
    reasons.push(`minimum sustained perturbation: ${best.features.join(" + ")} at ${best.sigma.toFixed(1)}σ`);
    reasons.push(`counterfactual boundary cost: ${best.cost.toFixed(2)} normalized units`);
    if(fragile)reasons.push("target regime is close in normalized state space");
  }else{
    reasons.push(`no tested perturbation reached ${targetRegime} within ${maxSigma}σ search range`);
  }

  return{
    fromRegime:initial.regime,
    targetRegime,
    sustainFrames,
    best,
    candidates,
    barrierCost,
    fragile,
    reasons,
  };
};
