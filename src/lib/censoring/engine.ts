import type { AvailabilityObservation, SuspensionCensoringResult } from "@/lib/censoring/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const mean=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;

export const evaluateSuspensionCensoring=(rows:AvailabilityObservation[]):SuspensionCensoringResult=>{
  const candidates=rows.filter(r=>r.signalCandidate);
  const executable=candidates.filter(r=>r.marketActive&&r.quoteExecutable);
  const censored=candidates.length-executable.length;
  const censoredCandidateRate=candidates.length?censored/candidates.length:0;
  const executableCoverage=rows.length?rows.filter(r=>r.marketActive&&r.quoteExecutable).length/rows.length:0;
  const rawMeanGapPp=mean(candidates.map(r=>r.modelGapPp));
  const executableMeanGapPp=mean(executable.map(r=>r.modelGapPp));
  const edgeInflationPp=Math.max(0,rawMeanGapPp-executableMeanGapPp);

  const biasScore=clamp(
    .5*censoredCandidateRate+
    .25*clamp(edgeInflationPp/5)+
    .25*(1-executableCoverage)
  );

  const hardBlock=
    candidates.length>=8 &&
    (
      censoredCandidateRate>=.55 ||
      edgeInflationPp>=3.5 ||
      executable.length===0
    );

  const status:SuspensionCensoringResult["status"]=
    hardBlock?"BLOCK":
    biasScore>=.38?"WATCH":
    "CLEAN";

  const reasons:string[]=[];
  if(censoredCandidateRate>=.25)reasons.push(`${(censoredCandidateRate*100).toFixed(0)}% of candidate signals are censored`);
  if(edgeInflationPp>=1)reasons.push(`raw edge is inflated by ${edgeInflationPp.toFixed(2)} pp vs executable subset`);
  if(executableCoverage<.6)reasons.push(`executable coverage is only ${(executableCoverage*100).toFixed(0)}%`);
  if(executable.length===0&&candidates.length)reasons.push("no candidate signal had an executable quote");

  return{
    observations:rows.length,
    candidates:candidates.length,
    executableCandidates:executable.length,
    censoredCandidateRate,
    executableCoverage,
    rawMeanGapPp,
    executableMeanGapPp,
    edgeInflationPp,
    biasScore,
    status,
    hardBlock,
    reasons,
  };
};
