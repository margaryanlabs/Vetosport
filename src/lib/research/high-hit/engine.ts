/**
 * Public, deterministic, research-only mathematical threshold evaluator.
 * Evidence counts can be entered by anyone and MUST NOT be represented as
 * independently verified or as a claim of profitable gambling.
 */
export interface HitRateInput{
 wins:number;losses:number;voids:number;
 decimalOdds:number;hypotheticalStake:number;
}
export function wilson95(successes:number,n:number){
 if(!Number.isInteger(n)||!Number.isInteger(successes)||n<1||successes<0||successes>n)throw Error("Invalid counts");
 const z=1.959963984540054,p=successes/n,d=1+z*z/n;
 const c=(p+z*z/(2*n))/d;
 const m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
 return {low:Math.max(0,c-m),high:Math.min(1,c+m)};
}
export function analyzeHighHitEvidence(input:HitRateInput){
 const {wins,losses,voids,decimalOdds,hypotheticalStake}=input;
 if (![wins,losses,voids].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000))throw Error("Outcome counts must be valid non-negative integers");
 const n=wins+losses;
 const total=n+voids;
 if(!n||total>10000000)throw Error("At least one settled (win/loss) outcome required; max 10 million total observations");
 if(!Number.isFinite(decimalOdds)||decimalOdds<=1||decimalOdds>1000)throw Error("Decimal odds must be between 1 and 1000");
 if(!Number.isFinite(hypotheticalStake)||hypotheticalStake<0||hypotheticalStake>1e7)throw Error("Invalid hypothetical stake");
 const empiricalRate=wins/n;
 const interval=wilson95(wins,n);
 const breakEven=1/decimalOdds;
 // Voids refund stake: effective sample conditional on a non-void settlement.
 const settledFraction=n/total;
 const scenarioEvConditional=hypotheticalStake*(decimalOdds*empiricalRate-1);
 const scenarioEvIncludingVoids=scenarioEvConditional*settledFraction;
 const conservativeEvConditional=hypotheticalStake*(decimalOdds*interval.low-1);
 const conservativeEvIncludingVoids=conservativeEvConditional*settledFraction;
 const atLeast90Observed=empiricalRate>=.90;
 const atLeast90Lower95=interval.low>=.90;
 const pricePositiveUnderLowerBound=interval.low>breakEven;
 const blockers:string[]=[
  "MANUAL_OR_HISTORICAL_COUNTS_NOT_AUTHENTICATED",
  "NO_FORWARD_INDEPENDENT_MARKET_VALIDATION",
  "NO_TIME_MATCHED_EXECUTABLE_ODDS",
  "NO_CURRENT_2026_OUTCOME_CALIBRATION",
 ];
 if(n<200)blockers.push("SAMPLE_TOO_SMALL_FOR_EVEN_PRELIMINARY_SCREEN");
 if(!atLeast90Lower95)blockers.push("95_PERCENT_WILSON_LOWER_BOUND_BELOW_90_PERCENT");
 if(!pricePositiveUnderLowerBound)blockers.push("ILLUSTRATIVE_QUOTE_DOES_NOT_CLEAR_CONSERVATIVE_BREAK_EVEN");
 return{
  status:"RESEARCH_ONLY_NOT_TRADE_READY" as const,
  n,voids,settledFraction,
  observedSuccess:empiricalRate,
  wilson95:interval,
  atLeast90Observed,
  atLeast90Lower95,
  breakEvenProbability:breakEven,
  threshold90PercentIsNotSafetyGuarantee:true as const,
  quotedOdds:decimalOdds,
  observedFairOdds:empiricalRate>0?1/empiricalRate:null,
  conservativeFairOdds:interval.low>0?1/interval.low:null,
  hypotheticalWinProfit:hypotheticalStake*(decimalOdds-1),
  hypotheticalSingleLoss:-hypotheticalStake,
  winsToOffsetOneLoss:1/(decimalOdds-1),
  hypotheticalEVConditional:scenarioEvConditional,
  hypotheticalEVIncludingVoids:scenarioEvIncludingVoids,
  hypotheticalLowerBoundEVConditional:conservativeEvConditional,
  hypotheticalLowerBoundEVIncludingVoids:conservativeEvIncludingVoids,
  pricePositiveUnderLowerBound,
  minimumOddsAt90Percent:1/.9,
  verdict:"PASS_RESEARCH_ONLY" as const,
  blockers,
  caveat:"Confidence bound measures sampling uncertainty only; not independent validation, market execution, regime drift, bookmaker fees, latency or guarantee of 90% future wins."
 };
}
