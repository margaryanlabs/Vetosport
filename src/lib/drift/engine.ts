import type { SemanticChange, SemanticDriftResult, SemanticSnapshot } from "@/lib/drift/types";

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

const collect=(a:Record<string,unknown>,b:Record<string,unknown>,category:SemanticChange["category"])=>{
  const keys=[...new Set([...Object.keys(a),...Object.keys(b)])];
  return keys.flatMap<SemanticChange>(key=>{
    const before=a[key],after=b[key];
    if(JSON.stringify(before)===JSON.stringify(after))return[];
    const removed=before!==undefined&&after===undefined;
    const typeChanged=before!==undefined&&after!==undefined&&typeof before!==typeof after;
    const ruleCritical=category==="RULE"&&["overtimeIncluded","period","voidRule","settlementModel","pushRule"].includes(key);
    const severity:SemanticChange["severity"]=removed||typeChanged||ruleCritical?"BREAKING":category==="ALIAS"?"WARNING":"WARNING";
    return [{path:`${category.toLowerCase()}.${key}`,before,after,severity,category}];
  });
};

export const detectSemanticDrift=(from:SemanticSnapshot,to:SemanticSnapshot):SemanticDriftResult=>{
  if(from.providerId!==to.providerId)throw new Error("Semantic snapshots must belong to the same provider.");
  const changes=[
    ...collect(from.schema,to.schema,"SCHEMA"),
    ...collect(from.rules,to.rules,"RULE"),
    ...collect(from.aliases,to.aliases,"ALIAS"),
  ];

  const breakingChanges=changes.filter(x=>x.severity==="BREAKING");
  const warningChanges=changes.filter(x=>x.severity==="WARNING");
  const affectedFamilies=[...new Set(changes.map(change=>{
    const raw=String(change.after??change.before??"");
    if(raw.includes("total"))return"TOTAL";
    if(raw.includes("handicap"))return"HANDICAP";
    if(raw.includes("moneyline"))return"MONEYLINE";
    return"ALL";
  }))];

  const driftScore=clamp(
    breakingChanges.length*.24+
    warningChanges.length*.08+
    (from.sport!==to.sport?.4:0)
  );

  const breaking=breakingChanges.length>0||from.sport!==to.sport;
  const freezeRequired=breaking;

  const actions:string[]=[];
  if(breaking){
    actions.push("freeze affected market families");
    actions.push("version contract semantics");
    actions.push("re-run point-in-time replay from effectiveFrom");
    actions.push("invalidate incompatible cached projections");
  }else if(changes.length){
    actions.push("record non-breaking semantic drift");
    actions.push("refresh alias and schema registry");
  }else{
    actions.push("no action required");
  }

  return{
    providerId:from.providerId,
    fromVersion:from.versionId,
    toVersion:to.versionId,
    driftScore,
    breaking,
    freezeRequired,
    changes,
    affectedFamilies,
    actions,
  };
};
