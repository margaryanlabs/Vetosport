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
export function historicalCoCapturedEvents(input:{
 events:PersistedEvent[];
 states:PersistedEventStateRecord[];
 quotes:PersistedMarketQuoteRecord[];
 asOf:string;
}):number{
 const asOf=Date.parse(input.asOf);
 if(!Number.isFinite(asOf))return 0;
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
  const s=row.state.score;
  if(!s||typeof s!=="object"||Array.isArray(s))continue;
  const v=s as {home?:unknown;away?:unknown};
  if(![v.home,v.away].every(n=>typeof n==="number"&&Number.isInteger(n)&&n>=0&&n<=40))continue;
  const samples=scores.get(row.eventId)??[];
  samples.push(captured);
  scores.set(row.eventId,samples);
 }
 for(const times of scores.values())times.sort((a,b)=>a-b);
 const found=new Set<string>();
 for(const quote of input.quotes){
  if(found.has(quote.eventId)||quote.provider==="normalized"||
    quote.suspended!==false||!Number.isFinite(quote.decimalOdds)||
    quote.decimalOdds<=1||quote.decimalOdds>1000)continue;
  const kickoff=kickoffs.get(quote.eventId),values=scores.get(quote.eventId);
  if(kickoff===undefined||!values?.length)continue;
  const at=Date.parse(quote.capturedAt);
  if(!Number.isFinite(at)||at<kickoff||at>Math.min(asOf,kickoff+4*3600000))continue;
  // Explicit source update must never come from the future of the captured
  // price; absent timestamps are allowed for OBSERVATIONAL co-capture only.
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
  if(lo<values.length&&values[lo]<=at+tolerance)found.add(quote.eventId);
 }
 return found.size;
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
