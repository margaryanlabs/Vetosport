/** Forward-only, persistent, shared VETO Sport paper laboratory.
 * ALL amounts are virtual research USD. Never calls a bookmaker, places bets,
 * or presents an uncalibrated single shadow model as a validated advantage.
 */
import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord,PersistedPredictionSnapshotRecord} from "@/lib/persistence/contracts";
import type {LiveEventSummary,LiveQuotePreview} from "@/lib/live/types";
import {paperContractFromQuote,paperContractWins,certifyStoredPaperFinal,type PaperContract} from "@/lib/paper/paper-verification";
import {certifyPersistedOddsScore} from "@/lib/paper/odds-score-certification";
export const DAILY_PROTOCOL="veto.paper.forward-observed.v1" as const;
export const INITIAL_PAPER_BANK=200;
export const DAILY_PAPER_STAKE=4;
export const MAX_PAPER_PICKS_PER_DAY=3;
export type DailyPaperPick={
 id:string;protocol:string;eventId:string;eventStartsAt:string;dayUTC:string;dailySlot:number;
 match:string;competition:string;contract:PaperContract;marketKey:string;selectionKey:string;
 odds:number;stake:number;modelProbability:number;modelVersion:string;
 quoteProvider:string;bookmaker:string;quoteAt:string;providerUpdatedAt:string;
 stateAt:string|null;modelAt:string|null;pickedAt:string;
 lane?:"LIVE_OBSERVED"|"PREMATCH_ODDS_CONTROL";
};
export type DailyPaperSettlement={pickId:string;eventId:string;result:"WIN"|"LOSS";
 score:{home:number;away:number};provider:"api-football"|"the-odds-api";finalAt:string;settledAt:string};
export type DailyPaperTicket=DailyPaperPick&{settlement:DailyPaperSettlement|null};
export type DailyPaperAccount={
 protocol:typeof DAILY_PROTOCOL;mode:"LIVE_FORWARD_PAPER";sharedResearchAccount:true;moneyIsVirtual:true;
 currency:"USD";initialBank:number;stakePerPick:number;dailyCap:number;
 count:number;settled:number;open:number;wins:number;losses:number;
 net:number;balance:number;reserved:number;available:number;roiPct:number;
 yieldPct:number|null;maxDrawdown:number;daysActive:number;
 points:Array<{at:string;balance:number}>;daily:Array<{day:string;count:number;wins:number;losses:number;pnl:number}>;
 tickets:DailyPaperTicket[];
};
export const paperOutcome=(contract:PaperContract,score:{home:number;away:number}):boolean=>
 paperContractWins(contract,score)===true;
export const paperDay=(time:string)=>time.slice(0,10); // UTC only
const ms=(s:string)=>Date.parse(s);
const ageValid=(captured:string,now:number,limit=120_000)=>{
 const t=ms(captured);return Number.isFinite(t)&&t<=now&&now-t<=limit;
};
const modelVersion=(p:PersistedPredictionSnapshotRecord):string|null=>{
 const versions=new Set((Array.isArray(p.modelSignals)?p.modelSignals:[]).flatMap(x=>{
  if(!x||typeof x!=="object"||Array.isArray(x))return[];
  const v=x as {version?:unknown;mode?:unknown};
  return v.mode==="SHADOW"&&typeof v.version==="string"&&v.version.length>0&&v.version.length<=90?[v.version]:[];
 }));
 return versions.size===1?[...versions][0]:null;
};
const label=(event:PersistedEvent):LiveEventSummary=>({
 id:event.id,source:"persisted",sport:"football",sportLabel:"FOOTBALL",
 competition:event.event.competition,status:event.event.status,
 homeName:event.event.home?.name??"",awayName:event.event.away?.name??"",
 homeCode:"H",awayCode:"A",homeScore:"—",awayScore:"—",clock:"—",
 period:"—",pulse:"quiet",markets:0,repriced:0,intelligenceReady:false,
});
const target=(market:PaperContract):{marketKey:string;selectionKey:string}=>{
 const total=market.match(/^FT_TOTAL_(OVER|UNDER)_([1-4])_5$/);
 if(total)return{marketKey:"football.total_goals",
  selectionKey:`${total[1].toLowerCase()}-${total[2]}.5`};
 switch(market){
  case "FT_HOME":return {marketKey:"football.1x2",selectionKey:"home"};
  case "FT_AWAY":return {marketKey:"football.1x2",selectionKey:"away"};
  case "FT_DRAW":return {marketKey:"football.1x2",selectionKey:"draw"};
  case "FT_BTTS_YES":return {marketKey:"football.btts",selectionKey:"yes"};
  case "FT_BTTS_NO":return {marketKey:"football.btts",selectionKey:"no"};
 }
 throw new Error("UNRECOGNIZED_FULL_TIME_CONTRACT");
};
export type PaperProposal=Omit<DailyPaperPick,"id"|"dailySlot">;
/** Timestamp gate against post-hoc bets. The CURRENT cron time—not a historical
 * quote—creates the ticket. Markets must be tradable (suspended===false).
 * A missing provider update time is rejected rather than treated as fresh.
 */
export function proposeForwardPaper(input:{
 event:PersistedEvent;states:PersistedEventStateRecord[];
 quotes:PersistedMarketQuoteRecord[];predictions:PersistedPredictionSnapshotRecord[];asOf:string;
}):PaperProposal|null{
 const now=ms(input.asOf),event=input.event;
 if(!Number.isFinite(now)||event.event.sport!=="football"||event.event.status!=="live"||
   !event.event.home?.name||!event.event.away?.name||
   event.event.home.name.trim().toLowerCase()===event.event.away.name.trim().toLowerCase()||
   event.canonicalKey==="veto-sport-storage-selfcheck"||event.event.competition==="VETO Storage Selfcheck")
   return null;
 const kickoff=ms(event.event.startsAt);
 if(!Number.isFinite(kickoff)||now<kickoff||now>kickoff+105*60_000)return null;
 // No state with finished status can coexist with a legitimate forward ticket.
 if(input.states.some(s=>s.eventId===event.id&&s.state.status==="finished"&&ms(s.capturedAt)<=now))return null;
 const state=input.states.filter(s=>s.eventId===event.id&&s.sourceProvider==="api-football"&&
  s.state.status==="live"&&ageValid(s.capturedAt,now)).sort((a,b)=>ms(b.capturedAt)-ms(a.capturedAt))[0];
 if(!state)return null;
 const raw=input.quotes.filter(q=>
  q.eventId===event.id&&q.provider!=="normalized"&&q.suspended===false&&
  Number.isFinite(q.decimalOdds)&&q.decimalOdds>1&&q.decimalOdds<=20&&
  q.bookmaker.trim().length>0&&ageValid(q.capturedAt,now)&&
  ageValid(q.providerLastUpdate??"",now)&&ms(q.providerLastUpdate!)<=ms(q.capturedAt)&&
  ms(q.capturedAt)-ms(q.providerLastUpdate!)<=120_000)
  .sort((a,b)=>ms(a.capturedAt)-ms(b.capturedAt)||
    a.marketKey.localeCompare(b.marketKey)||a.selectionKey.localeCompare(b.selectionKey));
 let best:PaperProposal|null=null;
 for(const q of raw){
  const liveQuote:LiveQuotePreview={provider:q.provider,bookmaker:q.bookmaker,marketKey:q.marketKey,
   selectionKey:q.selectionKey,selectionLabel:q.selectionLabel,decimalOdds:q.decimalOdds,
   capturedAt:q.capturedAt,suspended:q.suspended};
  const contract=paperContractFromQuote(label(event),liveQuote);
  if(!contract)continue;
  const canonical=target(contract);
  const p=input.predictions.filter(x=>x.eventId===event.id&&x.marketKey===canonical.marketKey&&
   x.selectionKey===canonical.selectionKey&&x.fairProbability>0&&x.fairProbability<1&&
   ageValid(x.capturedAt,now)&&ms(x.capturedAt)<=ms(q.capturedAt)&&
   ms(x.capturedAt)>=ms(state.capturedAt)-60_000&&modelVersion(x)!==null)
   .sort((a,b)=>ms(b.capturedAt)-ms(a.capturedAt))[0];
  // A scientifically useful CONTROL COHORT can still be observed on days
  // when the shadow pipeline produced no model prediction. Its probability
  // is exactly 1/quote, NOT an independent VETO forecast or positive edge.
  const control=!p;
  const probability=p?.fairProbability??1/q.decimalOdds;
  const ev=probability*q.decimalOdds-1;
  // +5% is a fixed screening hypothesis for uncalibrated VETO model rows.
  // Control rows have EV=0 mechanically, and never claim a winning signal.
  if(!control&&ev<.05)continue;
  const row:PaperProposal={protocol:DAILY_PROTOCOL,eventId:event.id,eventStartsAt:event.event.startsAt,
   dayUTC:paperDay(input.asOf),match:`${event.event.home.name} — ${event.event.away.name}`,
   competition:event.event.competition,contract,marketKey:q.marketKey,selectionKey:q.selectionKey,
   odds:q.decimalOdds,stake:DAILY_PAPER_STAKE,modelProbability:probability,
   modelVersion:control?"QUOTE_IMPLIED_CONTROL_V1":modelVersion(p!)!,
   quoteProvider:q.provider,bookmaker:q.bookmaker,
   quoteAt:q.capturedAt,providerUpdatedAt:q.providerLastUpdate!,stateAt:state.capturedAt,
   modelAt:p?.capturedAt??state.capturedAt,pickedAt:input.asOf};
  // Pick the earliest quoted eligible price, stable tie breakers;
  // never choose the best eventual result in retrospect.
  if(!best||(best.modelVersion==="QUOTE_IMPLIED_CONTROL_V1"&&!control))best=row;
 }
 return best;
}
/** Exact eligibility remains owned by proposeForwardPaper; this is a
 * presentation-only high-level reason for a missing candidate, not an
 * alternative admission path. Do not derive model wins from this diagnostic.
 */
export type DailyPaperBlock="EVENT_NOT_LIVE"|"FRESH_SCORE_MISSING"|
 "FRESH_OPEN_PRICE_MISSING"|"FULLTIME_MARKET_NOT_MAPPED"|"TIMESTAMP_OR_MODEL_PROOF_INCOMPLETE";
export function explainPaperBlock(input:Parameters<typeof proposeForwardPaper>[0]):DailyPaperBlock{
 const now=ms(input.asOf);
 if(input.event.event.status!=="live")return "EVENT_NOT_LIVE";
 const freshState=input.states.some(s=>s.eventId===input.event.id&&
  s.sourceProvider==="api-football"&&s.state.status==="live"&&ageValid(s.capturedAt,now));
 if(!freshState)return "FRESH_SCORE_MISSING";
 const freshPrices=input.quotes.filter(q=>q.eventId===input.event.id&&q.suspended===false&&
  ageValid(q.capturedAt,now)&&ageValid(q.providerLastUpdate??"",now)&&
  Number.isFinite(q.decimalOdds)&&q.decimalOdds>1&&q.decimalOdds<=20);
 if(!freshPrices.length)return "FRESH_OPEN_PRICE_MISSING";
 if(!freshPrices.some(q=>paperContractFromQuote(label(input.event),{
  provider:q.provider,bookmaker:q.bookmaker,marketKey:q.marketKey,
  selectionKey:q.selectionKey,selectionLabel:q.selectionLabel,
  decimalOdds:q.decimalOdds,capturedAt:q.capturedAt,suspended:q.suspended,
 } as LiveQuotePreview)))return "FULLTIME_MARKET_NOT_MAPPED";
 return "TIMESTAMP_OR_MODEL_PROOF_INCOMPLETE";
}

/** True prospective pre-kickoff scientific CONTROL: the existing bookmaker
 * 1X2 price is the baseline; we do not invent missing predictive models.
 * The quoted bookmaker does not provide a reliable suspended flag, so this
 * is intentionally an indicative-price PAPER observation, NOT executable.
 * Full three-way 1X2 of ONE bookmaker + observation is required for de-vig.
 */
export function proposePrematchPaper(input:{
 event:PersistedEvent;quotes:PersistedMarketQuoteRecord[];asOf:string;
}):PaperProposal|null{
 const {event}=input,now=ms(input.asOf),starts=ms(event.event.startsAt);
 const home=event.event.home?.name,away=event.event.away?.name;
 if(!Number.isFinite(now)||!Number.isFinite(starts)||
  event.event.sport!=="football"||event.event.status!=="scheduled"||
  !event.canonicalKey.startsWith("football::epl::")||
  !/^[a-f0-9]{32}$/i.test(event.providerRefs?.["the-odds-api"]??"")||
  starts-now<30*60_000||starts-now>48*3_600_000||
  !home||!away||home.trim().toLowerCase()===away.trim().toLowerCase())return null;
 const candidate=input.quotes.filter(q=>q.eventId===event.id&&q.provider==="the-odds-api"&&
  q.marketKey==="soccer_epl.h2h"&&q.suspended!==true&&
  ageValid(q.capturedAt,now,4*3_600_000)&&
  ageValid(q.providerLastUpdate??"",now,4*3_600_000)&&
  ms(q.providerLastUpdate!)<=ms(q.capturedAt)&&ms(q.capturedAt)<starts&&
  q.decimalOdds>1.01&&q.decimalOdds<=20&&Number.isFinite(q.decimalOdds)&&
  q.bookmaker.trim().length>1);
 const groups=new Map<string,PersistedMarketQuoteRecord[]>();
 for(const quote of candidate){
  const id=quote.bookmaker+"|"+quote.capturedAt;
  const entries=groups.get(id)??[];entries.push(quote);groups.set(id,entries);
 }
 // A declared preference for a reference bookmaker makes provider selection
 // repeatable; other bookmakers are deterministic fallbacks, not best-price
 // mining across the same match.
 const grouped=[...groups.entries()].sort((a,b)=>{
  const x=a[1][0],y=b[1][0];
  const pb=(q:PersistedMarketQuoteRecord)=>q.bookmaker.toLowerCase()==="pinnacle"?0:1;
  return pb(x)-pb(y)||x.bookmaker.localeCompare(y.bookmaker)||
   ms(y.capturedAt)-ms(x.capturedAt);
 });
 const norm=(v:string)=>v.trim().replace(/\s+/g," ").toLowerCase();
 for(const [,quotes] of grouped){
  // Exact sportsbook trio, no mixed quote timestamps/bookmakers.
  const homeQuote=quotes.filter(q=>norm(q.selectionLabel)===norm(home));
  const awayQuote=quotes.filter(q=>norm(q.selectionLabel)===norm(away));
  const drawQuote=quotes.filter(q=>norm(q.selectionLabel)==="draw");
  if(homeQuote.length!==1||awayQuote.length!==1||drawQuote.length!==1)continue;
  const [h,a,d]=[homeQuote[0],awayQuote[0],drawQuote[0]];
  if([h,a,d].some(q=>q.suspended===true))continue;
  const inverse=[1/h.decimalOdds,1/a.decimalOdds,1/d.decimalOdds],sum=inverse.reduce((p,q)=>p+q,0);
  // Incomplete, anomalous or incompatible books should not be interpreted
  // as fair three-way prices. A moderate overround is allowed.
  if(!Number.isFinite(sum)||sum<1||sum>1.4)continue;
  const chosen=h.decimalOdds<=a.decimalOdds?h:a;
  const p=(chosen===h?inverse[0]:inverse[1])/sum;
  if(p<=0||p>=1)continue;
  return{protocol:DAILY_PROTOCOL,eventId:event.id,eventStartsAt:event.event.startsAt,
   dayUTC:paperDay(input.asOf),match:`${home} — ${away}`,competition:event.event.competition,
   contract:chosen===h?"FT_HOME":"FT_AWAY",
   marketKey:chosen.marketKey,selectionKey:chosen.selectionKey,
   odds:chosen.decimalOdds,stake:DAILY_PAPER_STAKE,
   modelProbability:p,modelVersion:"ODDS_PREMATCH_DEVIG_CONTROL_V1",
   quoteProvider:"the-odds-api",bookmaker:chosen.bookmaker,
   quoteAt:chosen.capturedAt,providerUpdatedAt:chosen.providerLastUpdate!,
   stateAt:null,modelAt:null,pickedAt:input.asOf,lane:"PREMATCH_ODDS_CONTROL"};
 }
 return null;
}

export const paperSettlement=(pick:DailyPaperPick,score:{home:number;away:number},
 finalAt:string,settledAt:string):DailyPaperSettlement=>({
 pickId:pick.id,eventId:pick.eventId,
 result:paperOutcome(pick.contract,score)?"WIN":"LOSS",
 score,provider:"api-football",finalAt,settledAt,
});
export function accountFromPaper(picks:DailyPaperPick[],settlements:DailyPaperSettlement[]):DailyPaperAccount{
 const verified=new Map(settlements.filter(x=>x.provider==="api-football"||x.provider==="the-odds-api").map(x=>[x.pickId,x]));
 const tickets=picks.filter(x=>x.protocol===DAILY_PROTOCOL).map(x=>({...x,settlement:verified.get(x.id)??null}));
 const resolved=tickets.filter(x=>x.settlement!==null).sort((a,b)=>
  ms(a.settlement!.settledAt)-ms(b.settlement!.settledAt)||a.id.localeCompare(b.id));
 const contribution=(t:DailyPaperTicket)=>!t.settlement?0:t.settlement.result==="WIN"?t.stake*(t.odds-1):-t.stake;
 const net=resolved.reduce((sum,t)=>sum+contribution(t),0);
 const reserved=tickets.filter(x=>!x.settlement).reduce((sum,t)=>sum+t.stake,0);
 const balance=INITIAL_PAPER_BANK+net;
 const points=[{at:"",balance:INITIAL_PAPER_BANK}];
 let equity=INITIAL_PAPER_BANK,peak=equity,maxDrawdown=0;
 for(const x of resolved){
  equity+=contribution(x);peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,peak-equity);
  points.push({at:x.settlement!.settledAt,balance:equity});
 }
 const dates=[...new Set(tickets.map(x=>x.dayUTC))].sort().reverse();
 const daily=dates.map(day=>{
  const rows=tickets.filter(x=>x.dayUTC===day);
  return{day,count:rows.length,wins:rows.filter(x=>x.settlement?.result==="WIN").length,
   losses:rows.filter(x=>x.settlement?.result==="LOSS").length,
   pnl:rows.reduce((sum,x)=>sum+contribution(x),0)};
 });
 const wins=resolved.filter(x=>x.settlement?.result==="WIN").length;
 const stakeSum=resolved.reduce((s,t)=>s+t.stake,0);
 return{protocol:DAILY_PROTOCOL,mode:"LIVE_FORWARD_PAPER",sharedResearchAccount:true,moneyIsVirtual:true,
  currency:"USD",initialBank:INITIAL_PAPER_BANK,stakePerPick:DAILY_PAPER_STAKE,
  dailyCap:MAX_PAPER_PICKS_PER_DAY,count:tickets.length,settled:resolved.length,
  open:tickets.length-resolved.length,wins,losses:resolved.length-wins,
  net,balance,reserved,available:Math.max(0,balance-reserved),
  roiPct:100*net/INITIAL_PAPER_BANK,yieldPct:stakeSum?100*net/stakeSum:null,
  maxDrawdown,daysActive:dates.length,points:points.slice(-300),daily:daily.slice(0,31),
  tickets:tickets.sort((a,b)=>ms(b.pickedAt)-ms(a.pickedAt)).slice(0,120)};
}
/** Certificates must come from exact-ID provider FT states already persisted. */
export function confirmForwardPaper(pick:DailyPaperPick,event:PersistedEvent|null,
 states:PersistedEventStateRecord[],asOf:string):DailyPaperSettlement|null{
 if(!event||event.id!==pick.eventId||!Number.isFinite(ms(pick.pickedAt)))return null;
 if(pick.lane==="PREMATCH_ODDS_CONTROL"){
  if(pick.quoteProvider!=="the-odds-api"||pick.modelVersion!=="ODDS_PREMATCH_DEVIG_CONTROL_V1"||
     ms(pick.pickedAt)>=ms(pick.eventStartsAt))return null;
  const score=certifyPersistedOddsScore(event,states,asOf);
  if(!score||ms(pick.pickedAt)>=ms(score.capturedAt)||ms(pick.quoteAt)>ms(pick.pickedAt))
   return null;
  return {...paperSettlement(pick,score.score,score.capturedAt,asOf),provider:"the-odds-api"};
 }
 const final=certifyStoredPaperFinal(event,states,asOf);
 if(!final||ms(pick.pickedAt)>=ms(final.capturedAt)||ms(pick.quoteAt)>ms(pick.pickedAt))
  return null;
 return paperSettlement(pick,final.score,final.capturedAt,asOf);
}
export function dailyPaperSelfcheck(){
 const now="2026-10-15T13:04:00Z";
 const event:PersistedEvent={id:"e",canonicalKey:"real",event:{id:"99",sport:"football",
  competition:"L",startsAt:"2026-10-15T12:00:00Z",status:"live",
  home:{id:"a",name:"Alpha"},away:{id:"b",name:"Beta"}}};
 const state:PersistedEventStateRecord={eventId:"e",capturedAt:"2026-10-15T13:03:30Z",
  sourceProvider:"api-football",state:{status:"live",score:{home:1,away:0}}};
 const quote:PersistedMarketQuoteRecord={eventId:"e",provider:"the-odds-api",
  bookmaker:"Test Book",marketKey:"soccer.h2h",selectionKey:"a",selectionLabel:"Alpha",
  decimalOdds:2,capturedAt:"2026-10-15T13:03:40Z",
  providerLastUpdate:"2026-10-15T13:03:38Z",suspended:false};
 const model:PersistedPredictionSnapshotRecord={id:"p",eventId:"e",featureSnapshotId:"f",
  marketKey:"football.1x2",selectionKey:"home",fairProbability:.6,fairOdds:1/.6,
  modelAgreement:0,uncertainty:1,
  modelSignals:[{version:"football.goal-state.v1",mode:"SHADOW"}],
  capturedAt:"2026-10-15T13:03:35Z"};
 const args={event,states:[state],quotes:[quote],predictions:[model],asOf:now};
 const candidate=proposeForwardPaper(args);
 const pick:DailyPaperPick={...candidate!,id:"pk",dailySlot:1};
 const final:PersistedEventStateRecord={eventId:"e",sourceProvider:"api-football",
  capturedAt:"2026-10-15T14:30:00Z",state:{source:"api-football.fixtures.results",
   status:"finished",regulationTimeOnly:true,providerEventId:99,score:{home:2,away:1}}};
 const ft=confirmForwardPaper(pick,{...event,event:{...event.event,status:"finished"}},
  [state,final],"2026-10-15T15:00:00Z");
 const bank=accountFromPaper([pick],[ft!]);
 const tests=[
  {name:"Future-forward quote/model/state yields exact paper contract",pass:candidate?.contract==="FT_HOME"},
  {name:"Canonical shadow model maps to bookmaker h2h",pass:candidate?.modelVersion==="football.goal-state.v1"},
  {name:"Shared virtual bankroll starts at 200",pass:accountFromPaper([],[]).balance===200},
  {name:"Provider FT changes 200 by stake-times-price, NOT real money",pass:bank.balance===204&&bank.reserved===0&&bank.net===4},
  {name:"Before FT, exposure is locked but earnings are absent",pass:accountFromPaper([pick],[]).balance===200&&accountFromPaper([pick],[]).available===196},
  {name:"Unknown suspension rejected",pass:proposeForwardPaper({...args,quotes:[{...quote,suspended:undefined}]})===null},
  {name:"Stale provider quote rejected",pass:proposeForwardPaper({...args,quotes:[{...quote,providerLastUpdate:"2026-10-15T12:00:00Z"}]})===null},
  {name:"No-model control remains available but is correctly marked as price-derived",pass:(()=>{
    const x=proposeForwardPaper({...args,predictions:[]});
    return x?.modelVersion==="QUOTE_IMPLIED_CONTROL_V1"&&x.modelProbability===.5;
   })()},
  {name:"Finished match cannot generate a new paper selection",pass:proposeForwardPaper({...args,event:{...event,event:{...event.event,status:"finished"}}})===null},
  {name:"Unverified generic final cannot auto-settle",pass:confirmForwardPaper(pick,
   {...event,event:{...event.event,status:"finished"}},[state],"2026-10-15T15:00:00Z")===null},
  {name:"No guessed results for unsettled selection",pass:accountFromPaper([pick],[]).settled===0},
  {name:"Pre-match paper selects a complete single-bookmaker three-way market, not best retrospective price",pass:(()=>{
   const e={...event,providerRefs:{"the-odds-api":"a".repeat(32)},canonicalKey:"football::epl::test",
    event:{...event.event,status:"scheduled" as const,startsAt:"2026-10-15T15:00:00Z"}};
   const quotes=[{...quote,provider:"the-odds-api",marketKey:"soccer_epl.h2h",
    capturedAt:"2026-10-15T12:59:00Z",providerLastUpdate:"2026-10-15T12:58:00Z",
    suspended:undefined,selectionKey:"a",selectionLabel:"Alpha",decimalOdds:1.8},
    {...quote,provider:"the-odds-api",marketKey:"soccer_epl.h2h",
    capturedAt:"2026-10-15T12:59:00Z",providerLastUpdate:"2026-10-15T12:58:00Z",
    suspended:undefined,selectionKey:"b",selectionLabel:"Beta",decimalOdds:4.5},
    {...quote,provider:"the-odds-api",marketKey:"soccer_epl.h2h",
    capturedAt:"2026-10-15T12:59:00Z",providerLastUpdate:"2026-10-15T12:58:00Z",
    suspended:undefined,selectionKey:"draw",selectionLabel:"Draw",decimalOdds:3.5}];
   const attempt=proposePrematchPaper({event:e,quotes,asOf:"2026-10-15T13:04:00Z"});
   return attempt?.lane==="PREMATCH_ODDS_CONTROL"&&
     attempt.modelVersion==="ODDS_PREMATCH_DEVIG_CONTROL_V1"&&
     attempt.contract==="FT_HOME"&&attempt.stateAt===null&&
     proposePrematchPaper({event:e,quotes:quotes.slice(0,2),asOf:"2026-10-15T13:04:00Z"})===null;
  })()},
  {name:"Provider 59 FT result is accepted; provider 35 second-half rejected",pass:(()=>{
   const q={...quote,provider:"api-football-live-odds",marketKey:"api-football.live.59",
    selectionKey:"home",selectionLabel:"Home"};
   return proposeForwardPaper({...args,quotes:[q]})?.contract==="FT_HOME"&&
    proposeForwardPaper({...args,quotes:[{...q,marketKey:"api-football.live.35"}]})===null;
  })()},
  {name:"Provider Match Goals 25 is safe 2.5 fulltime total",pass:(()=>{
   const q={...quote,provider:"api-football-live-odds",marketKey:"api-football.live.25",
    selectionKey:"over:2.5",selectionLabel:"Over · 2.5"};
   const expected={...model,marketKey:"football.total_goals",selectionKey:"over-2.5"};
   const next=proposeForwardPaper({...args,quotes:[q],predictions:[expected]});
   return next?.contract==="FT_TOTAL_OVER_2_5"&&next?.modelVersion==="football.goal-state.v1"&&
    paperOutcome(next.contract,{home:2,away:1})===true;
  })()},
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
