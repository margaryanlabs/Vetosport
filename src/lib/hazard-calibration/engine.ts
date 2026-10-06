import type {
  HazardCalibrationBin,
  HazardCalibrationEstimate,
  HazardCalibrationModel,
  HazardCalibrationObservation,
  HazardHorizon,
} from "@/lib/hazard-calibration/types";
import type { RegimeLabel } from "@/lib/regime/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const edges=[0,.2,.4,.6,.8,1.000001];

const outcome=(row:HazardCalibrationObservation,horizon:HazardHorizon)=>{
  if(horizon===1)return row.transitionedWithin1;
  if(horizon===3)return row.transitionedWithin3;
  return row.transitionedWithin5;
};

const isotonic=(rates:number[],weights:number[])=>{
  const blocks=rates.map((rate,index)=>({
    start:index,
    end:index,
    value:rate,
    weight:Math.max(1e-9,weights[index]),
  }));
  let i=0;
  while(i<blocks.length-1){
    if(blocks[i].value<=blocks[i+1].value+1e-12){
      i+=1;
      continue;
    }
    const a=blocks[i],b=blocks[i+1];
    const weight=a.weight+b.weight;
    blocks.splice(i,2,{
      start:a.start,
      end:b.end,
      value:(a.value*a.weight+b.value*b.weight)/weight,
      weight,
    });
    i=Math.max(0,i-1);
  }
  const out=Array(rates.length).fill(0);
  for(const block of blocks){
    for(let j=block.start;j<=block.end;j++)out[j]=block.value;
  }
  return out;
};

export const fitHazardCalibration=(
  observations:HazardCalibrationObservation[],
  regime:RegimeLabel,
  horizon:HazardHorizon,
  {priorAlpha=1.5,priorBeta=3.5}:{priorAlpha?:number;priorBeta?:number}={},
):HazardCalibrationModel=>{
  const rows=observations.filter(x=>x.regime===regime);
  const rawBins=edges.slice(0,-1).map((lower,index)=>{
    const upper=edges[index+1];
    const binRows=rows.filter(x=>x.hazardScore>=lower&&x.hazardScore<upper);
    const successes=binRows.filter(x=>outcome(x,horizon)).length;
    const rawRate=binRows.length?successes/binRows.length:0;
    const calibratedRate=(successes+priorAlpha)/(binRows.length+priorAlpha+priorBeta);
    return{lower,upper:Math.min(1,upper),count:binRows.length,successes,rawRate,calibratedRate};
  });

  const smoothed=isotonic(
    rawBins.map(x=>x.calibratedRate),
    rawBins.map(x=>Math.max(1,x.count)),
  );

  const bins:HazardCalibrationBin[]=rawBins.map((bin,index)=>({
    ...bin,
    calibratedRate:clamp(smoothed[index]),
  }));

  const predict=(score:number)=>{
    const s=clamp(score);
    const index=Math.min(bins.length-1,Math.floor(s*bins.length));
    return bins[index]?.calibratedRate??0;
  };

  const brier=rows.length
    ? rows.reduce((sum,row)=>{
        const p=predict(row.hazardScore);
        const y=outcome(row,horizon)?1:0;
        return sum+(p-y)**2;
      },0)/rows.length
    : 1;

  const status:HazardCalibrationModel["status"]=
    rows.length>=80&&brier<=.24
      ?"CALIBRATED"
      :rows.length>=30
        ?"SPARSE"
        :"UNTRUSTED";

  return{
    regime,
    horizon,
    sampleSize:rows.length,
    priorAlpha,
    priorBeta,
    bins,
    brier,
    status,
  };
};

const binProbability=(model:HazardCalibrationModel,score:number)=>{
  const s=clamp(score);
  const index=Math.min(model.bins.length-1,Math.floor(s*model.bins.length));
  return clamp(model.bins[index]?.calibratedRate??0);
};

export const estimateTransitionProbabilities=(
  observations:HazardCalibrationObservation[],
  regime:RegimeLabel,
  hazardScore:number,
  minRegimeSample=60,
):HazardCalibrationEstimate=>{
  const regimeCount=observations.filter(x=>x.regime===regime).length;
  const useRegime=regimeCount>=minRegimeSample;
  const source:HazardCalibrationEstimate["source"]=useRegime?"REGIME":"POOLED";
  const calibrationRows=useRegime
    ?observations
    :observations.map(row=>({...row,regime:"STABLE_CONTROL" as RegimeLabel}));
  const calibrationRegime=useRegime?regime:"STABLE_CONTROL";

  const m1=fitHazardCalibration(calibrationRows,calibrationRegime,1);
  const m3=fitHazardCalibration(calibrationRows,calibrationRegime,3);
  const m5=fitHazardCalibration(calibrationRows,calibrationRegime,5);

  const raw1=binProbability(m1,hazardScore);
  const raw3=binProbability(m3,hazardScore);
  const raw5=binProbability(m5,hazardScore);

  const p1=raw1;
  const p3=Math.max(p1,raw3);
  const p5=Math.max(p3,raw5);

  const worstStatus=[m1.status,m3.status,m5.status].includes("UNTRUSTED")
    ?"UNTRUSTED"
    :[m1.status,m3.status,m5.status].includes("SPARSE")
      ?"SPARSE"
      :"CALIBRATED";

  const reasons:string[]=[];
  if(!useRegime)reasons.push(`regime history ${regimeCount}/${minRegimeSample}; pooled calibration used`);
  if(worstStatus!=="CALIBRATED")reasons.push(`calibration status: ${worstStatus.toLowerCase()}`);
  reasons.push(`P(transition≤1/3/5 frames) = ${(p1*100).toFixed(0)}% / ${(p3*100).toFixed(0)}% / ${(p5*100).toFixed(0)}%`);

  return{
    regime,
    hazardScore:clamp(hazardScore),
    p1,
    p3,
    p5,
    source,
    status:worstStatus,
    reasons,
  };
};
