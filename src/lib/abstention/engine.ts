import type { BoundaryCheck, DecisionBoundaryResult, DecisionEvidence } from "@/lib/abstention/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

export const evaluateDecisionBoundary=(e:DecisionEvidence):DecisionBoundaryResult=>{
  const checks:BoundaryCheck[]=[
    {id:"contract",label:"Contract comparable",passed:e.contractComparable,hard:true,detail:e.contractComparable?"Settlement semantics align.":"Contract semantics mismatch."},
    {id:"semantic",label:"No semantic freeze",passed:!e.semanticFreeze,hard:true,detail:e.semanticFreeze?"Provider semantic drift requires freeze.":"No breaking semantic drift."},
    {id:"leakage",label:"No leakage block",passed:!e.leakageBlock,hard:true,detail:e.leakageBlock?"Negative control detected leakage.":"Negative controls clean enough."},
    {id:"calibration",label:"Calibration family active",passed:!e.calibrationKill,hard:true,detail:e.calibrationKill?"Family calibration kill-switch is active.":"Calibration family is active."},
    {id:"censoring",label:"Availability bias acceptable",passed:!e.censoringBlock,hard:true,detail:e.censoringBlock?"Suspension censoring invalidates tradability evidence.":"No censoring hard block."},
    {id:"ood",label:"In distribution",passed:!e.outOfDistribution,hard:true,detail:e.outOfDistribution?"State is out-of-distribution.":"State is within monitored support."},
    {id:"capacity",label:"Non-zero market capacity",passed:e.capacityClass!=="ZERO"&&e.capacityScore>=.38,hard:true,detail:`${e.capacityClass} · capacity ${(e.capacityScore*100).toFixed(0)}%`},
    {id:"gap",label:"Robust gap survives",passed:e.robustGapPp>=1.25,hard:false,detail:`${e.robustGapPp.toFixed(2)} pp robust gap.`},
    {id:"integrity",label:"Sensor integrity",passed:e.sensorIntegrity>=.68,hard:false,detail:`${(e.sensorIntegrity*100).toFixed(0)}% integrity.`},
    {id:"identifiability",label:"Latent state identifiable",passed:e.identifiability>=.68,hard:false,detail:`${(e.identifiability*100).toFixed(0)}% identifiability.`},
    {id:"council",label:"Independent model support",passed:e.councilConfidence>=.52&&e.effectiveModels>=2,hard:false,detail:`confidence ${(e.councilConfidence*100).toFixed(0)}% · N_eff ${e.effectiveModels.toFixed(2)}`},
    {id:"completeness",label:"Data completeness",passed:e.dataCompleteness>=.72,hard:false,detail:`${(e.dataCompleteness*100).toFixed(0)}% complete.`},
    {id:"freshness",label:"Quote freshness",passed:e.quoteFreshness>=.6,hard:false,detail:`${(e.quoteFreshness*100).toFixed(0)}% freshness.`},
    {id:"survival",label:"Execution survival",passed:e.executionSurvival>=.42,hard:false,detail:`${(e.executionSurvival*100).toFixed(0)}% expected survival.`},
    {id:"uncertainty",label:"Uncertainty controlled",passed:e.uncertaintyWidthPp<=8,hard:false,detail:`${e.uncertaintyWidthPp.toFixed(1)} pp interval width.`},
  ];

  const hardFailures=checks.filter(x=>x.hard&&!x.passed);
  const soft=checks.filter(x=>!x.hard);
  const softPass=soft.filter(x=>x.passed).length/Math.max(1,soft.length);

  const quality=(
    e.sensorIntegrity+
    e.identifiability+
    e.councilConfidence+
    e.dataCompleteness+
    e.quoteFreshness+
    e.executionSurvival+
    e.capacityScore
  )/7;

  const uncertaintyPenalty=clamp(e.uncertaintyWidthPp/12);
  const gapSupport=clamp(e.robustGapPp/6);

  const evidenceMargin=clamp(
    .38*quality+
    .22*softPass+
    .22*gapSupport+
    .18*(1-uncertaintyPenalty)
  );

  const blockers=hardFailures.map(x=>x.detail);
  const warnings=checks.filter(x=>!x.hard&&!x.passed).map(x=>x.detail);

  const decision:DecisionBoundaryResult["decision"]=
    hardFailures.length?"ABSTAIN":
    evidenceMargin>=.68&&softPass>=.78?"SHADOW_CANDIDATE":
    "WATCH";

  return{
    decision,
    checks,
    blockers,
    warnings,
    evidenceMargin,
    abstentionReason:hardFailures.length?hardFailures[0].detail:null,
  };
};
