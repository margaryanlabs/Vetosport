import { analyzeRegimeChange } from "@/lib/regime/engine";
import type { RegimeObservation } from "@/lib/regime/types";
import type { RegimeDriverAnalysis, RegimeDriverContribution, RegimeFeature } from "@/lib/regime-attribution/types";

const features:RegimeFeature[]=[
  "tempo",
  "shotPressure",
  "transitionRate",
  "territorialControl",
  "priceVelocity",
  "spreadStress",
  "suspensionRisk",
];

const evidenceStrength=(result:ReturnType<typeof analyzeRegimeChange>)=>{
  const current=result.current;
  if(!current)return 0;
  return current.ewmaShift+.10*current.cusum+.25*current.persistence+1.5*current.changeProbability;
};

export const attributeRegimeDrivers=(
  rows:RegimeObservation[],
  {baselineCount=10}:{baselineCount?:number}={}
):RegimeDriverAnalysis=>{
  const full=analyzeRegimeChange(rows,{baselineCount});
  const fullStrength=evidenceStrength(full);
  const current=full.current;
  if(!current){
    return{
      fullRegime:"STABLE_CONTROL",
      fullConfidence:0,
      fullEvidenceStrength:0,
      primaryDriver:null,
      concentration:0,
      drivers:[],
      reasons:["no current regime frame"],
    };
  }

  const raw=features.map(feature=>{
    const baselineMean=full.baseline[feature].mean;
    const ablatedRows=rows.map((row,index)=>
      index<baselineCount
        ? row
        : ({...row,[feature]:baselineMean} as RegimeObservation)
    );
    const ablated=analyzeRegimeChange(ablatedRows,{baselineCount});
    const contribution=Math.max(0,fullStrength-evidenceStrength(ablated));
    return{
      feature,
      contribution,
      ablatedConfidence:ablated.transitionConfidence,
      ablatedRegime:ablated.regime,
      flipsRegime:ablated.regime!==full.regime,
    };
  });

  const total=raw.reduce((s,x)=>s+x.contribution,0);
  const sorted=raw
    .map(x=>({...x,share:total>0?x.contribution/total:0}))
    .sort((a,b)=>b.contribution-a.contribution);

  const drivers:RegimeDriverContribution[]=sorted.map((x,index)=>({...x,rank:index+1}));
  const concentration=drivers.slice(0,2).reduce((s,x)=>s+x.share,0);
  const primaryDriver=drivers[0]?.contribution>0?drivers[0].feature:null;
  const reasons:string[]=[];
  if(primaryDriver)reasons.push(`primary regime driver: ${primaryDriver}`);
  if(concentration>=.7)reasons.push(`top two drivers explain ${(concentration*100).toFixed(0)}% of attributed shift`);
  if(drivers.some(x=>x.flipsRegime))reasons.push("at least one driver removal changes regime classification");

  return{
    fullRegime:full.regime,
    fullConfidence:full.transitionConfidence,
    fullEvidenceStrength:fullStrength,
    primaryDriver,
    concentration,
    drivers,
    reasons,
  };
};
