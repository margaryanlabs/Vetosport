import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";

/**
 * Diagnostic of EXISTING in-play observations, not a provider SLA, prediction
 * backtest or executable market. API-Football score timestamps are gateway
 * acquisition times, so co-capture doesn't certify synchronized source clocks.
 */
export type CaptureLagSpectrum={
 model:"veto.capture-lag-spectrum.observed-v1";
 windowSeconds:[120,600,1800];
 eventCounts:{within2m:number;between2and10m:number;between10and30m:number;over30m:number};
 qualifyingStateEvents:number;
 qualifyingOpenPriceEvents:number;
 withBothSources:number;
 unidentifiedBookmakerMatches:number;
 providerValidatedExecution:false;
 gatewayTimesNotIndependent:true;
};
const unix=(x:string)=>Date.parse(x);
const validScore=(state:Record<string,unknown>)=>{
 if(state.status!=="live")return false;
 const s=state.score;
 if(!s||typeof s!=="object"||Array.isArray(s))return false;
 const {home,away}=s as {home?:unknown;away?:unknown};
 return [home,away].every(n=>typeof n==="number"&&Number.isInteger(n)&&n>=0&&n<=40);
};
const unknownBookmaker=(name:string)=>/unknown|unspecified|не указан|api.football/i.test(name);

/** Best absolute time separation per distinct canonical fixture (bounded 4h).
 * Excludes suspended/unknown-availability quotes. Per-event bucketing avoids
 * misleading inflation from dozens of bookmaker selections for one match.
 */
export function captureLagSpectrum(input:{
 events:PersistedEvent[];
 states:PersistedEventStateRecord[];
 quotes:PersistedMarketQuoteRecord[];
 asOf:string;
}):CaptureLagSpectrum{
 const now=unix(input.asOf);
 const kickoffs=new Map<string,number>();
 if(Number.isFinite(now))for(const e of input.events){
  if(e.event.sport!=="football")continue;
  const start=unix(e.event.startsAt);
  if(Number.isFinite(start)&&start<=now)kickoffs.set(e.id,start);
 }
 const validTime=(eventId:string,time:string)=>{
  const start=kickoffs.get(eventId),value=unix(time);
  return start!==undefined&&Number.isFinite(value)&&value>=start&&
   value<=Math.min(now,start+4*3600000);
 };
 const scoreTimes=new Map<string,number[]>();
 for(const s of input.states){
  if(s.sourceProvider!=="api-football"||!validScore(s.state)||
    !validTime(s.eventId,s.capturedAt))continue;
  const arr=scoreTimes.get(s.eventId)??[];
  arr.push(unix(s.capturedAt));scoreTimes.set(s.eventId,arr);
 }
 for(const arr of scoreTimes.values())arr.sort((a,b)=>a-b);
 const openPriceEvents=new Set<string>();
 const matched=new Map<string,{min:number;unidentified:boolean}>();
 for(const q of input.quotes){
  if(q.provider==="normalized"||q.suspended!==false||
   !Number.isFinite(q.decimalOdds)||q.decimalOdds<=1||q.decimalOdds>1000||
   !validTime(q.eventId,q.capturedAt))continue;
  const at=unix(q.capturedAt);
  if(q.providerLastUpdate){
   const updated=unix(q.providerLastUpdate);
   if(!Number.isFinite(updated)||updated>at||updated>now)continue;
  }
  openPriceEvents.add(q.eventId);
  const arr=scoreTimes.get(q.eventId);
  if(!arr?.length)continue;
  let lo=0,hi=arr.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(arr[mid]<at)lo=mid+1;else hi=mid;}
  let distance=Infinity;
  if(lo<arr.length)distance=Math.min(distance,Math.abs(at-arr[lo]));
  if(lo>0)distance=Math.min(distance,Math.abs(at-arr[lo-1]));
  const previous=matched.get(q.eventId);
  if(!previous||distance<previous.min){
   matched.set(q.eventId,{min:distance,unidentified:unknownBookmaker(q.bookmaker)});
  }else if(distance===previous.min&&!unknownBookmaker(q.bookmaker)){
   // Keep identity caveat truthful when equally near observations have one
   // identified and one unidentified bookmaker.
   previous.unidentified=false;
  }
 }
 const bins={within2m:0,between2and10m:0,between10and30m:0,over30m:0};
 let unidentifiedBookmakerMatches=0;
 for(const p of matched.values()){
  if(p.min<=120000)bins.within2m++;
  else if(p.min<=600000)bins.between2and10m++;
  else if(p.min<=1800000)bins.between10and30m++;
  else bins.over30m++;
  if(p.unidentified)unidentifiedBookmakerMatches++;
 }
 return{
  model:"veto.capture-lag-spectrum.observed-v1",windowSeconds:[120,600,1800],
  eventCounts:bins,qualifyingStateEvents:scoreTimes.size,
  qualifyingOpenPriceEvents:openPriceEvents.size,withBothSources:matched.size,
  unidentifiedBookmakerMatches,providerValidatedExecution:false,
  gatewayTimesNotIndependent:true,
 };
}
export function captureLagSpectrumSelfcheck(){
 const now="2026-10-15T12:00:00Z";
 const ev=(id:string):PersistedEvent=>({
  id,canonicalKey:id,event:{id,sport:"football",competition:"Test",
    startsAt:"2026-10-15T10:00:00Z",status:"live"}});
 const state=(id:string,at:string):PersistedEventStateRecord=>({
  eventId:id,sourceProvider:"api-football",capturedAt:at,
  state:{status:"live",score:{home:1,away:0}}});
 const quote=(id:string,at:string):PersistedMarketQuoteRecord=>({
  eventId:id,provider:"api-football-live-odds",
  bookmaker:"API-Football · букмекер не указан",marketKey:"goals",
  selectionKey:"over-2.5",selectionLabel:"Over 2.5",
  decimalOdds:1.7,capturedAt:at,suspended:false});
 const e=[ev("a"),ev("b"),ev("c"),ev("d")];
 const states=[state("a","2026-10-15T10:35:00Z"),state("b","2026-10-15T10:35:00Z"),
  state("c","2026-10-15T10:35:00Z"),state("d","2026-10-15T10:35:00Z")];
 const prices=[quote("a","2026-10-15T10:36:00Z"),
  quote("b","2026-10-15T10:42:00Z"),
  quote("c","2026-10-15T10:55:00Z"),
  quote("d","2026-10-15T11:10:00Z")];
 const sample=(extra:Partial<Parameters<typeof captureLagSpectrum>[0]>)=>
  captureLagSpectrum({events:e,states,quotes:prices,asOf:now,...extra});
 const a=sample({});
 const checks=[
  {name:"Exactly one event in each timing lag bucket",passed:Object.values(a.eventCounts).every(v=>v===1)},
  {name:"Each match counted once despite duplicate odds selections",
   passed:sample({quotes:[...prices,prices[0],{...prices[0],selectionKey:"under"}]}).withBothSources===4},
  {name:"Missing bookmaker identity remains explicit",
   passed:a.unidentifiedBookmakerMatches===4&&a.providerValidatedExecution===false},
  {name:"No independent timestamp proof invented",passed:a.gatewayTimesNotIndependent===true},
  {name:"Suspended odds never create a matched event",
   passed:sample({quotes:prices.map(q=>({...q,suspended:true}))}).withBothSources===0},
  {name:"Unknown market availability does not become open market",
   passed:sample({quotes:prices.map(q=>({...q,suspended:undefined}))}).qualifyingOpenPriceEvents===0},
  {name:"Score must contain numeric home and away",
   passed:sample({states:states.map(s=>({...s,state:{status:"live",score:{home:"1",away:0}}}))}).withBothSources===0},
  {name:"No future source update or premature kickoff",
   passed:sample({quotes:[{...prices[0],providerLastUpdate:"2026-10-15T10:39:00Z"}]}).withBothSources===0},
  {name:"No joins across different canonical events",
   passed:sample({quotes:[quote("missing","2026-10-15T10:36:00Z")]}).withBothSources===0},
  {name:"Closest sample chosen even with multiple chronological scores",
   passed:sample({states:[...states,state("b","2026-10-15T10:41:30Z")]}).eventCounts.within2m===2},
  {name:"Captured 5h after kickoff is outside football regulation observation",
   passed:sample({events:e.map(x=>({...x,event:{...x.event,startsAt:"2026-10-15T05:00:00Z"}}))}).withBothSources===0},
 ];
 return{passed:checks.every(c=>c.passed),checks};
}
