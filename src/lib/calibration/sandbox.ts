import { evaluateCalibrationDrift } from "@/lib/calibration/engine";
import type { CalibrationObservation } from "@/lib/calibration/types";

const makeRows=(count:number,actual:(p:number)=>number):CalibrationObservation[]=>{
  const probs=[.2,.35,.5,.65,.8];
  return Array.from({length:count},(_,i)=>{
    const predicted=probs[i%probs.length];
    const u=((i*37+17)%100)/100;
    return{
      predicted,
      outcome:(u<Math.max(0,Math.min(1,actual(predicted)))?1:0) as 0|1,
      family:"total_goals",
      league:"EPL",
    };
  });
};

export const baselineRows=makeRows(600,p=>p);
export const healthyCurrentRows=makeRows(180,p=>p*.98+.01);
export const overconfidentRows=makeRows(180,p=>Math.max(.02,p-.18));
export const smallRows=makeRows(45,p=>Math.max(.02,p-.18));

export const healthyCalibration=evaluateCalibrationDrift({
  baselineRows,
  currentRows:healthyCurrentRows,
  family:"total_goals",
  league:"EPL",
});

export const badCalibration=evaluateCalibrationDrift({
  baselineRows,
  currentRows:overconfidentRows,
  family:"total_goals",
  league:"EPL",
});

export const smallCalibration=evaluateCalibrationDrift({
  baselineRows,
  currentRows:smallRows,
  family:"total_goals",
  league:"EPL",
});
