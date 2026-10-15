/** Forward-only, persistent, shared VETO Sport paper laboratory.
 * ALL amounts are virtual research USD. Never calls a bookmaker, places bets,
 * or presents an uncalibrated single shadow model as a validated advantage.
 */
import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord,PersistedPredictionSnapshotRecord} from "@/lib/persistence/contracts";
import type {LiveEventSummary,LiveQuotePreview} from "@/lib/live/types";
import {paperContractFromQuote,certifyStoredPaperFinal,type PaperContract} from "@/lib/paper/paper-verification";
export const DAILY_PROTOCOL="veto.paper.forward-observed.v1" as const;
export const INITIAL_PAPER_BANK=200;
export const DAILY_PAPER_STAKE=4;
export const MAX_PAPER_PICKS_PER_DAY=3;
export type DailyPaperPick={
 id:string;protocol:string;eventId:string;eventStartsAt:string;dayUTC:string;dailySlot:number;
 match:string;competition:string;contract:PaperContract;marketKey:string;selectionKey:string;
 odds:number;stake:number;modelProbability:number;modelVersion:string;
 quoteProvider:string;bookmaker:string;quoteAt:string;providerUpdatedAt:string;
 stateAt:string;modelAt:string;pickedAt:string;
};
export type DailyPaperSettlement={pickId:string;eventId:string;result:"WIN"|"LOSS";
 score:{home:number;away:number};provider:"api-football";finalAt:string;settledAt:string};
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
export const paperOutcome=(contract:PaperContract,score:{home:number;away:number}):boolean=>{
 const {home,away}=score;
 switch(contract){
  case "FT_HOME":return home>away;
  case "FT_AWAY":return away>home;
  case "FT_DRAW":return home===away;
  case "FT_BTTS_YES":return home>0&&away>0;
  case "FT_BTTS_NO":return home===0||away===0;
 }
};
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
const target=(market:PaperContract)=>{
 switch(market){
  case "FT_HOME":return {marketKey:"football.1x2",selectionKey:"home"};
  case "FT_AWAY":return {marketKey:"football.1x2",selectionKey:"away"};
  case "FT_DRAW":return {marketKey:"football.1x2",selectionKey:"draw"};
  case "FT_BTTS_YES":return {marketKey:"football.btts",selectionKey:"yes"};
  case "FT_BTTS_NO":return {marketKey:"football.btts",selectionKey:"no"};
 }
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
export const paperSettlement=(pick:DailyPaperPick,score:{home:number;away:number},
 finalAt:string,settledAt:string):DailyPaperSettlement=>({
 pickId:pick.id,eventId:pick.eventId,
 result:paperOutcome(pick.contract,score)?"WIN":"LOSS",
 score,provider:"api-football",finalAt,settledAt,
});
export function accountFromPaper(picks:DailyPaperPick[],settlements:DailyPaperSettlement[]):DailyPaperAccount{
 const verified=new Map(settlements.filter(x=>x.provider==="api-football").map(x=>[x.pickId,x]));
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
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
