import { buildConformalEnvelope } from "@/lib/conformal/engine";
import type { ConformalResidual } from "@/lib/conformal/types";
import type { RegimeLabel } from "@/lib/regime/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

const makeRows=(
  count:number,
  regime:RegimeLabel,
  residual:(i:number)=>number,
  prefix:string,
):ConformalResidual[]=>
  Array.from({length:count},(_,i)=>{
    const predicted=.42+(i%9)*.045;
    const sign=i%2===0?1:-1;
    return{
      id:`${prefix}-${i}`,
      regime,
      predicted,
      referenceProbability:clamp(predicted+sign*residual(i)),
    };
  });

export const calibrationResiduals:ConformalResidual[]=[
  ...makeRows(140,"OPEN_TRANSITION",i=>.014+(i%10)*.003,"open-cal"),
  ...makeRows(120,"STABLE_CONTROL",i=>.012+(i%9)*.0025,"stable-cal"),
  ...makeRows(8,"FRAGILE_LIQUIDITY",i=>.020+(i%6)*.004,"liq-cal"),
];

export const healthyRecent=makeRows(
  32,
  "OPEN_TRANSITION",
  i=>.014+(i%9)*.003,
  "open-healthy"
);

export const driftRecent=makeRows(
  32,
  "OPEN_TRANSITION",
  i=>.055+(i%10)*.006,
  "open-drift"
);

export const severeRecent=makeRows(
  24,
  "OPEN_TRANSITION",
  i=>.285+(i%6)*.018,
  "open-severe"
);

export const sparseRecent=makeRows(
  14,
  "FRAGILE_LIQUIDITY",
  i=>.026+(i%5)*.004,
  "liq-recent"
);

export const calibratedEnvelope=buildConformalEnvelope({
  probability:.72,
  regime:"OPEN_TRANSITION",
  alpha:.10,
  calibration:calibrationResiduals,
  recent:healthyRecent,
  minRegimeSample:60,
});

export const driftEnvelope=buildConformalEnvelope({
  probability:.72,
  regime:"OPEN_TRANSITION",
  alpha:.10,
  calibration:calibrationResiduals,
  recent:driftRecent,
  minRegimeSample:60,
});

export const severeEnvelope=buildConformalEnvelope({
  probability:.72,
  regime:"OPEN_TRANSITION",
  alpha:.10,
  calibration:calibrationResiduals,
  recent:severeRecent,
  minRegimeSample:60,
});

export const sparseEnvelope=buildConformalEnvelope({
  probability:.64,
  regime:"FRAGILE_LIQUIDITY",
  alpha:.10,
  calibration:calibrationResiduals,
  recent:sparseRecent,
  minRegimeSample:60,
});
