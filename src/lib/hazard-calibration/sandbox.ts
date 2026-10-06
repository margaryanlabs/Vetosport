import {
  estimateTransitionProbabilities,
  fitHazardCalibration,
} from "@/lib/hazard-calibration/engine";
import type { HazardCalibrationObservation } from "@/lib/hazard-calibration/types";
import type { RegimeLabel } from "@/lib/regime/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

const makeRows=(count:number,regime:RegimeLabel,offset:number):HazardCalibrationObservation[] =>
  Array.from({length:count},(_,i)=>{
    const hazard=((i*37+offset)%100)/100;
    const u1=((i*53+11+offset)%100)/100;
    const u3=((i*47+23+offset)%100)/100;
    const u5=((i*43+31+offset)%100)/100;
    const p1=clamp(.015+.52*Math.pow(hazard,3));
    const p3=clamp(.035+.70*Math.pow(hazard,2));
    const p5=clamp(.065+.82*Math.pow(hazard,1.55));
    return{
      id:`${regime}-${i}`,
      regime,
      hazardScore:hazard,
      transitionedWithin1:u1<p1,
      transitionedWithin3:u3<p3,
      transitionedWithin5:u5<p5,
    };
  });

export const hazardHistory:HazardCalibrationObservation[]=[
  ...makeRows(160,"OPEN_TRANSITION",7),
  ...makeRows(130,"STABLE_CONTROL",19),
  ...makeRows(95,"PRESSURE_SIEGE",29),
  ...makeRows(18,"FRAGILE_LIQUIDITY",41),
];

export const openModel1=fitHazardCalibration(hazardHistory,"OPEN_TRANSITION",1);
export const openModel3=fitHazardCalibration(hazardHistory,"OPEN_TRANSITION",3);
export const openModel5=fitHazardCalibration(hazardHistory,"OPEN_TRANSITION",5);

export const lowHazardEstimate=estimateTransitionProbabilities(
  hazardHistory,
  "OPEN_TRANSITION",
  .22,
);

export const highHazardEstimate=estimateTransitionProbabilities(
  hazardHistory,
  "OPEN_TRANSITION",
  .84,
);

export const sparseHazardEstimate=estimateTransitionProbabilities(
  hazardHistory,
  "FRAGILE_LIQUIDITY",
  .76,
);
