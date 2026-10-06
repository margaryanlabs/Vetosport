import type { CalibrationDriftResult, CalibrationMetrics, CalibrationObservation } from "@/lib/calibration/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

export const calibrationMetrics=(rows:CalibrationObservation[]):CalibrationMetrics=>{
  if(!rows.length)return{sampleSize:0,meanPredicted:0,observedRate:0,bias:0,brier:0,ece:1,slope:0,intercept:0};
  const n=rows.length;
  const meanPredicted=rows.reduce((s,r)=>s+r.predicted,0)/n;
  const observedRate=rows.reduce((s,r)=>s+r.outcome,0)/n;
  const bias=meanPredicted-observedRate;
  const brier=rows.reduce((s,r)=>s+(r.predicted-r.outcome)**2,0)/n;

  const bins=Array.from({length:10},()=>[] as CalibrationObservation[]);
  rows.forEach(r=>bins[Math.min(9,Math.floor(clamp(r.predicted)*10))].push(r));
  const ece=bins.reduce((sum,bin)=>{
    if(!bin.length)return sum;
    const p=bin.reduce((s,r)=>s+r.predicted,0)/bin.length;
    const o=bin.reduce((s,r)=>s+r.outcome,0)/bin.length;
    return sum+bin.length/n*Math.abs(p-o);
  },0);

  const varP=rows.reduce((s,r)=>s+(r.predicted-meanPredicted)**2,0)/n;
  const cov=rows.reduce((s,r)=>s+(r.predicted-meanPredicted)*(r.outcome-observedRate),0)/n;
  const slope=varP>1e-9?cov/varP:0;
  const intercept=observedRate-slope*meanPredicted;

  return{sampleSize:n,meanPredicted,observedRate,bias,brier,ece,slope,intercept};
};

export const evaluateCalibrationDrift=({
  baselineRows,currentRows,family,league,minSample=120,
}:{
  baselineRows:CalibrationObservation[];
  currentRows:CalibrationObservation[];
  family:string;
  league:string;
  minSample?:number;
}):CalibrationDriftResult=>{
  const baseline=calibrationMetrics(baselineRows);
  const current=calibrationMetrics(currentRows);
  const eceDelta=current.ece-baseline.ece;
  const brierDelta=current.brier-baseline.brier;
  const biasDelta=Math.abs(current.bias)-Math.abs(baseline.bias);
  const slopeDeviation=Math.abs(current.slope-1);

  const enough=current.sampleSize>=minSample;
  const score=clamp(
    .34*clamp(current.ece/.12)+
    .22*clamp(Math.max(0,brierDelta)/.05)+
    .20*clamp(Math.abs(current.bias)/.1)+
    .16*clamp(slopeDeviation/.8)+
    .08*clamp(Math.max(0,eceDelta)/.06)
  );

  const severe=
    enough &&
    (
      current.ece>=.085 ||
      Math.abs(current.bias)>=.075 ||
      (brierDelta>=.035&&slopeDeviation>=.45)
    );

  const watch=
    !severe &&
    (
      !enough ||
      current.ece>=.05 ||
      Math.abs(current.bias)>=.045 ||
      brierDelta>=.02 ||
      slopeDeviation>=.3
    );

  const status:CalibrationDriftResult["status"]=severe?"KILL":watch?"WATCH":"HEALTHY";
  const reasons:string[]=[];
  if(!enough)reasons.push(`insufficient current sample: ${current.sampleSize}/${minSample}`);
  if(current.ece>=.05)reasons.push(`ECE elevated at ${(current.ece*100).toFixed(1)}%`);
  if(Math.abs(current.bias)>=.045)reasons.push(`calibration bias ${(current.bias*100).toFixed(1)} pp`);
  if(brierDelta>=.02)reasons.push(`Brier worsened by ${brierDelta.toFixed(3)}`);
  if(slopeDeviation>=.3)reasons.push(`slope deviates from 1 by ${slopeDeviation.toFixed(2)}`);

  return{family,league,baseline,current,eceDelta,brierDelta,biasDelta,slopeDeviation,score,status,killSwitch:severe,reasons};
};
