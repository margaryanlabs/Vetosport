import type { ConformalEnvelope, ConformalEnvelopeInput, ConformalResidual } from "@/lib/conformal/types";

const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));
const score=(row:ConformalResidual)=>Math.abs(clamp(row.predicted)-row.outcome);

const conformalQuantile=(scores:number[],alpha:number)=>{
  if(!scores.length)return 1;
  const sorted=[...scores].sort((a,b)=>a-b);
  const rank=Math.min(
    sorted.length,
    Math.max(1,Math.ceil((sorted.length+1)*(1-clamp(alpha,.001,.5))))
  );
  return sorted[rank-1];
};

export const buildConformalEnvelope=(input:ConformalEnvelopeInput):ConformalEnvelope=>{
  const alpha=clamp(input.alpha,.001,.5);
  const targetCoverage=1-alpha;
  const regimeCalibration=input.calibration.filter(x=>x.regime===input.regime);
  const useRegime=regimeCalibration.length>=input.minRegimeSample;
  const source:ConformalEnvelope["source"]=useRegime?"REGIME":"POOLED";
  const calibrationRows=useRegime?regimeCalibration:input.calibration;
  const calibrationScores=calibrationRows.map(score);
  const baseRadius=conformalQuantile(calibrationScores,alpha);

  const recentRows=input.recent.filter(x=>x.regime===input.regime);
  const recentScores=recentRows.map(score);
  const recentCoverage=recentScores.length
    ? recentScores.filter(x=>x<=baseRadius).length/recentScores.length
    : targetCoverage;

  const recentRadius=recentScores.length>=8
    ? conformalQuantile(recentScores,alpha)
    : baseRadius;

  const coverageBroken=
    recentScores.length>=8&&
    recentCoverage<targetCoverage-.05;

  let adaptiveRadius=coverageBroken?Math.max(baseRadius,recentRadius):baseRadius;
  if(!useRegime)adaptiveRadius=Math.min(1,adaptiveRadius*1.05);
  adaptiveRadius=clamp(adaptiveRadius);

  const probability=clamp(input.probability);
  const lower=clamp(probability-adaptiveRadius);
  const upper=clamp(probability+adaptiveRadius);
  const inflationFactor=baseRadius>0?adaptiveRadius/baseRadius:1;

  const hardBlock=
    adaptiveRadius>=.28||
    (
      recentScores.length>=15&&
      recentCoverage<targetCoverage-.20
    );

  const status:ConformalEnvelope["status"]=
    hardBlock?"ABSTAIN":
    coverageBroken||!useRegime||inflationFactor>1.05?"WIDEN":
    "CALIBRATED";

  const reasons:string[]=[];
  if(!useRegime)reasons.push(`regime sample ${regimeCalibration.length}/${input.minRegimeSample}; pooled fallback used`);
  if(coverageBroken)reasons.push(`recent empirical coverage ${(recentCoverage*100).toFixed(0)}% is below target ${(targetCoverage*100).toFixed(0)}%`);
  if(inflationFactor>1.05)reasons.push(`uncertainty radius inflated ${inflationFactor.toFixed(2)}x`);
  if(adaptiveRadius>=.28)reasons.push("uncertainty envelope too wide for decision authority");

  return{
    regime:input.regime,
    targetCoverage,
    source,
    calibrationSample:calibrationRows.length,
    recentSample:recentRows.length,
    baseRadius,
    adaptiveRadius,
    lower,
    upper,
    recentCoverage,
    inflationFactor,
    status,
    hardBlock,
    reasons,
  };
};
