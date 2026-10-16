/** Deterministic paper-only settlement limited to unambiguous
 * full-time 1X2, BTTS and integer-safe half-goal TOTAL markets. No sportsbook execution or model edge claim.
 */
import type {LiveEventSummary,LiveQuotePreview} from "@/lib/live/types";
import type {PersistedEvent,PersistedEventStateRecord} from "@/lib/persistence/contracts";
import type {PaperEntry,PaperStatus} from "@/lib/paper/paper-ledger";

type HalfGoal="1_5"|"2_5"|"3_5"|"4_5";
export type PaperContract="FT_HOME"|"FT_DRAW"|"FT_AWAY"|"FT_BTTS_YES"|"FT_BTTS_NO"|
 `FT_TOTAL_OVER_${HalfGoal}`|`FT_TOTAL_UNDER_${HalfGoal}`;
export interface CertifiedPaperFinal {
 eventId:string;
 score:{home:number;away:number};
 capturedAt:string;
 source:"api-football.fixtures.results";
 provider:"api-football";
 regulationTimeOnly:true;
}
const norm=(s:string)=>s.trim().replace(/\s+/g," ").toLocaleLowerCase("en");
export function paperContractFromQuote(event:LiveEventSummary,quote:LiveQuotePreview):PaperContract|null{
 if(event.source!=="persisted"||event.sport!=="football"||quote.suspended)return null;
 const market=quote.marketKey.toLowerCase();
 const outcome=norm(quote.selectionLabel);
 // Persisted raw provider marketName for ID 59 is "Fulltime Result";
 // ID 35 is "To Win 2nd Half" and must NEVER be mapped to FT 1X2.
 if(quote.provider==="api-football-live-odds"&&market==="api-football.live.59"){
  const choices:{[key:string]:PaperContract}={home:"FT_HOME",away:"FT_AWAY",draw:"FT_DRAW"};
  if((outcome==="home"||outcome==="away"||outcome==="draw")&&
     norm(quote.selectionKey)===outcome)return choices[outcome];
  return null;
 }
 // Persisted market ID 25 = "Match Goals" (full-time, half-goal lines).
 // 36 "Over/Under Line" and 35 "To Win 2nd Half" are purposefully excluded.
 if(quote.provider==="api-football-live-odds"&&market==="api-football.live.25"){
  const selection=norm(quote.selectionKey).match(/^(over|under):([1-4])\.5$/);
  if(!selection||outcome!==`${selection[1]} · ${selection[2]}.5`)return null;
  return `FT_TOTAL_${selection[1].toUpperCase()}_${selection[2]}_5` as PaperContract;
 }
 if(market==="h2h"||market.endsWith(".h2h")||market==="football.1x2"){
  if(outcome===norm(event.homeName)&&norm(event.homeName)!==norm(event.awayName))return "FT_HOME";
  if(outcome===norm(event.awayName)&&norm(event.homeName)!==norm(event.awayName))return "FT_AWAY";
  if(outcome==="draw"||outcome==="ничья")return "FT_DRAW";
 }
 if(market==="football.btts"||market==="btts"||market.endsWith(".btts")){
  if(outcome==="yes"||outcome==="да")return "FT_BTTS_YES";
  if(outcome==="no"||outcome==="нет")return "FT_BTTS_NO";
 }
 return null;
}
export function paperContractWins(contract:PaperContract,score:{home:number;away:number}):boolean|null{
 const {home,away}=score;
 switch(contract){
  case "FT_HOME":return home>away;
  case "FT_DRAW":return home===away;
  case "FT_AWAY":return away>home;
  case "FT_BTTS_YES":return home>0&&away>0;
  case "FT_BTTS_NO":return home===0||away===0;
 }
 const total=contract.match(/^FT_TOTAL_(OVER|UNDER)_([1-4])_5$/);
 if(!total)return null;
 const line=Number(total[2])+.5,goals=home+away;
 return total[1]==="OVER"?goals>line:goals<line;
}
const scoreOk=(score:unknown):score is {home:number;away:number}=>{
 if(!score||typeof score!=="object"||Array.isArray(score))return false;
 const r=score as {home?:unknown;away?:unknown};
 return typeof r.home==="number"&&Number.isInteger(r.home)&&r.home>=0&&r.home<=40&&
  typeof r.away==="number"&&Number.isInteger(r.away)&&r.away>=0&&r.away<=40;
};
/** Restrict to VETO's own exact-ID FT records. A generic finished status, a
 * public community-match fuzzy link, or a live score never certifies results.
 */
export function certifyStoredPaperFinal(event:PersistedEvent|null,states:PersistedEventStateRecord[],asOf:string):CertifiedPaperFinal|null{
 if(!event||event.event.sport!=="football"||event.event.status!=="finished"||
   event.canonicalKey==="veto-sport-storage-selfcheck"||event.event.competition==="VETO Storage Selfcheck")return null;
 const kickoff=Date.parse(event.event.startsAt),now=Date.parse(asOf);
 if(!Number.isFinite(kickoff)||!Number.isFinite(now)||kickoff>now-60*60_000)return null;
 const finals=states.filter(row=>{
  const s=row.state;
  const providerId=typeof s.providerEventId==="number"?s.providerEventId:
   typeof s.providerEventId==="string"&&/^\d+$/.test(s.providerEventId)?Number(s.providerEventId):NaN;
  const captured=Date.parse(row.capturedAt);
  return row.eventId===event.id&&row.sourceProvider==="api-football"&&
   s.source==="api-football.fixtures.results"&&s.status==="finished"&&
   s.regulationTimeOnly===true&&Number.isSafeInteger(providerId)&&providerId>0&&
   Number.isFinite(captured)&&captured>=kickoff+60*60_000&&captured<=now&&scoreOk(s.score);
 });
 if(!finals.length)return null;
 const ids=new Set(finals.map(x=>String(x.state.providerEventId)));
 const scores=new Set(finals.map(x=>JSON.stringify(x.state.score)));
 if(ids.size!==1||scores.size!==1)return null;
 const latest=[...finals].sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt))[0];
 return {eventId:event.id,score:latest.state.score as {home:number;away:number},
  capturedAt:latest.capturedAt,provider:"api-football",
  source:"api-football.fixtures.results",regulationTimeOnly:true};
}
/** A certified result is not enough: the paper entry must have a locked
 * selection contract and a recorded timestamp earlier than the FT certificate.
 */
export function reconcilePaperEntry(entry:PaperEntry,final:CertifiedPaperFinal):PaperEntry|null{
 if(entry.status!=="UNSETTLED"||entry.eventId!==final.eventId||
  entry.source!=="SOURCE_SNAPSHOT"||!entry.marketContract||
  !entry.quoteCapturedAt||!Number.isFinite(Date.parse(entry.recordedAt))||
  !Number.isFinite(Date.parse(entry.quoteCapturedAt))||
  Date.parse(entry.quoteCapturedAt)>Date.parse(entry.recordedAt)||
  Date.parse(entry.recordedAt)>=Date.parse(final.capturedAt)||
  Date.parse(entry.quoteCapturedAt)>=Date.parse(final.capturedAt)||
  !scoreOk(final.score)||final.source!=="api-football.fixtures.results"||
  final.provider!=="api-football"||final.regulationTimeOnly!==true)return null;
 const win=paperContractWins(entry.marketContract,final.score);
 if(win===null)return null;
 const status:PaperStatus=win?"PROVIDER_WIN":"PROVIDER_LOSS";
 return {...entry,status,settledAt:final.capturedAt,
  verifiedAt:new Date().toISOString(),verifiedProvider:"api-football",
  verifiedScore:{home,away}};
}
export function paperFinalVerificationSelfcheck(){
 const event:PersistedEvent={id:"e1",canonicalKey:"real",event:{
  id:"123",sport:"football",competition:"Test League",startsAt:"2026-10-15T13:00:00Z",status:"finished",
  home:{id:"a",name:"Alpha"},away:{id:"b",name:"Beta"}}};
 const s:PersistedEventStateRecord={eventId:"e1",sourceProvider:"api-football",
  capturedAt:"2026-10-15T16:00:00Z",state:{
   providerEventId:123,status:"finished",score:{home:2,away:1},
   source:"api-football.fixtures.results",regulationTimeOnly:true}};
 const time="2026-10-15T17:00:00Z";
 const cert=certifyStoredPaperFinal(event,[s],time);
 const row:PaperEntry={id:"ticket",eventId:"e1",match:"Alpha — Beta",scenario:"Alpha wins",
  source:"SOURCE_SNAPSHOT",quoteCapturedAt:"2026-10-15T13:30:00Z",
  recordedAt:"2026-10-15T13:35:00Z",odds:2,stake:10,
  status:"UNSETTLED",marketContract:"FT_HOME"};
 const quoted:LiveQuotePreview={provider:"the-odds-api",bookmaker:"Book",marketKey:"soccer_epl.h2h",
  selectionKey:"abc",selectionLabel:"Alpha",decimalOdds:2,capturedAt:row.quoteCapturedAt!};
 const live:LiveEventSummary={id:"e1",source:"persisted",sport:"football",sportLabel:"FOOTBALL",
  competition:"Test",status:"live",clock:"45",period:"2H",homeCode:"ALP",awayCode:"BET",
  homeName:"Alpha",awayName:"Beta",homeScore:"1",awayScore:"0",pulse:"stable",
  markets:1,repriced:0,intelligenceReady:false};
 const tests=[
  {name:"Exact provider FT certified",pass:cert?.score.home===2},
  {name:"Reject only generic finished status",pass:certifyStoredPaperFinal(event,[],time)===null},
  {name:"Reject unconfirmed in-play score",pass:certifyStoredPaperFinal(event,[{...s,state:{...s.state,status:"live"}}],time)===null},
  {name:"Reject conflicting provider finals",pass:certifyStoredPaperFinal(event,[s,{...s,state:{...s.state,score:{home:3,away:1}}}],time)===null},
  {name:"Provider FT can resolve locked 1X2",pass:cert!==null&&reconcilePaperEntry(row,cert)?.status==="PROVIDER_WIN"},
  {name:"Recorded after FT is rejected",pass:cert!==null&&reconcilePaperEntry({...row,recordedAt:"2026-10-15T16:10:00Z"},cert)===null},
  {name:"Missing market contract does not auto settle",pass:cert!==null&&reconcilePaperEntry({...row,marketContract:undefined},cert)===null},
  {name:"Manual hypothesis does not auto settle",pass:cert!==null&&reconcilePaperEntry({...row,source:"HYPOTHETICAL_MANUAL"},cert)===null},
  {name:"Contract uses exact team orientation",pass:paperContractFromQuote(live,quoted)==="FT_HOME"&&
   paperContractFromQuote(live,{...quoted,selectionLabel:"Gamma"})===null},
  {name:"Unmapped ambiguous market rejected",pass:paperContractFromQuote(live,{...quoted,marketKey:"live.any"})===null},
  {name:"Real provider market 59 uniquely means full-time result",pass:
    paperContractFromQuote(live,{...quoted,provider:"api-football-live-odds",
     marketKey:"api-football.live.59",selectionKey:"home",selectionLabel:"Home"})==="FT_HOME"},
  {name:"Second-half result market ID 35 must not settle as FT",pass:
    paperContractFromQuote(live,{...quoted,provider:"api-football-live-odds",
     marketKey:"api-football.live.35",selectionKey:"home",selectionLabel:"Home"})===null},
  {name:"Real market 25 half-goal totals settle by certified fulltime score",pass:(()=>{
    const total=paperContractFromQuote(live,{...quoted,provider:"api-football-live-odds",
      marketKey:"api-football.live.25",selectionKey:"over:2.5",selectionLabel:"Over · 2.5"});
    return total==="FT_TOTAL_OVER_2_5"&&paperContractWins(total,{home:2,away:1})===true&&
      paperContractWins(total,{home:1,away:1})===false;
   })()},
  {name:"Non-half-goal or unrelated totals market rejected",pass:
    paperContractFromQuote(live,{...quoted,provider:"api-football-live-odds",
      marketKey:"api-football.live.36",selectionKey:"over:2.5",selectionLabel:"Over · 2.5"})===null&&
    paperContractFromQuote(live,{...quoted,provider:"api-football-live-odds",
      marketKey:"api-football.live.25",selectionKey:"under:2",selectionLabel:"Under · 2"})===null},
  {name:"Declined sportsbook odds not eligible",pass:paperContractFromQuote(live,{...quoted,suspended:true})===null},
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
