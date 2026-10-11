import {analyzeHighHitEvidence,wilson95} from "./engine";
import {HIGH_HIT_CATALOG} from "./catalog";
export function runHighHitSelfcheck(){
 const checks:Array<{name:string;passed:boolean}>=[];
 const add=(name:string,passed:boolean)=>checks.push({name,passed});
 const almost=(a:number,b:number)=>Math.abs(a-b)<1e-9;
 const u35=analyzeHighHitEvidence({wins:964,losses:67,voids:0,decimalOdds:1.05,hypotheticalStake:200});
 const u45=analyzeHighHitEvidence({wins:1023,losses:8,voids:0,decimalOdds:1.01,hypotheticalStake:200});
 const u55=analyzeHighHitEvidence({wins:1030,losses:1,voids:0,decimalOdds:1.01,hypotheticalStake:200});
 add("Catalog includes six distinct sports",new Set(HIGH_HIT_CATALOG.map(x=>x.sport)).size===6);
 add("Football historical Under 3.5 matches empirical 964/1031",almost(u35.observedSuccess,964/1031));
 add("Football under 4.5 matches empirical 1023/1031",almost(u45.observedSuccess,1023/1031));
 add("Football under 5.5 matches empirical 1030/1031",almost(u55.observedSuccess,1030/1031));
 add("Under 3.5 old sample 95% lower not reliable above 95%",u35.wilson95.low<.95);
 add("Under 4.5 old sample clears descriptive 90% sampling bound",u45.atLeast90Lower95);
 add("90% price fair floor 1.11111",almost(u45.minimumOddsAt90Percent,1.1111111111111112));
 add("Single 1.05 loss consumes 20 winners",almost(u35.winsToOffsetOneLoss,20));
 const withVoids=analyzeHighHitEvidence({wins:90,losses:10,voids:100,decimalOdds:1.1,hypotheticalStake:200});
 add("Voids do not inflate settled win rate",almost(withVoids.observedSuccess,.9));
 add("Voids reduce expected turnover",almost(withVoids.hypotheticalEVIncludingVoids,withVoids.hypotheticalEVConditional*.5));
 add("At 90% odds 1.05 EV is negative",analyzeHighHitEvidence({wins:90,losses:10,voids:0,decimalOdds:1.05,hypotheticalStake:100}).hypotheticalEVConditional<0);
 add("At 90% odds 1.10 EV is negative",analyzeHighHitEvidence({wins:90,losses:10,voids:0,decimalOdds:1.1,hypotheticalStake:100}).hypotheticalEVConditional<0);
 add("At exactly break even 90% odds 10/9 EV zero",almost(analyzeHighHitEvidence({wins:90,losses:10,voids:0,decimalOdds:10/9,hypotheticalStake:100}).hypotheticalEVConditional,0));
 add("Confidence interval contracts with more observations",wilson95(900,1000).low>wilson95(90,100).low);
 let badQuarter=false;
 try{analyzeHighHitEvidence({wins:0,losses:0,voids:100,decimalOdds:1.1,hypotheticalStake:100});}catch{badQuarter=true}
 add("All-void outcomes rejected",badQuarter);
 add("No production approval even when sampling and odds pass",u55.verdict==="PASS_RESEARCH_ONLY"&&u55.status==="RESEARCH_ONLY_NOT_TRADE_READY");
 return{passed:checks.every(x=>x.passed),checks};
}
