/**
 * Prospective market CONTROL proof, not a sportsbook edge validator.
 *
 * Each observation must have been LOCKED in the paper journal before kickoff,
 * and each graded result must match the exact-ID, independent FT stored in
 * event-state history. We never backfill forecasts from a quote observed only
 * after the result, or select a retrospectively lucky paper pick.
 */
import type {PersistedEvent,PersistedEventStateRecord} from "@/lib/persistence/contracts";
import type {DailyPaperPick,DailyPaperSettlement} from "@/lib/paper/daily-research";
import {confirmForwardPaper} from "@/lib/paper/daily-research";
import {isExactEplFixture} from "@/lib/paper/epl-exact-identity";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

const dt=(s:string)=>Date.parse(s);
const rnd=(n:number)=>Number(n.toFixed(5));
const LIMIT=70;
export type ControlRow={
 pickId:string;eventId:string;match:string;competition:string;startsAt:string;
 recordedAt:string;quoteAt:string;bookmaker:string;
 selection:string;probability:number;odds:number;
 status:"VERIFIED_FT"|"WAITING_FOR_FT"|"FT_CERTIFIED_BUT_PAPER_NOT_SETTLED";
 outcome:0|1|null;score:{home:number;away:number}|null;source:string|null;
 brier:number|null;logLoss:number|null;virtualProfit:number|null;
};
export type MarketControlProof={
 ok:true;source:"PERSISTED_ONLY";model:"veto.market-control.prospective.v1";
 generatedAt:string;rows:ControlRow[];
 coverage:{picksRead:number;settlementsRead:number;eligibleLockedFixtures:number;
  duplicateFixtureTicketsExcluded:number;invalidProspectiveTicketsExcluded:number;
  missingEventDetails:number;stateRowsRead:number;
  sourceCertified:number;verifiedSettlements:number;unreconciledFinals:number;
  unresolved:number;picksMayBeCapped:boolean;eventReadsMayBeCapped:boolean;
  stateReadsMayBeCapped:boolean};
 quality:{samples:number;wins:number;losses:number;meanProbability:number|null;
  observedFrequency:number|null;brier:number|null;logLoss:number|null;
  virtualNet:number;virtualStake:number;virtualYieldPct:number|null;
  sufficientForCalibration:boolean;independentModel:false;
  executionVerified:false;profitabilityVerified:false};
 reliability:Array<{from:number;to:number;count:number;
  forecastMean:number;observedFrequency:number}>;
 externalProviderCalls:0;realMoneyBets:0;
};
function eligibleTicket(p:DailyPaperPick,asOf:string):boolean{
 const now=dt(asOf),starts=dt(p.eventStartsAt),lock=dt(p.pickedAt),
  q=dt(p.quoteAt),up=dt(p.providerUpdatedAt);
 return p.protocol==="veto.paper.forward-observed.v1"&&
  p.lane==="PREMATCH_ODDS_CONTROL"&&
  p.modelVersion==="ODDS_PREMATCH_DEVIG_CONTROL_V1"&&
  p.quoteProvider==="the-odds-api"&&
  typeof p.bookmaker==="string"&&p.bookmaker.trim().length>1&&
  ["FT_HOME","FT_DRAW","FT_AWAY"].includes(p.contract)&&
  typeof p.id==="string"&&typeof p.eventId==="string"&&
  Number.isFinite(now)&&Number.isFinite(starts)&&
  Number.isFinite(lock)&&Number.isFinite(q)&&Number.isFinite(up)&&
  now>=lock&&lock<starts&&lock>=q&&q>=up&&
  starts-lock>=30*60_000&&starts-lock<=48*3600_000&&
  p.stake>0&&p.stake<=1000&&Number.isFinite(p.stake)&&
  Number.isFinite(p.modelProbability)&&p.modelProbability>0&&p.modelProbability<1&&
  Number.isFinite(p.odds)&&p.odds>1&&p.odds<=50&&
  p.stateAt===null&&p.modelAt===null;
}
export function buildProspectiveMarketProof(input:{
 picks:DailyPaperPick[];settlements:DailyPaperSettlement[];
 events:PersistedEvent[];states:PersistedEventStateRecord[];asOf:string;
 picksMayBeCapped?:boolean;eventReadsMayBeCapped?:boolean;stateReadsMayBeCapped?:boolean;
}):MarketControlProof{
 const events=new Map(input.events.map(e=>[e.id,e]));
 const states=new Map<string,PersistedEventStateRecord[]>();
 for(const state of input.states){
  const bucket=states.get(state.eventId)??[];
  bucket.push(state);states.set(state.eventId,bucket);
 }
 const recorded=new Map<string,DailyPaperSettlement[]>();
 for(const result of input.settlements){
  const bucket=recorded.get(result.pickId)??[];
  bucket.push(result);recorded.set(result.pickId,bucket);
 }
 const eligible=input.picks.filter(p=>eligibleTicket(p,input.asOf))
  .sort((a,b)=>dt(a.pickedAt)-dt(b.pickedAt)||a.id.localeCompare(b.id));
 const firstPerEvent=new Map<string,DailyPaperPick>();
 for(const p of eligible)if(!firstPerEvent.has(p.eventId))firstPerEvent.set(p.eventId,p);
 const selected=[...firstPerEvent.values()].slice(0,LIMIT);
 let missingEventDetails=0,sourceCertified=0,unreconciledFinals=0;
 const rows:ControlRow[]=[];
 for(const pick of selected){
  const event=events.get(pick.eventId),eventStates=states.get(pick.eventId)??[];
  if(!event||event.event.sport!=="football"||isSelfcheckEvent(event)||
   !isExactEplFixture(event)||
   dt(event.event.startsAt)!==dt(pick.eventStartsAt)){
   missingEventDetails++;continue;
  }
  const expected=confirmForwardPaper(pick,event,eventStates,input.asOf);
  const providerConfirmed=expected?.provider==="the-odds-api";
  if(providerConfirmed)sourceCertified++;
  // Settlement must match the independently certified result exactly,
  // including event ownership and the event-locked full-time contract.
  const persisted=recorded.get(pick.id)??[];
  const matches=providerConfirmed?persisted.filter(s=>
   s.eventId===pick.eventId&&s.provider===expected.provider&&
   s.finalAt===expected.finalAt&&
   s.score.home===expected.score.home&&s.score.away===expected.score.away&&
   s.result===expected.result&&
   Number.isFinite(dt(s.settledAt))&&dt(s.settledAt)>=dt(s.finalAt)&&
   dt(s.settledAt)<=dt(input.asOf)):[]; 
  const fullProof=providerConfirmed&&persisted.length===1&&matches.length===1;
  if(providerConfirmed&&!fullProof)unreconciledFinals++;
  const outcome:0|1|null=fullProof?(expected.result==="WIN"?1:0):null;
  const modelP=pick.modelProbability;
  const safeP=Math.max(1e-9,Math.min(1-1e-9,modelP));
  const brier=outcome===null?null:rnd((modelP-outcome)**2);
  const logLoss=outcome===null?null:rnd(-(outcome*Math.log(safeP)+(1-outcome)*Math.log(1-safeP)));
  rows.push({
   pickId:pick.id,eventId:pick.eventId,match:pick.match,
   competition:pick.competition,startsAt:pick.eventStartsAt,
   recordedAt:pick.pickedAt,quoteAt:pick.quoteAt,bookmaker:pick.bookmaker,
   selection:pick.contract,probability:pick.modelProbability,odds:pick.odds,
   status:fullProof?"VERIFIED_FT":providerConfirmed?
    "FT_CERTIFIED_BUT_PAPER_NOT_SETTLED":"WAITING_FOR_FT",
   outcome,score:fullProof?expected.score:null,
   source:fullProof?expected.provider:null,
   brier,logLoss,virtualProfit:outcome===null?null:rnd(
    outcome===1?pick.stake*(pick.odds-1):-pick.stake),
  });
 }
 const verified=rows.filter(r=>r.status==="VERIFIED_FT");
 const wins=verified.filter(r=>r.outcome===1).length;
 const sum=(f:(r:ControlRow)=>number)=>verified.reduce((a,b)=>a+f(b),0);
 const n=verified.length,stake=verified.reduce((s,r)=>{
  const p=firstPerEvent.get(r.eventId);return s+(p?.stake??0);
 },0);
 const net=rnd(sum(r=>r.virtualProfit??0));
 const bins=Array.from({length:5},(_,i)=>{
  const from=i/5,to=(i+1)/5;
  const bucket=verified.filter(r=>r.probability>=from&&
   (i===4?r.probability<=to:r.probability<to));
  if(!bucket.length)return null;
  return {from,to,count:bucket.length,
   forecastMean:rnd(bucket.reduce((a,b)=>a+b.probability,0)/bucket.length),
   observedFrequency:rnd(bucket.reduce((a,b)=>a+(b.outcome??0),0)/bucket.length)};
 }).filter((x):x is NonNullable<typeof x>=>x!==null);
 const coverage={picksRead:input.picks.length,settlementsRead:input.settlements.length,
  eligibleLockedFixtures:Math.min(LIMIT,firstPerEvent.size),
  duplicateFixtureTicketsExcluded:eligible.length-firstPerEvent.size,
  invalidProspectiveTicketsExcluded:input.picks.length-eligible.length,
  missingEventDetails,stateRowsRead:input.states.length,
  sourceCertified,verifiedSettlements:n,unreconciledFinals,
  unresolved:rows.filter(r=>r.status==="WAITING_FOR_FT").length,
  picksMayBeCapped:Boolean(input.picksMayBeCapped||firstPerEvent.size>LIMIT),
  eventReadsMayBeCapped:Boolean(input.eventReadsMayBeCapped),
  stateReadsMayBeCapped:Boolean(input.stateReadsMayBeCapped)};
 return {
  ok:true,source:"PERSISTED_ONLY",model:"veto.market-control.prospective.v1",
  generatedAt:input.asOf,rows:rows.sort((a,b)=>
   dt(b.startsAt)-dt(a.startsAt)||a.eventId.localeCompare(b.eventId)),
  coverage,quality:{samples:n,wins,losses:n-wins,
   meanProbability:n?rnd(sum(r=>r.probability)/n):null,
   observedFrequency:n?rnd(wins/n):null,
   brier:n?rnd(sum(r=>r.brier??0)/n):null,
   logLoss:n?rnd(sum(r=>r.logLoss??0)/n):null,
   virtualNet:net,virtualStake:rnd(stake),
   virtualYieldPct:stake?rnd(net/stake*100):null,
   sufficientForCalibration:n>=50&&!coverage.picksMayBeCapped&&
    !coverage.eventReadsMayBeCapped&&!coverage.stateReadsMayBeCapped&&
    missingEventDetails===0&&unreconciledFinals===0,
   independentModel:false,executionVerified:false,profitabilityVerified:false},
  reliability:bins,externalProviderCalls:0,realMoneyBets:0,
 };
}
export function prospectiveMarketProofSelfcheck(){
 const id="a".repeat(32),now="2026-10-18T18:00:00Z";
 const base:DailyPaperPick={
  id:"pk",protocol:"veto.paper.forward-observed.v1",
  eventId:"e",eventStartsAt:"2026-10-18T10:00:00Z",dayUTC:"2026-10-18",
  dailySlot:1,match:"Home — Away",competition:"EPL",
  contract:"FT_HOME",marketKey:"soccer_epl.h2h",selectionKey:"home",
  odds:2.1,stake:4,modelProbability:.48,modelVersion:"ODDS_PREMATCH_DEVIG_CONTROL_V1",
  quoteProvider:"the-odds-api",bookmaker:"RealBook",
  quoteAt:"2026-10-18T08:55:00Z",providerUpdatedAt:"2026-10-18T08:54:00Z",
  stateAt:null,modelAt:null,pickedAt:"2026-10-18T09:00:00Z",
  lane:"PREMATCH_ODDS_CONTROL"};
 const event:PersistedEvent={id:"e",canonicalKey:"football::epl::match",
  providerRefs:{"the-odds-api":id},
  event:{id,sport:"football",competition:"EPL",startsAt:base.eventStartsAt,
   status:"finished",home:{id:"h",name:"Home"},away:{id:"a",name:"Away"}}};
 const state:PersistedEventStateRecord={eventId:"e",sourceProvider:"the-odds-api",
  capturedAt:"2026-10-18T14:00:00Z",state:{source:"the-odds-api.scores",
   status:"finished",regulationTimeOnly:true,providerEventId:id,score:{home:2,away:0}}};
 const settlement:DailyPaperSettlement={pickId:"pk",eventId:"e",result:"WIN",
  score:{home:2,away:0},provider:"the-odds-api",finalAt:state.capturedAt,
  settledAt:"2026-10-18T14:01:00Z"};
 const run=(args:Partial<Parameters<typeof buildProspectiveMarketProof>[0]>={})=>
  buildProspectiveMarketProof({picks:[base],settlements:[settlement],
   events:[event],states:[state],asOf:now,...args});
 const actual=run();
 const checks=[
  {name:"One genuinely prospective event with exact FT scores one market control",
   pass:actual.quality.samples===1&&actual.quality.wins===1&&
    actual.quality.brier!==null&&actual.rows[0]?.source==="the-odds-api"},
  {name:"Virtual result descriptive only; no validated profitability",
   pass:actual.quality.virtualNet===4.4&&
    actual.quality.profitabilityVerified===false&&actual.quality.independentModel===false},
  {name:"Duplicate tickets for same fixture cannot inflate observations",
   pass:run({picks:[base,{...base,id:"pk2"}]}).quality.samples===1&&
    run({picks:[base,{...base,id:"pk2"}]}).coverage.duplicateFixtureTicketsExcluded===1},
  {name:"Paper WIN cannot override independently certified different FT",
   pass:run({states:[{...state,state:{...state.state,score:{home:0,away:2}}}]}).quality.samples===0},
  {name:"A settlement row without certified FT is not scored",
   pass:run({states:[]}).quality.samples===0},
  {name:"An independently certified FT not yet in paper ledger stays unreconciled",
   pass:run({settlements:[]}).coverage.unreconciledFinals===1&&
    run({settlements:[]}).quality.samples===0},
  {name:"A post-kickoff ticket cannot be graded retrospectively",
   pass:run({picks:[{...base,pickedAt:"2026-10-18T10:01:00Z"}]}).quality.samples===0},
  {name:"A quote timestamp later than ticket lock cannot be graded",
   pass:run({picks:[{...base,quoteAt:"2026-10-18T09:30:00Z"}]}).quality.samples===0},
  {name:"A bookmaker-derived control never masquerades as independent VETO prediction",
   pass:run({picks:[{...base,modelVersion:"football.score-clock-prior.v1"}]}).quality.samples===0},
  {name:"Different exact source event cannot be substituted",
   pass:run({events:[{...event,providerRefs:{"the-odds-api":"b".repeat(32)}}]}).quality.samples===0},
  {name:"Invalid cap prevents minimum calibration claim",
   pass:run({picksMayBeCapped:true}).quality.sufficientForCalibration===false},
 ];
 return {passed:checks.every(c=>c.pass),checks};
}
