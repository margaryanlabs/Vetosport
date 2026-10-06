import type { InformationRequestCandidate, InformationRoute, InformationRouterContext } from "@/lib/voi/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

export const routeInformationRequests=(
  candidates:InformationRequestCandidate[],
  context:InformationRouterContext,
):InformationRoute[]=>{
  const unresolved=new Set([
    ...context.conflictedFields,
    ...context.missingFields,
    ...context.weakFields,
  ]);

  return candidates.map(candidate=>{
    const overlap=candidate.resolvesFields.filter(field=>unresolved.has(field));
    const relevance=clamp(overlap.length/Math.max(1,candidate.resolvesFields.length));
    const urgency=clamp(
      (context.conflictedFields.filter(f=>candidate.resolvesFields.includes(f)).length*1.2+
       context.missingFields.filter(f=>candidate.resolvesFields.includes(f)).length+
       context.weakFields.filter(f=>candidate.resolvesFields.includes(f)).length*.7)/
      Math.max(1,candidate.resolvesFields.length)
    );
    const latencySurvival=
      context.signalHalfLifeMs<=0?0:
      Math.pow(.5,candidate.latencyMs/context.signalHalfLifeMs);
    const reliability=1-clamp(candidate.failureProbability);
    const redundancyPenalty=context.existingDependencyGroups.includes(candidate.dependencyGroup)?.5:0;
    const costPenalty=context.requestBudgetUsd<=0
      ? (candidate.monetaryCostUsd>0?1:0)
      : clamp(candidate.monetaryCostUsd/context.requestBudgetUsd);
    const freshnessFit=clamp(candidate.freshnessHorizonMs/Math.max(1,candidate.latencyMs));
    const expectedValue=clamp(
      .34*candidate.expectedUncertaintyReduction+
      .28*candidate.expectedIdentifiabilityGain+
      .18*relevance+
      .12*urgency+
      .08*freshnessFit
    )*latencySurvival*reliability;

    const score=clamp(
      expectedValue-
      .22*redundancyPenalty-
      .18*costPenalty-
      .12*clamp(candidate.latencyMs/Math.max(1,context.maxLatencyMs))
    );

    const action:InformationRoute["action"]=
      overlap.length===0||score<.18?"SKIP":
      score>=.48&&candidate.latencyMs<=context.maxLatencyMs&&candidate.monetaryCostUsd<=context.requestBudgetUsd?"FETCH_NOW":
      "QUEUE";

    const reasons:string[]=[];
    if(overlap.length)reasons.push(`resolves: ${overlap.join(", ")}`);
    if(redundancyPenalty)reasons.push("dependency group already represented");
    if(costPenalty>.7)reasons.push("high share of request budget");
    if(latencySurvival<.5)reasons.push("signal may decay before response");
    if(candidate.expectedIdentifiabilityGain>.6)reasons.push("large identifiability gain");

    return{
      id:candidate.id,
      label:candidate.label,
      action,
      score,
      expectedValue,
      latencySurvival,
      redundancyPenalty,
      costPenalty,
      reasons,
    };
  }).sort((a,b)=>b.score-a.score);
};
