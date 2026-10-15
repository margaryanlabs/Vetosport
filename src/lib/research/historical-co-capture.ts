import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";

export const CO_CAPTURE_WINDOW_SECONDS=120;

/**
 * Diagnostic ONLY: independently saved sporting state and market price were
 * captured within two minutes of each other, on the same canonical event,
 * while the fixture was plausibly in-play.
 *
 * This is not proof of executable bookmaker liquidity, that timestamps come
 * from independently synchronized sources, predictive accuracy, FT, or EV.
 * In particular API-Football live/odds may use gateway acquisition timestamps.
 */
export type HistoricalTimingEvidence={
  observedWithin2m:number;
  causallyAlignedWithin2m:number;
  lookaheadOnlyWithin2m:number;
  sourceClockIndependent:false;
  executablePriceVerified:false;
};

/**
 * Causal ordering matters: a price recorded BEFORE the only available score
 * cannot legitimately be used to price that score, even when the timestamps
 * differ by only one second. Symmetric proximity remains useful as a
 * diagnostics-only indicator of overlapping provider polling schedules.
 *
 * Evidence times are gateway capture times, not independent origin clocks.
 * Neither metric grants backtest outcome certification or betting authority.
 */
export function historicalTimingEvidence(input:{
 events:PersistedEvent[];
 states:PersistedEventStateRecord[];
 quotes:PersistedMarketQuoteRecord[];
 asOf:string;
}):HistoricalTimingEvidence{
 const empty=():HistoricalTimingEvidence=>({
  observedWithin2m:0,causallyAlignedWithin2m:0,
  lookaheadOnlyWithin2m:0,sourceClockIndependent:false,executablePriceVerified:false,
 });
 const asOf=Date.parse(input.asOf);
 if(!Number.isFinite(asOf))return empty();
 const kickoffs=new Map<string,number>();
 for(const event of input.events){
  if(event.event.sport!=="football")continue;
  const kickoff=Date.parse(event.event.startsAt);
  if(Number.isFinite(kickoff)&&kickoff<=asOf)kickoffs.set(event.id,kickoff);
 }
 const scores=new Map<string,number[]>();
 for(const row of input.states){
  const start=kickoffs.get(row.eventId);
  if(start===undefined||row.sourceProvider!=="api-football"||row.state.status!=="live")continue;
  const captured=Date.parse(row.capturedAt);
  if(!Number.isFinite(captured)||captured<start||captured>Math.min(asOf,start+4*3600000))continue;
  const score=row.state.score;
  if(!score||typeof score!=="object"||Array.isArray(score))continue;
  const value=score as {home?:unknown;away?:unknown};
  if(![value.home,value.away].every(n=>typeof n==="number"&&Number.isInteger(n)&&n>=0&&n<=40))continue;
  const samples=scores.get(row.eventId)??[];
  samples.push(captured);
  scores.set(row.eventId,samples);
 }
 for(const times of scores.values())times.sort((a,b)=>a-b);
 const observed=new Set<string>(),causal=new Set<string>();
 for(const quote of input.quotes){
  if(causal.has(quote.eventId)||quote.provider==="normalized"||
   quote.suspended!==false||!Number.isFinite(quote.decimalOdds)||
   quote.decimalOdds<=1||quote.decimalOdds>1000)continue;
  const kickoff=kickoffs.get(quote.eventId);
  const values=scores.get(quote.eventId);
  if(kickoff===undefined||!values?.length)continue;
  const at=Date.parse(quote.capturedAt);
  if(!Number.isFinite(at)||at<kickoff||at>Math.min(asOf,kickoff+4*3600000))continue;
  if(quote.providerLastUpdate){
   const upstream=Date.parse(quote.providerLastUpdate);
   if(!Number.isFinite(upstream)||upstream>at||upstream>asOf)continue;
  }
  const tolerance=CO_CAPTURE_WINDOW_SECONDS*1000;
  let lo=0,hi=values.length;
  while(lo<hi){
   const m=(lo+hi)>>1;
   if(values[m]<at-tolerance)lo=m+1;
   else hi=m;
  }
  if(lo<values.length&&values[lo]<=at+tolerance){
   observed.add(quote.eventId);
   // Only score snapshots captured at or BEFORE the market quote may be
   // replayed as historical state known at the quote's capture time.
   if(values[lo]<=at)causal.add(quote.eventId);
  }
 }
 return{
  observedWithin2m:observed.size,
  causallyAlignedWithin2m:causal.size,
  lookaheadOnlyWithin2m:observed.size-causal.size,
  sourceClockIndependent:false,executablePriceVerified:false,
 };
}
/** Legacy symmetric co-capture metric is retained for source health only. */
export function historicalCoCapturedEvents(input:Parameters<typeof historicalTimingEvidence>[0]):number{
 return historicalTimingEvidence(input).observedWithin2m;
}
export function historicalCoCaptureSelfcheck(){
 const at="2026-10-14T18:00:00Z";
 const event:PersistedEvent={id:"fixture-one",canonicalKey:"fixture-one",
  event:{id:"fixture-one",sport:"football",competition:"Test source",
   startsAt:"2026-10-14T17:00:00Z",status:"live"}};
 const state:PersistedEventStateRecord={eventId:"fixture-one",
  sourceProvider:"api-football",capturedAt:"2026-10-14T17:30:00Z",
  state:{status:"live",score:{home:1,away:0}}};
 const quote:PersistedMarketQuoteRecord={eventId:"fixture-one",provider:"api-football-live-odds",
  bookmaker:"Identity unknown",marketKey:"inplay.1",selectionKey:"home",selectionLabel:"Home",
  decimalOdds:2.1,capturedAt:"2026-10-14T17:31:20Z",suspended:false};
 const score=(changes:Partial<Parameters<typeof historicalCoCapturedEvents>[0]>)=>
  historicalCoCapturedEvents({events:[event],states:[state],quotes:[quote],asOf:at,...changes});
 const checks=[
  {name:"Look-ahead only score must never count as causally usable at earlier quote time",
   passed:(()=>{
    const ahead={...state,capturedAt:"2026-10-14T17:32:00Z"};
    const v=historicalTimingEvidence({events:[event],states:[ahead],quotes:[quote],asOf:at});
    return v.observedWithin2m===1&&v.causallyAlignedWithin2m===0&&v.lookaheadOnlyWithin2m===1;
   })()},
  {name:"Past captured score within 120 seconds is temporally causal but not executable",
   passed:(()=>{
    const v=historicalTimingEvidence({events:[event],states:[state],quotes:[quote],asOf:at});
    return v.observedWithin2m===1&&v.causallyAlignedWithin2m===1&&
      v.lookaheadOnlyWithin2m===0&&!v.executablePriceVerified&&!v.sourceClockIndependent;
   })()},
  {name:"A later valid score quote on the same event can supersede an earlier lookahead-only pairing",
   passed:(()=>{
    const qEarlier={...quote,capturedAt:"2026-10-14T17:29:00Z"};
    const qLater={...quote,capturedAt:"2026-10-14T17:31:20Z"};
    const v=historicalTimingEvidence({events:[event],states:[state],quotes:[qEarlier,qLater],asOf:at});
    return v.observedWithin2m===1&&v.causallyAlignedWithin2m===1&&v.lookaheadOnlyWithin2m===0;
   })()},
  {name:"Real recorded score and active price within 80s share a historical canonical event",
   passed:score({})===1},
  {name:"Third-minute quote outside 120s does not pass a 2-minute comparison",
   passed:score({quotes:[{...quote,capturedAt:"2026-10-14T17:32:01Z"}]})===0},
  {name:"Different event id never matches by bookmaker or team names",
   passed:score({quotes:[{...quote,eventId:"different"}]})===0},
  {name:"Suspended market is not a usable observational pair",
   passed:score({quotes:[{...quote,suspended:true}]})===0},
  {name:"Unknown market availability status does not assert active price",
   passed:score({quotes:[{...quote,suspended:undefined}]})===0},
  {name:"Future provider update cannot establish historical provenance",
   passed:score({quotes:[{...quote,providerLastUpdate:"2026-10-14T17:32:00Z"}]})===0},
  {name:"Invalid and missing score cannot form a historical pair",
   passed:score({states:[{...state,state:{status:"live",score:{home:"1",away:0}}}]})===0},
  {name:"Old kickoff with post-match snapshots cannot be described as in-play",
   passed:score({events:[{...event,event:{...event.event,startsAt:"2026-10-14T11:00:00Z"}}]})===0},
  {name:"True final status is not a second live observation",
   passed:score({states:[{...state,state:{...state.state,status:"finished"}}]})===0},
  {name:"Duplicate quotes are counted once per canonical fixture",
   passed:score({quotes:[quote,quote,{...quote,selectionKey:"away"}]})===1},
  {name:"No future captured quote is eligible",
   passed:score({quotes:[{...quote,capturedAt:"2026-10-14T18:03:00Z"}]})===0},
 ];
 return{passed:checks.every(c=>c.passed),checks};
}
