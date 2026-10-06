import type { MarketCapacityInput, MarketCapacityResult } from "@/lib/capacity/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

export const evaluateMarketCapacity=(input:MarketCapacityInput):MarketCapacityResult=>{
  const delay=Math.max(0,input.quoteAgeMs)+Math.max(0,input.acceptanceDelayMs);
  const survivalFraction=input.signalHalfLifeMs>0
    ? Math.pow(.5,delay/input.signalHalfLifeMs)
    : 0;
  const postExecutionGapPp=
    Math.max(0,input.robustGapPp)*survivalFraction-
    Math.max(0,input.expectedSlippagePp)-
    Math.max(0,input.spreadPp);

  const executionQuality=
    .28*clamp(input.executableCoverage)+
    .22*clamp(input.limitReliability)+
    .20*clamp(input.liquidityProxy)+
    .12*(1-clamp(input.rejectionRate))+
    .10*(1-clamp(input.suspensionRate))+
    .08*survivalFraction;

  const edgeRetention=clamp(postExecutionGapPp/Math.max(.5,input.robustGapPp));
  const capacityScore=clamp(.72*executionQuality+.28*edgeRetention);

  const hardBlock=
    input.executableCoverage<.25||
    input.limitReliability<.2||
    input.rejectionRate>.72||
    input.suspensionRate>.75||
    postExecutionGapPp<=0;

  const klass:MarketCapacityResult["class"]=
    hardBlock?"ZERO":
    capacityScore<.38?"FRAGILE":
    capacityScore<.58?"THIN":
    capacityScore<.78?"TRADEABLE":
    "DEEP";

  const reasons:string[]=[];
  if(input.executableCoverage<.6)reasons.push("low executable quote coverage");
  if(input.limitReliability<.55)reasons.push("limits are unreliable or unknown");
  if(input.rejectionRate>.25)reasons.push("high observed rejection rate");
  if(input.suspensionRate>.25)reasons.push("market suspends frequently");
  if(survivalFraction<.5)reasons.push("signal decays materially before acceptance");
  if(postExecutionGapPp<=0)reasons.push("execution costs erase robust gap");
  if(input.liquidityProxy<.5)reasons.push("thin liquidity proxy");

  return{...input,survivalFraction,postExecutionGapPp,capacityScore,class:klass,hardBlock,reasons};
};
