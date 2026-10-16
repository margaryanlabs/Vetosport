import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";

/** Read-only samples for independent inspection of the source evidence chain.
 * These are historical acquisition timestamps (not synchronized exchange
 * clocks) and cannot validate price execution, profitability or FT results.
 */
export type ObservationEvidenceRow={
 eventId:string;
 competition:string;
 matchLabel:string;
 status:"SCORE_BEFORE_PRICE"|"SCORE_AFTER_PRICE";
 scoreAt:string;
 quoteAt:string;
 deltaSeconds:number;
 score:{home:number;away:number};
 marketKey:string;
 selectionLabel:string;
 decimalOdds:number;
 priceSource:string;
 bookmakerIdentified:boolean;
 providerUpdateAfterScore:boolean|null;
 sourceClockIndependent:false;
 executablePriceVerified:false;
};
export type ObservationLedger={
 rows:ObservationEvidenceRow[];
 causalExamples:number;
 lookaheadExamples:number;
 totalShown:number;
 maxShown:12;
 source:"PERSISTED_ONLY";
 observationIsNotExecution:true;
};
const parse=(s:string)=>Date.parse(s);
const valid=(n:unknown)=>typeof n==="number"&&Number.isInteger(n)&&n>=0&&n<=40;
const bookieVerified=(source:string,name:string)=>
 source==="the-odds-api"&&name.trim().length>1&&
 !/unknown|unspecified|не указан|api.?football|bookmaker not|no bookmaker/i.test(name);
const cap=(v:string,max=90)=>v.replace(/[\x00-\x1f\x7f]/g," ").trim().slice(0,max);

export function buildHistoricalObservationLedger(input:{
 events:PersistedEvent[];states:PersistedEventStateRecord[];
 quotes:PersistedMarketQuoteRecord[];asOf:string;
}):ObservationLedger{
 const asOf=parse(input.asOf),empty=():ObservationLedger=>({
  rows:[],causalExamples:0,lookaheadExamples:0,totalShown:0,maxShown:12,
  source:"PERSISTED_ONLY",observationIsNotExecution:true,
 });
 if(!Number.isFinite(asOf))return empty();
 const eventMap=new Map<string,{event:PersistedEvent;start:number}>();
 for(const event of input.events){
  const start=parse(event.event.startsAt);
  if(event.event.sport!=="football"||!Number.isFinite(start)||
   start>asOf||eventMap.has(event.id))continue;
  eventMap.set(event.id,{event,start});
 }
 const scores=new Map<string,Array<{time:number;home:number;away:number}>>();
 for(const s of input.states){
  const found=eventMap.get(s.eventId);
  if(!found||s.sourceProvider!=="api-football"||s.state.status!=="live")continue;
  const at=parse(s.capturedAt),sc=s.state.score;
  if(!Number.isFinite(at)||at<found.start||at>Math.min(asOf,found.start+4*3600000)||
   !sc||typeof sc!=="object"||Array.isArray(sc))continue;
  const vals=sc as {home?:unknown;away?:unknown};
  if(!valid(vals.home)||!valid(vals.away))continue;
  const row={time:at,home:vals.home as number,away:vals.away as number};
  const current=scores.get(s.eventId)??[];
  current.push(row);scores.set(s.eventId,current);
 }
 for(const a of scores.values())a.sort((x,y)=>x.time-y.time);
 const best=new Map<string,ObservationEvidenceRow>();
 for(const q of input.quotes){
  const linked=eventMap.get(q.eventId),samples=scores.get(q.eventId);
  if(!linked||!samples?.length||q.provider==="normalized"||
   q.suspended!==false||!Number.isFinite(q.decimalOdds)||
   q.decimalOdds<=1||q.decimalOdds>1000)continue;
  const at=parse(q.capturedAt);
  if(!Number.isFinite(at)||at<linked.start||
   at>Math.min(asOf,linked.start+4*3600000))continue;
  const sourceTime=q.providerLastUpdate?parse(q.providerLastUpdate):null;
  if(sourceTime!==null&&(!Number.isFinite(sourceTime)||sourceTime>at))continue;
  // Locate closest score at/before the market; consider score after market
  // ONLY as an explicit look-ahead trap, never as causal evidence.
  let left=0,right=samples.length;
  while(left<right){const m=(left+right)>>1;if(samples[m].time<=at)left=m+1;else right=m;}
  const prior=left>0?samples[left-1]:null,next=left<samples.length?samples[left]:null;
  let score:typeof prior,status:ObservationEvidenceRow["status"];
  if(prior&&at-prior.time<=120000){score=prior;status="SCORE_BEFORE_PRICE";}
  else if(next&&next.time-at<=120000){score=next;status="SCORE_AFTER_PRICE";}
  else continue;
  if(!score)continue;
  const delta=Math.round(Math.abs(at-score.time)/1000);
  const row:ObservationEvidenceRow={
   eventId:q.eventId,competition:cap(linked.event.event.competition,70),
   matchLabel:cap((linked.event.event.home?.name??"Home")+" — "+
    (linked.event.event.away?.name??"Away"),100),
   status,scoreAt:new Date(score.time).toISOString(),
   quoteAt:new Date(at).toISOString(),deltaSeconds:delta,
   score:{home:score.home,away:score.away},
   marketKey:cap(q.marketKey,80),selectionLabel:cap(q.selectionLabel,80),
   decimalOdds:q.decimalOdds,priceSource:cap(q.provider,55),
   bookmakerIdentified:bookieVerified(q.provider,q.bookmaker),
   providerUpdateAfterScore:sourceTime===null?null:sourceTime>=score.time,
   sourceClockIndependent:false,executablePriceVerified:false,
  };
  const previous=best.get(q.eventId);
  // One representative per canonical event, prefer causal captures, then
  // closest timestamps, then newest; no odds-based cherry-picking.
  if(!previous||
   (previous.status==="SCORE_AFTER_PRICE"&&status==="SCORE_BEFORE_PRICE")||
   (previous.status===status&&(delta<previous.deltaSeconds||
    (delta===previous.deltaSeconds&&at>parse(previous.quoteAt)))))
   best.set(q.eventId,row);
 }
 const all=[...best.values()].sort((a,b)=>
  Number(b.status==="SCORE_BEFORE_PRICE")-
  Number(a.status==="SCORE_BEFORE_PRICE")||
  b.quoteAt.localeCompare(a.quoteAt));
 // Preserve both a causal and a look-ahead audit when available.
 const causal=all.filter(r=>r.status==="SCORE_BEFORE_PRICE").slice(0,8);
 const unsafe=all.filter(r=>r.status==="SCORE_AFTER_PRICE").slice(0,4);
 const rows=[...causal,...unsafe].slice(0,12);
 return{rows,causalExamples:causal.length,lookaheadExamples:unsafe.length,
  totalShown:rows.length,maxShown:12,source:"PERSISTED_ONLY",
  observationIsNotExecution:true};
}
export function historicalObservationLedgerSelfcheck(){
 const asOf="2026-10-15T12:00:00Z";
 const event:PersistedEvent={id:"observed",canonicalKey:"observed",event:{
  id:"football-id",sport:"football",competition:"League",
  startsAt:"2026-10-15T10:00:00Z",status:"live",
  home:{id:"h",name:"Home"},away:{id:"a",name:"Away"}}};
 const score:PersistedEventStateRecord={eventId:"observed",sourceProvider:"api-football",
  capturedAt:"2026-10-15T10:40:00Z",
  state:{status:"live",score:{home:1,away:0}}};
 const quote:PersistedMarketQuoteRecord={
  eventId:"observed",provider:"api-football-live-odds",
  bookmaker:"API-Football · букмекер не указан",
  marketKey:"inplay-total",selectionKey:"under",selectionLabel:"Under 3.5",
  decimalOdds:1.85,capturedAt:"2026-10-15T10:41:00Z",
  providerLastUpdate:"2026-10-15T10:40:30Z",suspended:false};
 const test=(events=[event],states=[score],quotes=[quote])=>
  buildHistoricalObservationLedger({events,states,quotes,asOf});
 const good=test();
 const checks=[
  {name:"Chronological score-before-price produces an inspectable observation only",
   passed:good.totalShown===1&&good.causalExamples===1&&good.lookaheadExamples===0},
  {name:"Unidentified bookmaker never becomes authenticated execution evidence",
   passed:!good.rows[0].bookmakerIdentified&&!good.rows[0].executablePriceVerified&&
    !good.rows[0].sourceClockIndependent},
  {name:"Price predating only known score is explicitly classified as look-ahead",
   passed:test([event],[score],[{...quote,capturedAt:"2026-10-15T10:39:00Z",
    providerLastUpdate:"2026-10-15T10:38:00Z"}]).lookaheadExamples===1},
  {name:"Same event can have only one chosen sample despite multiple selections",
   passed:test([event],[score],[quote,quote,{...quote,selectionKey:"over"}]).totalShown===1},
  {name:"Different fixture IDs never cross-link based on team names",
   passed:test([event],[score],[{...quote,eventId:"unrelated"}]).totalShown===0},
  {name:"Suspended prices cannot produce a historical match",
   passed:test([event],[score],[{...quote,suspended:true}]).totalShown===0},
  {name:"Unknown suspension cannot be called an available historical price",
   passed:test([event],[score],[{...quote,suspended:undefined}]).totalShown===0},
  {name:"Post-score provider update is not independent clock certification",
   passed:good.rows[0].providerUpdateAfterScore===true&&!good.rows[0].sourceClockIndependent},
  {name:"Future-dated quote is not historical evidence",
   passed:test([event],[score],[{...quote,capturedAt:"2026-10-15T12:10:00Z"}]).totalShown===0},
  {name:"More than two minutes gap does not link score and quote",
   passed:test([event],[score],[{...quote,capturedAt:"2026-10-15T10:42:01Z"}]).totalShown===0},
  {name:"Score must be numeric and sourced from API-Football",
   passed:test([event],[{...score,sourceProvider:"other"}]).totalShown===0&&
    test([event],[{...score,state:{status:"live",score:{home:"1",away:0}}}]).totalShown===0},
  {name:"No observation past four hours after kickoff",
   passed:test([{...event,event:{...event.event,startsAt:"2026-10-15T05:00:00Z"}}]).totalShown===0},
  {name:"Provider update from after market time is rejected",
   passed:test([event],[score],[{...quote,providerLastUpdate:"2026-10-15T10:42:00Z"}]).totalShown===0},
  {name:"At most twelve user-visible rows with balanced causal and look-ahead samples",
   passed:(()=>{
    const evs=Array.from({length:30},(_,i)=>({...event,id:"id-"+i}));
    const states=evs.map(e=>({...score,eventId:e.id}));
    const quotes=evs.map(e=>({...quote,eventId:e.id}));
    return test(evs,states,quotes).totalShown<=12;
   })()},
 ];
 return{passed:checks.every(c=>c.passed),checks};
}
