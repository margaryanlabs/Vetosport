/**
 * Forward-only research-model verification from VETO's own immutable prediction
 * snapshots and separately certified API-Football 90-minute results.
 *
 * One preselected market observation per fixture / model version; never select
 * a successful snapshot retrospectively. Metrics remain DESCRIPTIVE, not
 * evidence of an executable sportsbook edge or real-money ROI.
 */
import type {PersistedEvent,PersistedEventStateRecord,PersistedPredictionSnapshotRecord} from "@/lib/persistence/contracts";
import {certifyStoredPaperFinal} from "@/lib/paper/paper-verification";
import {observedFootballState} from "@/lib/research/auto-discovery";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

export type VerifiedForecast={
 id:string;eventId:string;match:string;competition:string;modelVersion:string;
 marketKey:string;selectionKey:string;capturedAt:string;startsAt:string;
 finalAt:string;finalScore:{home:number;away:number};
 probability:number;outcome:0|1;source:"VETO_SHADOW_AND_API_FOOTBALL_FT";
};
export type ModelMetrics={
 samples:number;fixtures:number;wins:number;
 brier:number|null;logLoss:number|null;meanProbability:number|null;
 observedFrequency:number|null;
};
export type ForecastCohort={modelVersion:string;latestAt:string;total:ModelMetrics;
 train:ModelMetrics;holdout:ModelMetrics;trainBaselineProbability:number|null;
 holdoutBaselineBrier:number|null;holdoutBrierSkillVsTrainBaseline:number|null;
 holdoutCountSufficient:boolean;historicalEdgeValidated:false;
 reliabilityBins:Array<{min:number;max:number;count:number;forecastMean:number;observedFrequency:number}>;
};
export type ForecastValidation={
 model:"veto.forecast-proof.forward-v1";generatedAt:string;source:"PERSISTED_ONLY";
 evaluation:"INDEPENDENT_CERTIFIED_FT_ONLY";lookbackDays:number;
 coverage:{eventsScanned:number;eventsWithFt:number;predictionRowsRead:number;
  eventsWithCandidate:number;verifiedSamples:number;excludedCount:number;
  scanMayBeCapped:boolean;sampleMayBeCapped:boolean};
 selectedModelVersion:string|null;selected:ForecastCohort|null;cohorts:ForecastCohort[];
 recent:VerifiedForecast[];historicalEdgeValidated:false;profitableStrategyVerified:false;
 minimumTrainingFixtures:60;minimumHoldoutFixtures:20;
 note:string;
};

const finiteTime=(x:string)=>Date.parse(x);
const shadowVersion=(p:PersistedPredictionSnapshotRecord):string|null=>{
 if(!Array.isArray(p.modelSignals))return null;
 const versions=new Set(p.modelSignals.flatMap(signal=>{
  if(!signal||typeof signal!=="object"||Array.isArray(signal))return[];
  const value=signal as Record<string,unknown>;
  return value.mode==="SHADOW"&&typeof value.version==="string"&&value.version.trim()&&
   value.version.length<=100?[value.version]:[];
 }));
 return versions.size===1?[...versions][0]:null;
};
/** Selection outcome must have a deterministic full-time score contract. */
export function fullTimeBinaryOutcome(p:Pick<PersistedPredictionSnapshotRecord,"marketKey"|"selectionKey">,
 score:{home:number;away:number}):0|1|null{
 if(!Number.isInteger(score.home)||!Number.isInteger(score.away)||score.home<0||score.away<0||
  score.home>40||score.away>40)return null;
 const {home,away}=score;
 if(p.marketKey==="football.1x2"){
  if(p.selectionKey==="home")return home>away?1:0;
  if(p.selectionKey==="away")return away>home?1:0;
  if(p.selectionKey==="draw")return home===away?1:0;
 }
 if(p.marketKey==="football.btts"){
  if(p.selectionKey==="yes")return home>0&&away>0?1:0;
  if(p.selectionKey==="no")return home===0||away===0?1:0;
 }
 if(p.marketKey==="football.total_goals"){
  const m=p.selectionKey.match(/^(under|over)-([1-4])\.5$/);
  if(!m)return null;
  const total=home+away,line=Number(m[2])+.5;
  return (m[1]==="under"?total<line:total>line)?1:0;
 }
 return null;
}
const fixedMarketRank=(p:Pick<PersistedPredictionSnapshotRecord,"marketKey"|"selectionKey">)=>{
 const group=p.marketKey==="football.1x2"?0:p.marketKey==="football.total_goals"?1:2;
 const priority=p.selectionKey==="home"?0:p.selectionKey==="draw"?1:p.selectionKey==="away"?2:3;
 return group*100+priority;
};
const rounded=(v:number)=>Number(v.toFixed(5));
function metrics(rows:VerifiedForecast[]):ModelMetrics{
 if(!rows.length)return{samples:0,fixtures:0,wins:0,brier:null,logLoss:null,
  meanProbability:null,observedFrequency:null};
 const n=rows.length;
 return{samples:n,fixtures:new Set(rows.map(r=>r.eventId)).size,
  wins:rows.reduce((a,r)=>a+r.outcome,0),
  brier:rounded(rows.reduce((a,r)=>a+(r.probability-r.outcome)**2,0)/n),
  logLoss:rounded(rows.reduce((a,r)=>{
   const p=Math.max(.000001,Math.min(.999999,r.probability));
   return a-(r.outcome*Math.log(p)+(1-r.outcome)*Math.log(1-p));
  },0)/n),
  meanProbability:rounded(rows.reduce((a,r)=>a+r.probability,0)/n),
  observedFrequency:rounded(rows.reduce((a,r)=>a+r.outcome,0)/n)};
}
function cohort(modelVersion:string,rows:VerifiedForecast[],capped:boolean):ForecastCohort{
 const chronological=[...rows].sort((a,b)=>finiteTime(a.startsAt)-finiteTime(b.startsAt)||
  a.eventId.localeCompare(b.eventId));
 const split=Math.floor(chronological.length*.7);
 const train=chronological.slice(0,split),holdout=chronological.slice(split);
 // This Laplace-smoothed intercept baseline uses TRAIN only. Never peek at
 // holdout outcomes when setting the baseline forecast.
 const baseline=train.length?(train.reduce((a,r)=>a+r.outcome,0)+1)/(train.length+2):null;
 const baselineBrier=baseline!==null&&holdout.length?
  rounded(holdout.reduce((a,r)=>a+(baseline-r.outcome)**2,0)/holdout.length):null;
 const holdoutMetrics=metrics(holdout);
 const binRows=Array.from({length:5},(_,i)=>{
  const low=i/5,high=(i+1)/5;
  const subset=holdout.filter(r=>r.probability>=low&&(i===4?r.probability<=high:r.probability<high));
  return subset.length?{min:low,max:high,count:subset.length,
   forecastMean:rounded(subset.reduce((a,r)=>a+r.probability,0)/subset.length),
   observedFrequency:rounded(subset.reduce((a,r)=>a+r.outcome,0)/subset.length)}:null;
 }).filter((x):x is NonNullable<typeof x>=>Boolean(x));
 return{modelVersion,latestAt:chronological.reduce((s,r)=>
  finiteTime(r.capturedAt)>finiteTime(s)?r.capturedAt:s,chronological[0]?.capturedAt??""),
  total:metrics(chronological),train:metrics(train),holdout:holdoutMetrics,
  trainBaselineProbability:baseline===null?null:rounded(baseline),
  holdoutBaselineBrier:baselineBrier,
  holdoutBrierSkillVsTrainBaseline:baselineBrier!==null&&baselineBrier>0&&holdoutMetrics.brier!==null?
   rounded(1-holdoutMetrics.brier/baselineBrier):null,
  // Coverage truncation / 80-fixture threshold are hard blockers for
  // interpretation, regardless of positive brier skill.
  holdoutCountSufficient:!capped&&train.length>=60&&holdout.length>=20&&
   new Set(chronological.map(r=>r.eventId)).size>=80,
  historicalEdgeValidated:false,
  reliabilityBins:binRows};
}
export function validateForwardShadowForecasts(input:{
 events:PersistedEvent[];states:PersistedEventStateRecord[];
 predictions:PersistedPredictionSnapshotRecord[];asOf:string;
 lookbackDays?:number;scanMayBeCapped?:boolean;sampleMayBeCapped?:boolean;
}):ForecastValidation{
 const now=finiteTime(input.asOf),at=Number.isFinite(now)?input.asOf:new Date().toISOString();
 const capped=Boolean(input.scanMayBeCapped||input.sampleMayBeCapped);
 const eligible=input.events.filter(event=>event.event.sport==="football"&&
  event.event.status==="finished"&&!isSelfcheckEvent(event)&&
  Number.isFinite(finiteTime(event.event.startsAt)));
 const statesByEvent=new Map<string,PersistedEventStateRecord[]>(),
  predictionsByEvent=new Map<string,PersistedPredictionSnapshotRecord[]>();
 for(const row of input.states){
  const bucket=statesByEvent.get(row.eventId)??[];bucket.push(row);statesByEvent.set(row.eventId,bucket);
 }
 for(const row of input.predictions){
  const bucket=predictionsByEvent.get(row.eventId)??[];bucket.push(row);predictionsByEvent.set(row.eventId,bucket);
 }
 const all:VerifiedForecast[]=[];
 let eventsWithFt=0,eventsWithCandidate=0;
 for(const event of eligible){
  const states=statesByEvent.get(event.id)??[],
   final=certifyStoredPaperFinal(event,states,at);
  if(!final)continue;
  eventsWithFt++;
  const firstFinal=Math.min(...states.filter(s=>
   s.sourceProvider==="api-football"&&s.state.status==="finished"&&
   s.state.source==="api-football.fixtures.results"&&s.state.regulationTimeOnly===true)
   .map(s=>finiteTime(s.capturedAt)).filter(Number.isFinite));
  if(!Number.isFinite(firstFinal))continue;
  const kickoff=finiteTime(event.event.startsAt);
  const validStates=new Set(states.filter(state=>
   state.sourceProvider==="api-football"&&state.state.status==="live"&&
   observedFootballState(state.state)!==null&&
   finiteTime(state.capturedAt)>=kickoff&&finiteTime(state.capturedAt)<=kickoff+105*60000&&
   finiteTime(state.capturedAt)<firstFinal)
   .map(state=>state.capturedAt));
  const candidates=(predictionsByEvent.get(event.id)??[]).flatMap(p=>{
   const version=shadowVersion(p),capture=finiteTime(p.capturedAt),outcome=fullTimeBinaryOutcome(p,final.score);
   if(!version||outcome===null||!validStates.has(p.capturedAt)||!Number.isFinite(capture)||
    capture>=firstFinal||capture>=now||
    !Number.isFinite(p.fairProbability)||p.fairProbability<=0||p.fairProbability>=1)return[];
   return[{p,version,outcome}];
  }).sort((a,b)=>finiteTime(a.p.capturedAt)-finiteTime(b.p.capturedAt)||
   fixedMarketRank(a.p)-fixedMarketRank(b.p)||a.p.id.localeCompare(b.p.id));
  if(!candidates.length)continue;
  eventsWithCandidate++;
  // Exactly one outcome selection per fixture and model version, locked by
  // earliest capturedAt then fixed market rank. No duplicate polls as "wins".
  const byVersion=new Set<string>();
  for(const item of candidates){
   if(byVersion.has(item.version))continue;
   byVersion.add(item.version);
   all.push({id:item.p.id,eventId:event.id,
    match:(event.event.home?.name??"Хозяева")+" — "+(event.event.away?.name??"Гости"),
    competition:event.event.competition,modelVersion:item.version,
    marketKey:item.p.marketKey,selectionKey:item.p.selectionKey,
    capturedAt:item.p.capturedAt,startsAt:event.event.startsAt,finalAt:final.capturedAt,
    finalScore:final.score,probability:item.p.fairProbability,
    outcome:item.outcome,
    source:"VETO_SHADOW_AND_API_FOOTBALL_FT"});
  }
 }
 const versions=[...new Set(all.map(r=>r.modelVersion))];
 const cohorts=versions.map(version=>cohort(version,all.filter(row=>row.modelVersion===version),capped))
  .sort((a,b)=>finiteTime(b.latestAt)-finiteTime(a.latestAt)||a.modelVersion.localeCompare(b.modelVersion));
 const selected=cohorts[0]??null;
 return{
  model:"veto.forecast-proof.forward-v1",generatedAt:at,source:"PERSISTED_ONLY",
  evaluation:"INDEPENDENT_CERTIFIED_FT_ONLY",lookbackDays:input.lookbackDays??7,
  coverage:{eventsScanned:eligible.length,eventsWithFt,predictionRowsRead:input.predictions.length,
   eventsWithCandidate,verifiedSamples:all.length,excludedCount:Math.max(0,input.predictions.length-all.length),
   scanMayBeCapped:Boolean(input.scanMayBeCapped),sampleMayBeCapped:Boolean(input.sampleMayBeCapped)},
  selectedModelVersion:selected?.modelVersion??null,selected,cohorts:cohorts.slice(0,8),
  recent:all.sort((a,b)=>finiteTime(b.finalAt)-finiteTime(a.finalAt)).slice(0,24),
  historicalEdgeValidated:false,profitableStrategyVerified:false,
  minimumTrainingFixtures:60,minimumHoldoutFixtures:20,
  note:"Chronological 70/30 split, exactly one forward shadow snapshot per fixture and model version; baseline trained on earlier fixtures only. Brier/calibration do not prove bookmaker value, executable odds or profitability."};
}
/** Pure deterministic fixtures; can also run on public endpoint without storage. */
export function forecastValidationSelfcheck(){
 const at="2026-10-18T17:00:00Z";
 const fixture=(id:number,win:boolean)=>{
  const kickoff=new Date(Date.parse("2026-10-02T10:00:00Z")+id*2*3600_000).toISOString();
  const stateAt=new Date(Date.parse(kickoff)+45*60000).toISOString();
  const ftAt=new Date(Date.parse(kickoff)+180*60000).toISOString();
  const event:PersistedEvent={id:"e"+id,canonicalKey:"api-football::"+id,
   event:{id:String(id),sport:"football",competition:"Test",status:"finished",startsAt:kickoff,
    home:{id:"h",name:"Home"},away:{id:"a",name:"Away"}}};
  const states:PersistedEventStateRecord[]=[
   {eventId:event.id,sourceProvider:"api-football",capturedAt:stateAt,
    state:{status:"live",score:{home:0,away:0},clock:"45′"}},
   {eventId:event.id,sourceProvider:"api-football",capturedAt:ftAt,
    state:{status:"finished",score:{home:win?2:0,away:1},
     source:"api-football.fixtures.results",regulationTimeOnly:true,providerEventId:id+1}},
  ];
  const pred:PersistedPredictionSnapshotRecord={id:"p"+id,eventId:event.id,
   featureSnapshotId:"f",marketKey:"football.1x2",selectionKey:"home",
   fairProbability:.7,fairOdds:1/.7,modelAgreement:0,uncertainty:1,
   modelSignals:[{mode:"SHADOW",version:"v1"}],capturedAt:stateAt};
  return{event,states,pred,ftAt};
 };
 const first=fixture(1,true),second=fixture(2,false);
 const run=(parts=[first,second],extra:PersistedPredictionSnapshotRecord[]=[],
  opts:Partial<Parameters<typeof validateForwardShadowForecasts>[0]>={})=>
  validateForwardShadowForecasts({events:parts.map(x=>x.event),
   states:parts.flatMap(x=>x.states),predictions:[...parts.map(x=>x.pred),...extra],
   asOf:at,...opts});
 const base=run();
 const late={...first.pred,id:"late",capturedAt:first.ftAt};
 const samples=Array.from({length:90},(_,i)=>fixture(i+1,i%3!==0));
 const sufficient=run(samples);
 const checks=[
  {name:"Only exact source-certified FT permits model scoring",
   passed:base.coverage.verifiedSamples===2&&base.selected?.total.wins===1},
  {name:"One fixture is counted once, duplicate and after-FT picks cannot bias",
   passed:run([first,second],[first.pred,late]).coverage.verifiedSamples===2},
  {name:"Missing upstream final certificate rejects all outcomes",
   passed:run([first],[],{states:first.states.slice(0,1)}).coverage.verifiedSamples===0},
  {name:"Wrong-state or future snapshot cannot be graded",
   passed:run([first],[],{predictions:[{...first.pred,capturedAt:first.ftAt}]}).coverage.verifiedSamples===0},
  {name:"Unversioned market price cannot masquerade as model forecast",
   passed:run([first],[],{predictions:[{...first.pred,modelSignals:[]}]}).coverage.verifiedSamples===0},
  {name:"Chronological holdout independent of training baseline",
   passed:sufficient.selected?.train.samples===62&&sufficient.selected.holdout.samples===28&&
    sufficient.selected.holdoutCountSufficient===true},
  {name:"Coverage truncation blocks sufficiency, never claims validated EDGE",
   passed:run(samples,[],{scanMayBeCapped:true}).selected?.holdoutCountSufficient===false&&
    sufficient.historicalEdgeValidated===false&&sufficient.profitableStrategyVerified===false},
  {name:"Unsupported spread contract is never graded",
   passed:fullTimeBinaryOutcome({marketKey:"football.handicap",selectionKey:"home-1.5"},
    {home:2,away:0})===null},
  {name:"No fabricated positive edge or execution verification",
   passed:base.cohorts.every(x=>x.historicalEdgeValidated===false)&&base.recent.every(x=>x.source==="VETO_SHADOW_AND_API_FOOTBALL_FT")},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
