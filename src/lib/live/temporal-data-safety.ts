import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";

/**
 * Distinguish a historical quote and a last-known LIVE flag from actionable
 * information. A successful fetch is not independent calibration, and this
 * gate never certifies a profitable bet.
 */
export interface TemporalDataSafety {
 shadowObservationReady:boolean;
 liveExecutionInputsReady:boolean;
 scoreAgeSeconds:number|null;
 youngestPriceAgeSeconds:number|null;
 eligibleShadowQuotes:PersistedMarketQuoteRecord[];
 eligibleLiveQuotes:PersistedMarketQuoteRecord[];
 blockers:string[];
}
const age=(value:string|undefined,now:number):number|null=>{
 const timestamp=value?Date.parse(value):NaN;
 return Number.isFinite(timestamp)&&timestamp<=now
   ?Math.floor((now-timestamp)/1000):null;
};
const hasBookmaker=(q:PersistedMarketQuoteRecord)=>
 q.provider==="the-odds-api"&&
 typeof q.bookmaker==="string"&&q.bookmaker.trim().length>1&&
 !/unknown|unspecified|не указан|api-football/i.test(q.bookmaker);

export function temporalDataSafety(input:{
 event:PersistedEvent;
 state?:PersistedEventStateRecord;
 quotes:PersistedMarketQuoteRecord[];
 at?:string;
}):TemporalDataSafety{
 const now=input.at?Date.parse(input.at):Date.now();
 const started=Date.parse(input.event.event.startsAt);
 const kickoffAge=Number.isFinite(now)&&Number.isFinite(started)?now-started:NaN;
 const contextReady=input.event.event.sport==="football"&&
  input.event.event.status==="live"&&input.state?.state.status==="live"&&
  Number.isFinite(kickoffAge)&&kickoffAge>=0&&kickoffAge<=4*3600000;
 const scoreAgeSeconds=input.state?age(input.state.capturedAt,now):null;
 const shadowStateReady=contextReady&&scoreAgeSeconds!==null&&scoreAgeSeconds<=45*60;
 const liveStateReady=shadowStateReady&&scoreAgeSeconds!==null&&scoreAgeSeconds<=120;
 const prices=input.quotes.filter(q=>q.eventId===input.event.id&&
  !q.suspended&&Number.isFinite(q.decimalOdds)&&q.decimalOdds>1&&q.decimalOdds<=1000);
 const elapsedPrice=prices.map(q=>age(q.capturedAt,now)).filter((n):n is number=>n!==null);
 const youngestPriceAgeSeconds=elapsedPrice.length?Math.min(...elapsedPrice):null;
 const aligned=(q:PersistedMarketQuoteRecord,seconds:number)=>{
  const quoteTime=Date.parse(q.capturedAt);
  const stateTime=input.state?Date.parse(input.state.capturedAt):NaN;
  const quoteAge=age(q.capturedAt,now);
  return quoteAge!==null&&quoteAge<=seconds&&
   Number.isFinite(stateTime)&&Math.abs(quoteTime-stateTime)<=seconds*1000;
 };
 const eligibleShadowQuotes=shadowStateReady?
   prices.filter(q=>aligned(q,45*60)):[];
 const eligibleLiveQuotes=liveStateReady?prices.filter(q=>
  aligned(q,120)&&hasBookmaker(q)&&
  age(q.providerLastUpdate,now)!==null&&age(q.providerLastUpdate,now)!<=120):[];
 const blockers=[
  ...(!contextReady?["Live status, realistic kickoff age or current regulation play not confirmed."]:[]),
  ...(!shadowStateReady?["No usable game-state snapshot within 45 minutes."]:[]),
  ...(eligibleShadowQuotes.length===0?["No temporally aligned and active quote within 45 minutes for shadow research."]:[]),
  ...(!liveStateReady?["No verified game-state capture within two minutes."]:[]),
  ...(eligibleLiveQuotes.length===0?["No two-minute provider-timestamped bookmaker quote from The Odds API for the same event."]:[]),
 ];
 return{shadowObservationReady:shadowStateReady&&eligibleShadowQuotes.length>0,
  liveExecutionInputsReady:liveStateReady&&eligibleLiveQuotes.length>0,
  scoreAgeSeconds,youngestPriceAgeSeconds,eligibleShadowQuotes,eligibleLiveQuotes,blockers};
}
export function temporalDataSafetySelfcheck(){
 const now="2026-10-14T12:00:00Z";
 const event:PersistedEvent={id:"source-fixture",canonicalKey:"test-fixture",
  event:{id:"fixture",sport:"football",competition:"Test league",
   startsAt:"2026-10-14T11:00:00Z",status:"live"}};
 const state:PersistedEventStateRecord={eventId:event.id,
  sourceProvider:"api-football",capturedAt:"2026-10-14T11:59:30Z",
  state:{status:"live",score:{home:1,away:1}}};
 const quote:PersistedMarketQuoteRecord={eventId:event.id,provider:"the-odds-api",
  bookmaker:"Bet365",marketKey:"football.1x2",selectionKey:"home",selectionLabel:"Home",
  decimalOdds:2.1,capturedAt:"2026-10-14T11:59:45Z",
  providerLastUpdate:"2026-10-14T11:59:40Z",suspended:false};
 const gate=(s=state,q=[quote],e=event)=>temporalDataSafety({event:e,state:s,quotes:q,at:now});
 const valid=gate();
 const tests=[
  {name:"Source-backed recent and aligned quote passes timestamp gates only",passed:
    valid.shadowObservationReady&&valid.liveExecutionInputsReady},
  {name:"45-minute old quote cannot authorize live execution",passed:
    gate(state,[{...quote,capturedAt:"2026-10-14T11:35:00Z"}]).liveExecutionInputsReady===false},
  {name:"Unknown bookmaker cannot authorize executable quote",passed:
    !gate(state,[{...quote,bookmaker:"API-Football · букмекер не указан",provider:"api-football-live-odds"}]).liveExecutionInputsReady},
  {name:"Quote older than source-update time is rejected",passed:
    !gate(state,[{...quote,providerLastUpdate:"2026-10-14T11:40:00Z"}]).liveExecutionInputsReady},
  {name:"Suspended bookmaker quote cannot become a live signal",passed:
    !gate(state,[{...quote,suspended:true}]).shadowObservationReady},
  {name:"Stale score blocks forecasts even when odds look current",passed:
    !gate({...state,capturedAt:"2026-10-14T10:00:00Z"}).shadowObservationReady},
  {name:"Kickoff four hours ago blocks misleading lingering LIVE status",passed:
    !gate(state,[quote],{...event,event:{...event.event,startsAt:"2026-10-14T07:00:00Z"}}).liveExecutionInputsReady},
  {name:"Source event already finished cannot become a new prediction",passed:
    !gate(state,[quote],{...event,event:{...event.event,status:"finished"}}).shadowObservationReady},
  {name:"Future-dated source quotes do not pass time checks",passed:
    !gate(state,[{...quote,capturedAt:"2026-10-14T12:05:00Z"}]).liveExecutionInputsReady},
  {name:"Unaligned capture timestamps block live input readiness",passed:
    !gate({...state,capturedAt:"2026-10-14T11:53:00Z"}).liveExecutionInputsReady},
  {name:"Missing game-state snapshot never yields live or shadow signal",passed:
    !temporalDataSafety({event,quotes:[quote],at:now}).shadowObservationReady},
  {name:"Known bookmaker cannot compensate for missing upstream timestamp",passed:
    !gate(state,[{...quote,providerLastUpdate:undefined}]).liveExecutionInputsReady},
 ];
 return{passed:tests.every(t=>t.passed),tests};
}
