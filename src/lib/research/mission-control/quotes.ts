/**
 * Research-only price observer. No assertion of bookmaker acceptance.
 * No betting advice, no calibrated win probability and no automatic execution.
 */
export type QuoteObservation={
 id:string;
 capturedAt:string;
 eventLabel:string;
 sport:string;
 market:string;
 selection:string;
 decimalOdds:number;
 bookmaker:string;
 manuallyEntered:true;
};
export const quoteBreakEven=(odds:number)=>{
 if(!Number.isFinite(odds)||odds<=1||odds>1000)throw Error("Odds must be decimal > 1 and <= 1000");
 return 1/odds;
};
export function describeQuote(q:QuoteObservation,asOf:string){
 if(!q||typeof q.bookmaker!=="string"||typeof q.eventLabel!=="string"||typeof q.market!=="string")throw Error("Quote metadata incomplete");
 const created=Date.parse(q.capturedAt),reference=Date.parse(asOf);
 if(!Number.isFinite(created)||!Number.isFinite(reference))throw Error("Invalid quote timestamps");
 const ageSeconds=(reference-created)/1000;
 return{
  ...q,breakEvenProbability:quoteBreakEven(q.decimalOdds),
  ageSeconds,
  status:ageSeconds<0?"CLOCK_INCONSISTENT":ageSeconds>30?"OLD_SNAPSHOT":"RECENT_MANUAL_ENTRY",
  verifiedProviderTimestamp:false as const,
  executionConfirmed:false as const,
  quoteAvailableNow:false as const,
  verdict:"NEVER_A_TRADE_SIGNAL" as const
 };
}
export function twoWayMarketNoVig(a:number,b:number){
 const pa=quoteBreakEven(a),pb=quoteBreakEven(b);
 const overround=pa+pb-1;
 return{
  overround,
  overroundPercent:overround*100,
  normalizedImpliedA:pa/(pa+pb),
  normalizedImpliedB:pb/(pa+pb),
  sameEventSameBookmakerContractRequired:true as const,
  bookmakerNoVigIsNotAnIndependentProbabilityModel:true as const,
  warning:"Only mathematically meaningful when these are exactly two mutually exclusive and exhaustive outcomes from the same synchronized market/settlement contract."
 };
}
export function runQuoteSelfcheck(){
 const a=twoWayMarketNoVig(1.90,1.90);
 const checks=[
  {name:"1.05 break-even 95.238%",passed:Math.abs(quoteBreakEven(1.05)-.95238095238)<1e-8},
  {name:"Equal two-way market normalizes to 50/50",passed:Math.abs(a.normalizedImpliedA-.5)<1e-9},
  {name:"Two-way overround 1.90/1.90 positive",passed:a.overround>.05},
  {name:"Fresh manual never marked verified",passed:describeQuote({id:"test",eventLabel:"A vs B",sport:"tennis",market:"set winner",selection:"A",decimalOdds:1.08,bookmaker:"test",capturedAt:"2026-10-11T10:00:00Z",manuallyEntered:true},"2026-10-11T10:00:05Z").executionConfirmed===false},
  {name:"Age > 30s stale",passed:describeQuote({id:"test",eventLabel:"A vs B",sport:"tennis",market:"set winner",selection:"A",decimalOdds:1.08,bookmaker:"test",capturedAt:"2026-10-11T10:00:00Z",manuallyEntered:true},"2026-10-11T10:00:50Z").status==="OLD_SNAPSHOT"},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
