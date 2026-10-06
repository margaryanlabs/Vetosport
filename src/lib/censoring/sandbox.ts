import { evaluateSuspensionCensoring } from "@/lib/censoring/engine";
import type { AvailabilityObservation } from "@/lib/censoring/types";

const make=(mode:"clean"|"biased"|"thin"):AvailabilityObservation[] =>
  Array.from({length:24},(_,i)=>{
    const signalCandidate=i%2===0;
    if(mode==="clean"){
      return{
        timeMs:i*1000,
        modelGapPp:signalCandidate?4.6+(i%3)*.2:1.5,
        marketActive:i%9!==0,
        quoteExecutable:i%9!==0,
        signalCandidate,
      };
    }
    if(mode==="biased"){
      const high=signalCandidate&&i%4===0;
      return{
        timeMs:i*1000,
        modelGapPp:high?10.5:signalCandidate?3.1:1.2,
        marketActive:!high,
        quoteExecutable:!high,
        signalCandidate,
      };
    }
    return{
      timeMs:i*1000,
      modelGapPp:signalCandidate?5.1:1.3,
      marketActive:i%3!==0,
      quoteExecutable:i%3!==0&&i%5!==0,
      signalCandidate,
    };
  });

export const cleanCensoring=evaluateSuspensionCensoring(make("clean"));
export const biasedCensoring=evaluateSuspensionCensoring(make("biased"));
export const thinCensoring=evaluateSuspensionCensoring(make("thin"));
