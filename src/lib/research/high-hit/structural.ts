/**
 * Closed-form / dynamic-programming *structural* sports scoring probabilities.
 *
 * NOT trained probabilities: assumes iid point/rally outcomes with identical p.
 * Current serve rotation, fatigue, score effects, skill, injuries and quote
 * acceptance are unmodelled. Never imply real 90% success.
 */
function validateP(p:number){
 if(!Number.isFinite(p)||p<=0||p>=1)throw Error("Point/rally success probability must be strictly between 0 and 1");
}
function deuceWinProbability(p:number){
 const q=1-p;
 return p*p/(p*p+q*q);
}

/** Standard advantage game, first side's point probability p; NO no-ad. */
export function tennisGameWinProbability(firstPoints:number,secondPoints:number,p:number):number{
 validateP(p);
 if(![firstPoints,secondPoints].every(x=>Number.isInteger(x)&&x>=0&&x<=40))throw Error("Invalid tennis point counts");
 const cache=new Map<string,number>();
 const deuce=deuceWinProbability(p);
 const recurse=(a:number,b:number):number=>{
  if(a>=4&&a>=b+2)return 1;
  if(b>=4&&b>=a+2)return 0;
  // Collapse the infinite advantage/deuce loop exactly.
  if(a>=3&&b>=3){
   if(a===b)return deuce;
   if(a===b+1)return p+(1-p)*deuce;
   if(b===a+1)return p*deuce;
  }
  const key=a+":"+b;
  const existing=cache.get(key); if(existing!==undefined)return existing;
  const next=p*recurse(a+1,b)+(1-p)*recurse(a,b+1);
  cache.set(key,next);return next;
 };
 return recurse(firstPoints,secondPoints);
}

/**
 * Standard indoor volleyball SET to 25 with a two-point lead,
 * or deciding set to 15 (caller specifies). IID rallies, no service model.
 */
export function volleyballSetWinProbability(firstScore:number,secondScore:number,p:number,target:15|25=25):number{
 validateP(p);
 if(![firstScore,secondScore].every(x=>Number.isInteger(x)&&x>=0&&x<=100))throw Error("Invalid volleyball score");
 const cache=new Map<string,number>();
 const deuce=deuceWinProbability(p);
 const recurse=(a:number,b:number):number=>{
  if(a>=target&&a>=b+2)return 1;
  if(b>=target&&b>=a+2)return 0;
  if(a>=target-1&&b>=target-1){
   if(a===b)return deuce;
   if(a===b+1)return p+(1-p)*deuce;
   if(b===a+1)return p*deuce;
  }
  const key=a+":"+b;
  const existing=cache.get(key);if(existing!==undefined)return existing;
  const next=p*recurse(a+1,b)+(1-p)*recurse(a,b+1);
  cache.set(key,next);return next;
 };
 return recurse(firstScore,secondScore);
}

export function structuralResearchCase(input:{
 market:"tennis-game"|"volleyball-set";
 firstScore:number;secondScore:number;
 assumedPointWinProbability:number;
 assumedDecimalOdds:number;
}){
 const {market,firstScore,secondScore,assumedPointWinProbability:p,assumedDecimalOdds:odds}=input;
 if(!Number.isFinite(odds)||odds<=1||odds>1000)throw Error("Hypothetical odds must exceed 1");
 const probability=market==="tennis-game"?
  tennisGameWinProbability(firstScore,secondScore,p):
  volleyballSetWinProbability(firstScore,secondScore,p,25);
 const breakEvenProbability=1/odds;
 return{
  status:"STRUCTURAL_ASSUMPTION_NOT_HISTORICAL_EVIDENCE" as const,
  market,score:[firstScore,secondScore],
  assumedPointWinProbability:p,
  modelConditionalWinProbability:probability,
  breakEvenProbability,
  assumedPriceWouldHavePositiveEV:probability>breakEvenProbability,
  modelFairOdds:probability>0?1/probability:null,
  probabilityAbove90ConditionalOnAssumptions:probability>=.9,
  verdict:"PASS_RESEARCH_ONLY" as const,
  warning:"Not fitted to event-level match data. Assumes iid scoring, no market quote, no verified price, no professional wagering decision."
 };
}
export function structuralSelfcheck(){
 const eq=(a:number,b:number)=>Math.abs(a-b)<1e-9;
 const checks=[
  {name:"Tennis 40-0 p=.5 = 93.75% for standard deuce",passed:eq(tennisGameWinProbability(3,0,.5),.9375)},
  {name:"Tennis 0-0 symmetric p=.5 gives 50%",passed:eq(tennisGameWinProbability(0,0,.5),.5)},
  {name:"Tennis deuce p=.5 gives 50%",passed:eq(tennisGameWinProbability(3,3,.5),.5)},
  {name:"Volleyball 24-18 p=.5 = 99.21875%",passed:eq(volleyballSetWinProbability(24,18,.5),.9921875)},
  {name:"Volleyball deuce 24-24 p=.5 = 50%",passed:eq(volleyballSetWinProbability(24,24,.5),.5)},
  {name:"Volleyball state 25-24 not won yet",passed:eq(volleyballSetWinProbability(25,24,.5),.75)},
  {name:"Volleyball finished set 25-23 is 100%",passed:volleyballSetWinProbability(25,23,.5)===1},
  {name:"More success per rally improves late volleyball chance",passed:volleyballSetWinProbability(24,18,.55)>volleyballSetWinProbability(24,18,.35)},
  {name:"40-0 with fair scoring does not clear 1.05 price",passed:structuralResearchCase({market:"tennis-game",firstScore:3,secondScore:0,assumedPointWinProbability:.5,assumedDecimalOdds:1.05}).assumedPriceWouldHavePositiveEV===false},
  {name:"All structural screens stay PASS",passed:structuralResearchCase({market:"volleyball-set",firstScore:24,secondScore:18,assumedPointWinProbability:.5,assumedDecimalOdds:1.01}).verdict==="PASS_RESEARCH_ONLY"},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
