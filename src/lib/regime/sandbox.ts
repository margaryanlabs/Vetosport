import { analyzeRegimeChange } from "@/lib/regime/engine";
import type { RegimeObservation } from "@/lib/regime/types";

const stableRow=(i:number):RegimeObservation=>({
  timeMs:i*1000,
  tempo:.50+((i%3)-1)*.015,
  shotPressure:.42+((i%4)-1.5)*.012,
  transitionRate:.31+((i%5)-2)*.01,
  territorialControl:.54+((i%4)-1.5)*.01,
  priceVelocity:.10+((i%3)-1)*.012,
  spreadStress:.18+((i%4)-1.5)*.008,
  suspensionRisk:.10+((i%5)-2)*.006,
});

export const stableSeries=Array.from({length:24},(_,i)=>stableRow(i));

export const transitionSeries=[
  ...Array.from({length:12},(_,i)=>stableRow(i)),
  ...Array.from({length:12},(_,j)=>{
    const i=j+12;
    return{
      timeMs:i*1000,
      tempo:.69+j*.008,
      shotPressure:.52+j*.006,
      transitionRate:.57+j*.009,
      territorialControl:.57,
      priceVelocity:.16+j*.004,
      spreadStress:.24+j*.004,
      suspensionRisk:.14+j*.003,
    };
  }),
];

export const liquidityShockSeries=[
  ...Array.from({length:12},(_,i)=>stableRow(i)),
  ...Array.from({length:12},(_,j)=>{
    const i=j+12;
    return{
      timeMs:i*1000,
      tempo:.52,
      shotPressure:.43,
      transitionRate:.33,
      territorialControl:.53,
      priceVelocity:.32+j*.012,
      spreadStress:.55+j*.014,
      suspensionRisk:.42+j*.015,
    };
  }),
];

export const oneSpikeSeries=[
  ...Array.from({length:12},(_,i)=>stableRow(i)),
  {
    timeMs:12000,
    tempo:.95,
    shotPressure:.86,
    transitionRate:.82,
    territorialControl:.71,
    priceVelocity:.48,
    spreadStress:.52,
    suspensionRisk:.46,
  },
  ...Array.from({length:11},(_,j)=>stableRow(j+13)),
];

export const stableRegime=analyzeRegimeChange(stableSeries);
export const transitionRegime=analyzeRegimeChange(transitionSeries);
export const liquidityRegime=analyzeRegimeChange(liquidityShockSeries);
export const oneSpikeRegime=analyzeRegimeChange(oneSpikeSeries);
