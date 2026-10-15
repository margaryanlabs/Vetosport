/** Deterministic, evidence-first retrospective replay. This reconstruction
 * cannot by itself prove pre-registration, execution availability, model edge,
 * prospective performance, or actual sportsbook bets.
 */
import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord,PersistedPredictionSnapshotRecord} from "@/lib/persistence/contracts";
import type {LiveEventSummary,LiveQuotePreview} from "@/lib/live/types";
import {paperContractFromQuote,certifyStoredPaperFinal} from "@/lib/paper/paper-verification";

export const REPLAY_PROTOCOL="veto.paper.replay.first-eligible-v1" as const;
const MAX_AGE_MS=120_000;
const MIN_MODEL_EV=0.05; // fixed experiment-screening threshold, not an edge claim.
const MAX_ODDS=20;
type Contract=NonNullable<ReturnType<typeof paperContractFromQuote>>;
export type ReplayCase={
 eventId:string;match:string;competition:string;contract:Contract;
 modelVersion:string;fairProbability:number;decimalOdds:number;modelExpectedYield:number;
 quoteAt:string;modelAt:string;liveStateAt:string;provider:string;bookmaker:string;
 result:"PROVIDER_WIN"|"PROVIDER_LOSS"|"UNSETTLED";
 finalScore:{home:number;away:number}|null;finalCapturedAt:string|null;
 paperProfitUnits:number|null;
};
export type ReplayReport={
 model:typeof REPLAY_PROTOCOL;source:"PERSISTED_ONLY";generatedAt:string;
 scans:{events:number;liveStates:number;quotes:number;predictions:number;finals:number};
 selectionRules:{maxStateAgeSeconds:120;maxQuoteSourceAgeSeconds:120;maxModelAgeSeconds:120;
   minModelExpectedYield:0.05;unitStake:1;oneCasePerEvent:true};
 counts:{eligible:number;settled:number;unsettled:number;wins:number;losses:number;
   rejected:{noEligiblePair:number;ambiguousMatch:number;providerStatusUnknown:number}};
 metrics:{paperYield:number|null;brier:number|null;priceBaselineBrier:number|null;
  uniqueVerifiedEvents:number};
 coverage:{sampleMayBeCapped:boolean;historicalOnly:true;prospectiveTrackingEnabled:false;
  providerCalls:0;executionVerified:false;validatedEdgeCount:0};
 cases:ReplayCase[];note:string;
};
const ms=(s:string|undefined)=>s?Date.parse(s):NaN;
const validTime=(n:number,at:number)=>Number.isFinite(n)&&n<=at;
const label=(v:PersistedEvent):LiveEventSummary=>({
 id:v.id,source:"persisted",sport:v.event.sport,sportLabel:"FOOTBALL",
 competition:v.event.competition,status:v.event.status,
 homeName:v.event.home?.name??"",awayName:v.event.away?.name??"",
 homeCode:"H",awayCode:"A",homeScore:"—",awayScore:"—",
 clock:"—",period:"—",pulse:"quiet",markets:0,repriced:0,intelligenceReady:false,
});
const isLiveState=(s:PersistedEventStateRecord)=>
 s.sourceProvider==="api-football"&&s.state.status==="live"&&
 s.state.score!==null&&typeof s.state.score==="object"&&
 typeof (s.state.score as {home?:unknown}).home==="number"&&
 typeof (s.state.score as {away?:unknown}).away==="number";
function evidenceQuote(event:PersistedEvent,q:PersistedMarketQuoteRecord,at:number){
 if(q.eventId!==event.id||q.provider==="normalized"||q.suspended!==false||
   !q.bookmaker.trim()||!Number.isFinite(q.decimalOdds)||
   q.decimalOdds<=1||q.decimalOdds>MAX_ODDS)return null;
 const qt=ms(q.capturedAt),source=ms(q.providerLastUpdate);
 const kickoff=ms(event.event.startsAt);
 if(!validTime(qt,at)||!validTime(source,qt)||qt-source>MAX_AGE_MS||
  !Number.isFinite(kickoff)||qt<kickoff-30*60_000||qt>kickoff+110*60_000)return null;
 const liveQuote:LiveQuotePreview={provider:q.provider,bookmaker:q.bookmaker,
  marketKey:q.marketKey,selectionKey:q.selectionKey,selectionLabel:q.selectionLabel,
  decimalOdds:q.decimalOdds,capturedAt:q.capturedAt,suspended:q.suspended};
 const contract=paperContractFromQuote(label(event),liveQuote);
 return contract?{qt,contract}:null;
}
const modelVersion=(row:PersistedPredictionSnapshotRecord)=>{
 const versions=new Set((Array.isArray(row.modelSignals)?row.modelSignals:[])
  .filter((x):x is Record<string,unknown>=>x!==null&&typeof x==="object"&&!Array.isArray(x))
  .map(x=>x.version).filter((v):v is string=>typeof v==="string"&&v.length>0&&v.length<=100));
 return versions.size===1?[...versions][0]:null;
};
const isUnambiguous=(row:PersistedEvent):boolean=>
 !!row.event.home?.name&&!!row.event.away?.name&&
 row.event.home.name.trim().toLowerCase()!==row.event.away.name.trim().toLowerCase();
export function replayPersistedPaper(input:{
 events:PersistedEvent[];states:PersistedEventStateRecord[];
 quotes:PersistedMarketQuoteRecord[];predictions:PersistedPredictionSnapshotRecord[];
 asOf:string;sampleMayBeCapped?:boolean;
}):ReplayReport{
 const now=ms(input.asOf);
 const events=[...new Map(input.events.filter(e=>
  e.event.sport==="football"&&e.canonicalKey!=="veto-sport-storage-selfcheck"&&
  e.event.competition!=="VETO Storage Selfcheck").map(e=>[e.id,e])).values()]
  .sort((a,b)=>ms(a.event.startsAt)-ms(b.event.startsAt)||a.id.localeCompare(b.id));
 const rows:ReplayCase[]=[];
 let certifiedFinals=0,noEligiblePair=0,ambiguousMatch=0,providerStatusUnknown=0;
 for(const event of events){
  if(!isUnambiguous(event)){ambiguousMatch++;continue;}
  const states=input.states.filter(x=>x.eventId===event.id);
  const final=certifyStoredPaperFinal(event,states,input.asOf);
  if(final)certifiedFinals++;
  const live=states.filter(isLiveState).sort((a,b)=>ms(a.capturedAt)-ms(b.capturedAt));
  const quotes=input.quotes.filter(x=>x.eventId===event.id).sort((a,b)=>ms(a.capturedAt)-ms(b.capturedAt)||
   a.marketKey.localeCompare(b.marketKey)||a.selectionKey.localeCompare(b.selectionKey)||a.provider.localeCompare(b.provider));
  const models=input.predictions.filter(x=>x.eventId===event.id);
  let chosen:ReplayCase|null=null;
  for(const quote of quotes){
   const info=evidenceQuote(event,quote,now);
   if(!info){providerStatusUnknown++;continue;}
   const source=live.filter(s=>{
     const t=ms(s.capturedAt);
     return validTime(t,info.qt)&&info.qt-t<=MAX_AGE_MS;
   }).at(-1);
   if(!source)continue;
   // Match both canonical market AND selection, never model's unrelated pick.
   const preds=models.filter(p=>p.marketKey===quote.marketKey&&p.selectionKey===quote.selectionKey&&
    Number.isFinite(p.fairProbability)&&p.fairProbability>0&&p.fairProbability<1&&
    validTime(ms(p.capturedAt),info.qt)&&info.qt-ms(p.capturedAt)<=MAX_AGE_MS&&
    modelVersion(p)!==null).sort((a,b)=>ms(b.capturedAt)-ms(a.capturedAt)||a.id.localeCompare(b.id));
   const prediction=preds[0],version=prediction&&modelVersion(prediction);
   if(!prediction||!version)continue;
   const modelEV=prediction.fairProbability*quote.decimalOdds-1;
   if(modelEV<MIN_MODEL_EV)continue;
   // Never retrospectively choose the best P&L; first eligible co-capture wins.
   const winner=final?(()=>{
    const {home,away}=final.score;
    switch(info.contract){
     case "FT_HOME":return home>away;
     case "FT_DRAW":return home===away;
     case "FT_AWAY":return away>home;
     case "FT_BTTS_YES":return home>0&&away>0;
     case "FT_BTTS_NO":return home===0||away===0;
    }
   })():null;
   const status=winner===null?"UNSETTLED":winner?"PROVIDER_WIN":"PROVIDER_LOSS";
   chosen={eventId:event.id,match:`${event.event.home?.name} — ${event.event.away?.name}`,
    competition:event.event.competition,contract:info.contract,
    modelVersion:version,fairProbability:prediction.fairProbability,
    decimalOdds:quote.decimalOdds,modelExpectedYield:modelEV,
    quoteAt:quote.capturedAt,modelAt:prediction.capturedAt,liveStateAt:source.capturedAt,
    provider:quote.provider,bookmaker:quote.bookmaker,
    result:status,finalScore:final?.score??null,finalCapturedAt:final?.capturedAt??null,
    paperProfitUnits:winner===null?null:winner?quote.decimalOdds-1:-1};
   break;
  }
  if(chosen)rows.push(chosen);else noEligiblePair++;
 }
 const settled=rows.filter(r=>r.result!=="UNSETTLED");
 const wins=settled.filter(r=>r.result==="PROVIDER_WIN").length;
 const mean=(vals:number[])=>vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
 return {
  model:REPLAY_PROTOCOL,source:"PERSISTED_ONLY",generatedAt:input.asOf,
  scans:{events:events.length,liveStates:input.states.length,quotes:input.quotes.length,
   predictions:input.predictions.length,finals:certifiedFinals},
  selectionRules:{maxStateAgeSeconds:120,maxQuoteSourceAgeSeconds:120,maxModelAgeSeconds:120,
   minModelExpectedYield:MIN_MODEL_EV,unitStake:1,oneCasePerEvent:true},
  counts:{eligible:rows.length,settled:settled.length,unsettled:rows.length-settled.length,wins,
   losses:settled.length-wins,rejected:{noEligiblePair,ambiguousMatch,providerStatusUnknown}},
  metrics:{paperYield:mean(settled.map(x=>x.paperProfitUnits??0)),
   brier:mean(settled.map(x=>(x.fairProbability-(x.result==="PROVIDER_WIN"?1:0))**2)),
   priceBaselineBrier:mean(settled.map(x=>(1/x.decimalOdds-(x.result==="PROVIDER_WIN"?1:0))**2)),
   uniqueVerifiedEvents:settled.length},
  coverage:{sampleMayBeCapped:!!input.sampleMayBeCapped,historicalOnly:true,
   prospectiveTrackingEnabled:false,providerCalls:0,executionVerified:false,validatedEdgeCount:0},
  cases:rows.slice(-100).reverse(),
  note:"Read-only reconstruction using existing real observations. Candidate rule is fixed in code but applied retrospectively. Missing price/source status is rejected; no backfilled guesses or claim of prospective profitable edge.",
 };
}
export function autonomousReplaySelfcheck(){
 const at="2026-10-15T16:00:00Z";
 const event:PersistedEvent={id:"one",canonicalKey:"real",event:{id:"200",sport:"football",competition:"League",
  startsAt:"2026-10-15T12:00:00Z",status:"finished",home:{id:"a",name:"Alpha"},away:{id:"b",name:"Beta"}}};
 const live:PersistedEventStateRecord={eventId:"one",sourceProvider:"api-football",
  capturedAt:"2026-10-15T12:32:10Z",state:{status:"live",score:{home:0,away:0}}};
 const ft:PersistedEventStateRecord={eventId:"one",sourceProvider:"api-football",
  capturedAt:"2026-10-15T14:55:00Z",state:{status:"finished",score:{home:2,away:1},
   source:"api-football.fixtures.results",regulationTimeOnly:true,providerEventId:200}};
 const quote:PersistedMarketQuoteRecord={eventId:"one",provider:"the-odds-api",
  bookmaker:"Book",marketKey:"soccer.h2h",selectionKey:"alpha",selectionLabel:"Alpha",
  capturedAt:"2026-10-15T12:32:50Z",providerLastUpdate:"2026-10-15T12:32:40Z",
  decimalOdds:2,suspended:false};
 const prediction:PersistedPredictionSnapshotRecord={id:"p",eventId:"one",featureSnapshotId:"fs",
  marketKey:"soccer.h2h",selectionKey:"alpha",fairProbability:.62,fairOdds:1/.62,
  modelAgreement:.8,uncertainty:.1,modelSignals:[{version:"pre-v1"}],capturedAt:"2026-10-15T12:32:30Z"};
 const base={events:[event],states:[live,ft],quotes:[quote],predictions:[prediction],asOf:at};
 const go=(changes:Partial<typeof base>={})=>replayPersistedPaper({...base,...changes});
 const yes=go();const noFinal=go({states:[live]});
 const future=go({quotes:[{...quote,capturedAt:"2026-10-15T15:10:00Z",providerLastUpdate:"2026-10-15T15:10:00Z"}]});
 const tests=[
  {name:"Real matching timestamps produce only paper research, not execution",pass:yes.counts.settled===1&&yes.counts.wins===1&&yes.coverage.validatedEdgeCount===0&&!yes.coverage.executionVerified},
  {name:"Without provider FT candidate remains open",pass:noFinal.counts.unsettled===1&&noFinal.metrics.paperYield===null},
  {name:"Late quote cannot create a historical observation",pass:future.counts.eligible===0},
  {name:"Unknown suspension fails closed",pass:go({quotes:[{...quote,suspended:undefined}]}).counts.eligible===0},
  {name:"Stale provider timestamp fails closed",pass:go({quotes:[{...quote,providerLastUpdate:"2026-10-15T12:00:00Z"}]}).counts.eligible===0},
  {name:"Missing matching prediction produces zero entries",pass:go({predictions:[]}).counts.eligible===0},
  {name:"Future prediction cannot be used",pass:go({predictions:[{...prediction,capturedAt:"2026-10-15T12:35:00Z"}]}).counts.eligible===0},
  {name:"No provider-certified score means no fictional profit",pass:noFinal.cases[0].paperProfitUnits===null},
  {name:"Duplicate polling does not multiply fixtures",pass:go({quotes:[quote,quote],states:[live,live,ft]}).counts.eligible===1},
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
