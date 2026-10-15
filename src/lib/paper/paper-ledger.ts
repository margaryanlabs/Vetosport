/** A deliberately local, MANUALLY settled, virtual paper journal.
 * It never infers football outcomes or sportsbook execution from snapshots.
 */
export type PaperStatus="UNSETTLED"|"MANUAL_WIN"|"MANUAL_LOSS"|"MANUAL_VOID"|
 "PROVIDER_WIN"|"PROVIDER_LOSS"|"PROVIDER_VOID";
export type PaperSource="SOURCE_SNAPSHOT"|"HYPOTHETICAL_MANUAL";
export interface PaperEntry {
 id:string;eventId:string;match:string;scenario:string;odds:number;stake:number;
 recordedAt:string;source:PaperSource;quoteCapturedAt?:string;
 /** User-entered research context. Never claimed to be verified by VETO. */
 hypothesis?:string;estimatedProbability?:number;
 /** Locked at recording time. Old records never gain guessed market semantics. */
 marketContract?:"FT_HOME"|"FT_DRAW"|"FT_AWAY"|"FT_BTTS_YES"|"FT_BTTS_NO";
 selectionMarketKey?:string;selectionKey?:string;
 verifiedProvider?:"api-football";verifiedAt?:string;
 verifiedScore?:{home:number;away:number};
 status:PaperStatus;settledAt?:string;
}
export const PAPER_STORAGE_KEY="veto-sport-paper-research-v1";
export const PAPER_BANK_KEY="veto-sport-paper-bank-v1";
export const MAX_ENTRIES=150;
export const PAPER_RISK_FRACTION=.02;
export function parsePaperEntries(value:unknown):PaperEntry[]{
 if(!Array.isArray(value))return[];
 return value.filter((raw):raw is PaperEntry=>{
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return false;
  const r=raw as Partial<PaperEntry>;
  return typeof r.id==="string"&&r.id.length<160&&typeof r.eventId==="string"&&r.eventId.length<160&&
   typeof r.match==="string"&&r.match.length<300&&typeof r.scenario==="string"&&r.scenario.length<500&&
   typeof r.odds==="number"&&Number.isFinite(r.odds)&&r.odds>1&&r.odds<=1000&&
   typeof r.stake==="number"&&Number.isFinite(r.stake)&&r.stake>0&&r.stake<=100_000&&
   typeof r.recordedAt==="string"&&Number.isFinite(Date.parse(r.recordedAt))&&
   (r.source==="SOURCE_SNAPSHOT"||r.source==="HYPOTHETICAL_MANUAL")&&
   (r.hypothesis===undefined||(typeof r.hypothesis==="string"&&r.hypothesis.length<=300))&&
   (r.estimatedProbability===undefined||(typeof r.estimatedProbability==="number"&&Number.isFinite(r.estimatedProbability)&&r.estimatedProbability>0&&r.estimatedProbability<1))&&
   (r.marketContract===undefined||["FT_HOME","FT_DRAW","FT_AWAY","FT_BTTS_YES","FT_BTTS_NO"].includes(r.marketContract))&&
   (r.selectionMarketKey===undefined||(typeof r.selectionMarketKey==="string"&&r.selectionMarketKey.length<=150))&&
   (r.selectionKey===undefined||(typeof r.selectionKey==="string"&&r.selectionKey.length<=150))&&
   (r.verifiedProvider===undefined||r.verifiedProvider==="api-football")&&
   (r.verifiedAt===undefined||(typeof r.verifiedAt==="string"&&Number.isFinite(Date.parse(r.verifiedAt))))&&
   (r.verifiedScore===undefined||(typeof r.verifiedScore.home==="number"&&typeof r.verifiedScore.away==="number"&&
      Number.isInteger(r.verifiedScore.home)&&Number.isInteger(r.verifiedScore.away)&&
      r.verifiedScore.home>=0&&r.verifiedScore.away>=0&&r.verifiedScore.home<=40&&r.verifiedScore.away<=40))&&
   (r.status==="UNSETTLED"||r.status==="MANUAL_WIN"||r.status==="MANUAL_LOSS"||
     r.status==="MANUAL_VOID"||r.status==="PROVIDER_WIN"||r.status==="PROVIDER_LOSS"||r.status==="PROVIDER_VOID")&&
   (!r.status?.startsWith("PROVIDER_")||(r.verifiedProvider==="api-football"&&r.verifiedAt!==undefined&&r.verifiedScore!==undefined))&&
   (r.status==="UNSETTLED"||typeof r.settledAt==="string"&&Number.isFinite(Date.parse(r.settledAt)));
 }).slice(-MAX_ENTRIES);
}
export function paperProfit(entry:PaperEntry):number|null{
 switch(entry.status){
  case "MANUAL_WIN":
  case "PROVIDER_WIN":return entry.stake*(entry.odds-1);
  case "MANUAL_LOSS":
  case "PROVIDER_LOSS":return -entry.stake;
  case "MANUAL_VOID":
  case "PROVIDER_VOID":return 0;
  case "UNSETTLED":return null;
 }
}
/** Subjective expectation ONLY: p is entered by the user, not inferred by the product. */
export function paperExpectedValue(stake:number,odds:number,p:number):number|null{
 if(!Number.isFinite(stake)||stake<=0||!Number.isFinite(odds)||odds<=1||
    !Number.isFinite(p)||p<=0||p>=1)return null;
 return stake*(p*odds-1);
}
export function paperJournalStats(entries:PaperEntry[],initialBankroll:number){
 const bankroll=Number.isFinite(initialBankroll)&&initialBankroll>=100&&initialBankroll<=100_000?initialBankroll:1000;
 const settled=entries.filter(x=>x.status!=="UNSETTLED").sort((a,b)=>Date.parse(a.settledAt||a.recordedAt)-Date.parse(b.settledAt||b.recordedAt));
 const open=entries.filter(x=>x.status==="UNSETTLED");
 const stakeSum=settled.reduce((sum,x)=>sum+x.stake,0);
 const net=settled.reduce((sum,x)=>sum+(paperProfit(x)??0),0);
 let cumulative=0,peak=bankroll,maxDrawdown=0;
 const equityPoints=[{at:"",equity:bankroll}];
 for(const entry of settled){
  cumulative+=paperProfit(entry)??0;
  const equity=bankroll+cumulative;
  peak=Math.max(peak,equity);
  maxDrawdown=Math.max(maxDrawdown,peak-equity);
  equityPoints.push({at:entry.settledAt||entry.recordedAt,equity});
 }
 const exposure=open.reduce((sum,e)=>sum+e.stake,0);
 const available=Math.max(0,bankroll+net-exposure);
 const maxNewStake=Math.max(0,Math.min(bankroll*PAPER_RISK_FRACTION,available));
 return {
  bankroll,
  settled: settled.length,
  unsettled:open.length,
  wins:settled.filter(x=>x.status==="MANUAL_WIN"||x.status==="PROVIDER_WIN").length,
  losses:settled.filter(x=>x.status==="MANUAL_LOSS"||x.status==="PROVIDER_LOSS").length,
  voids:settled.filter(x=>x.status==="MANUAL_VOID"||x.status==="PROVIDER_VOID").length,
  providerSettled:settled.filter(x=>x.status.startsWith("PROVIDER_")).length,
  manualSettled:settled.filter(x=>x.status.startsWith("MANUAL_")).length,
  net,roi:stakeSum>0?net/stakeSum*100:0,
  bankrollReturnPct:bankroll>0?net/bankroll*100:0,
  hitRate: settled.some(x=>x.status.endsWith("_WIN")||x.status.endsWith("_LOSS"))
   ?settled.filter(x=>x.status.endsWith("_WIN")).length/
    settled.filter(x=>x.status.endsWith("_WIN")||x.status.endsWith("_LOSS")).length*100:0,
  maxDrawdown,stakeSum,
  exposure,available,maxNewStake,
  equity:bankroll+net,
  equityPoints:equityPoints.slice(-80),
  manualOnly:settled.every(x=>x.status.startsWith("MANUAL_")),
 };
}
// CSV formulas can execute when a sheet opens. Prefix dangerous cells.
export function paperCsv(entries:PaperEntry[]):string{
 const cols=["id","eventId","match","scenario","odds","stake","recordedAt","source","quoteCapturedAt","status","settledAt","manualProfit","verification","hypothesis","userEstimatedProbability",
  "marketContract","selectionMarketKey","selectionKey","verifiedProvider","verifiedAt","verifiedScore"];
 const safe=(v:unknown)=>{
  const raw=String(v??"");
  const inert=/^[\s\uFEFF\u200B]*[=+\-@]/.test(raw)?"'"+raw:raw;
  return '"'+inert.replace(/"/g,'""')+'"';
 };
 const rows=entries.map(e=>[e.id,e.eventId,e.match,e.scenario,e.odds,e.stake,e.recordedAt,e.source,
   e.quoteCapturedAt||"",e.status,e.settledAt||"",paperProfit(e)??"",e.status.startsWith("PROVIDER_")?"PROVIDER_FT_SCORE_VERIFIED_PRICE_NOT_EXECUTED":"MANUAL_UNVERIFIED",
   e.hypothesis||"",e.estimatedProbability??"",e.marketContract??"",e.selectionMarketKey??"",
   e.selectionKey??"",e.verifiedProvider??"",e.verifiedAt??"",
   e.verifiedScore?`${e.verifiedScore.home}:${e.verifiedScore.away}`:""].map(safe).join(","));
 return [cols.map(safe).join(","),...rows].join("\r\n")+"\r\n";
}
export function paperJournalSelfcheck(){
 const base:PaperEntry={id:"a",eventId:"fixture-a",match:"A — B",scenario:"Manual hypothesis",odds:1.5,stake:10,
  recordedAt:"2026-10-12T10:00:00Z",source:"HYPOTHETICAL_MANUAL",status:"UNSETTLED"};
 const win:PaperEntry={...base,id:"b",status:"MANUAL_WIN",settledAt:"2026-10-12T11:00:00Z"};
 const loss:PaperEntry={...base,id:"c",status:"MANUAL_LOSS",settledAt:"2026-10-12T12:00:00Z"};
 const voided:PaperEntry={...base,id:"d",status:"MANUAL_VOID",settledAt:"2026-10-12T13:00:00Z"};
 const stats=paperJournalStats([base,win,loss,voided],1000);
 const tests=[
  {name:"Pending ticket never counted as P&L",pass:paperProfit(base)===null&&stats.settled===3&&stats.unsettled===1},
  {name:"Manual win uses net decimal profit",pass:paperProfit(win)===5},
  {name:"Manual loss loses stake",pass:paperProfit(loss)===-10},
  {name:"Void returns stake",pass:paperProfit(voided)===0},
  {name:"Provider-verified calculation remains paper-only",pass:paperProfit({...win,status:"PROVIDER_WIN"})===5},
  {name:"Provider status without evidence rejected at parse",pass:parsePaperEntries([{...win,status:"PROVIDER_WIN"}]).length===0},
  {name:"Unverified manually-entered outcomes labeled",pass:stats.manualOnly===true},
  {name:"Subjective EV calculated without claiming model prediction",pass:Math.abs((paperExpectedValue(10,2,0.6)??0)-2)<1e-9&&paperExpectedValue(10,2,2)===null},
  {name:"Hypothesis and subjective probability retained",pass:parsePaperEntries([{...base,hypothesis:"Late goal",estimatedProbability:0.55}]).length===1},
  {name:"Out-of-range probability rejected",pass:parsePaperEntries([{...base,estimatedProbability:1.25}]).length===0},
  {name:"Bankroll ROI separated from yield",pass:stats.bankrollReturnPct===-0.5&&stats.hitRate===50},
  {name:"Net and ROI use settled stake only",pass:stats.net===-5&&Math.abs(stats.roi+16.6666667)<.001},
  {name:"Drawdown detects loss after win",pass:stats.maxDrawdown===10},
  {name:"Open exposure and 2% cap",pass:stats.exposure===10&&stats.maxNewStake===20},
  {name:"Invalid records discarded, older records kept",pass:parsePaperEntries([{},base,win]).length===2},
  {name:"Formula injection disabled in export",pass:paperCsv([{...base,match:"=SUM(A1:A2)"}]).includes("'=SUM(A1:A2)")},
  {name:"No entries means no made-up results",pass:paperJournalStats([],1000).roi===0&&paperJournalStats([],1000).settled===0},
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
