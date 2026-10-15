/** VETO Sport / Strategy Validation v1.
 * Pure, read-only retrospective diagnostics on browser-local paper records.
 * NOT an unbiased opportunity census, prospective trial, executable price,
 * bookmaker settlement or verified betting edge.
 */
import type {PaperEntry} from "@/lib/paper/paper-ledger";

export type StrategyOutcome="WIN"|"LOSS";
type Sample={eventId:string;contract:NonNullable<PaperEntry["marketContract"]>;
 version:string;strategyTag:string;recorded:number;p:number;odds:number;win:0|1};
export type ValidationStatus="EMPTY"|"INSUFFICIENT"|"RETROSPECTIVE_ONLY";
export type CalibrationBin={from:number;to:number;count:number;predicted:number|null;observed:number|null};
export type StrategyCohort={
 key:string;label:string;status:ValidationStatus;
 count:number;uniqueFixtures:number;from:string|null;to:string|null;
 brier:number|null;baselineBrier:number|null;logLoss:number|null;
 meanModelEV:number|null;unitYield:number|null;hitRate:number|null;
 hitRateWilson95:[number,number]|null;
 ece:number|null;calibration:CalibrationBin[];
 holdoutCount:number;holdoutBrier:number|null;holdoutYield:number|null;
 note:string;
};
export type StrategyValidationReport={
 status:ValidationStatus;totalRecords:number;eligibleRecords:number;
 duplicateRejected:number;excluded:{unsettled:number;manual:number;missingProof:number;invalidTiming:number;duplicate:number};
 cohorts:StrategyCohort[];overall:StrategyCohort|null;
 prospectiveValidated:false;executablePricesVerified:false;validatedEdgeCount:0;
 maximumLocalEntries:150;
};
const result=(e:PaperEntry):0|1=>e.status==="PROVIDER_WIN"?1:0;
const average=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const wilson=(wins:number,n:number):[number,number]|null=>{
 if(n<1)return null;
 const z=1.959963984540054,c=z*z,phat=wins/n;
 const centre=(phat+c/(2*n))/(1+c/n);
 const half=z*Math.sqrt(phat*(1-phat)/n+c/(4*n*n))/(1+c/n);
 return[Math.max(0,centre-half),Math.min(1,centre+half)];
};
const initialBins=():CalibrationBin[]=>Array.from({length:5},(_,i)=>({
 from:i/5,to:(i+1)/5,count:0,predicted:null,observed:null
}));
function metric(xs:Sample[]){
 const brier=average(xs.map(x=>(x.p-x.win)**2));
 const baselineBrier=average(xs.map(x=>(1/x.odds-x.win)**2));
 const logLoss=average(xs.map(x=>-(x.win*Math.log(x.p)+(1-x.win)*Math.log(1-x.p))));
 const meanModelEV=average(xs.map(x=>x.p*x.odds-1));
 const unitYield=average(xs.map(x=>x.win?x.odds-1:-1));
 const hitRate=average(xs.map(x=>x.win));
 const calibration=initialBins();
 for(let i=0;i<5;i++){
  const band=xs.filter(x=>Math.min(4,Math.floor(x.p*5))===i);
  calibration[i].count=band.length;
  calibration[i].predicted=average(band.map(x=>x.p));
  calibration[i].observed=average(band.map(x=>x.win));
 }
 const ece=xs.length?calibration.reduce((acc,bin)=>acc+
  bin.count/xs.length*Math.abs((bin.predicted??0)-(bin.observed??0)),0):null;
 return{brier,baselineBrier,logLoss,meanModelEV,unitYield,hitRate,ece,calibration,
  hitRateWilson95:wilson(xs.reduce((sum,x)=>sum+x.win,0),xs.length)};
}
function cohort(key:string,label:string,rows:Sample[]):StrategyCohort{
 const xs=[...rows].sort((a,b)=>a.recorded-b.recorded||a.eventId.localeCompare(b.eventId));
 const m=metric(xs);
 // Chronological holdout is descriptive only: user may have selected the
 // model and markets after examining outcomes. It is NOT independent OOS.
 const boundary=Math.floor(xs.length*.8);
 const holdout=xs.length>=30?xs.slice(boundary):[];
 const hm=metric(holdout);
 return{key,label,status:xs.length===0?"EMPTY":xs.length<30?"INSUFFICIENT":"RETROSPECTIVE_ONLY",
  count:xs.length,uniqueFixtures:new Set(xs.map(x=>x.eventId)).size,
  from:xs[0]?new Date(xs[0].recorded).toISOString():null,
  to:xs.at(-1)?new Date(xs.at(-1)!.recorded).toISOString():null,
  ...m,holdoutCount:holdout.length,holdoutBrier:hm.brier,holdoutYield:hm.unitYield,
  note:xs.length<30?"Менее 30 независимых событий: нельзя интерпретировать показатели как надёжную оценку.":
   "80/20 по времени — ретроспективная проверка выборки пользователя, а не истинный независимый out-of-sample."};
}
function eligible(e:PaperEntry):{sample:Sample|null;reason:"unsettled"|"manual"|"missingProof"|"invalidTiming"|null}{
 if(e.status==="UNSETTLED")return{sample:null,reason:"unsettled"};
 if(!e.status.startsWith("PROVIDER_"))return{sample:null,reason:"manual"};
 if((e.status!=="PROVIDER_WIN"&&e.status!=="PROVIDER_LOSS")||
   e.source!=="SOURCE_SNAPSHOT"||!e.marketContract||!e.selectionMarketKey||!e.selectionKey||
   e.verifiedProvider!=="api-football"||!e.verifiedScore||
   !e.modelVersion||!e.modelCapturedAt||!e.quoteCapturedAt||
   !Number.isFinite(e.modelProbability)||!Number.isFinite(e.odds)||
   !Number.isFinite(e.stake)||!e.verifiedAt||!e.settledAt)
  return{sample:null,reason:"missingProof"};
 const p=e.modelProbability!;
 if(p<=0||p>=1||e.odds<=1||e.odds>1000||e.stake<=0)
  return{sample:null,reason:"missingProof"};
 const model=Date.parse(e.modelCapturedAt!),quote=Date.parse(e.quoteCapturedAt!),
  recorded=Date.parse(e.recordedAt),final=Date.parse(e.settledAt),verified=Date.parse(e.verifiedAt!);
 if(![model,quote,recorded,final,verified].every(Number.isFinite)||
  model>recorded||quote>recorded||recorded>=final||final>verified||
  recorded-model>300_000||recorded-quote>120_000)
  return{sample:null,reason:"invalidTiming"};
 return{sample:{eventId:e.eventId,contract:e.marketContract,version:e.modelVersion!,
  strategyTag:e.strategyTag?.trim()||"UNLABELED",recorded,p,odds:e.odds,win:result(e)},reason:null};
}
export function validatePaperStrategies(records:PaperEntry[]):StrategyValidationReport{
 const excluded={unsettled:0,manual:0,missingProof:0,invalidTiming:0,duplicate:0};
 const eligibleRows:Sample[]=[];
 for(const e of records){
  const attempt=eligible(e);
  if(attempt.sample)eligibleRows.push(attempt.sample);
  else if(attempt.reason)excluded[attempt.reason]++;
 }
 // Repeating a pick for one fixture can artificially make statistics appear
 // precise. Exclude ALL conflicts for that event+contract+model cohort.
 const groups=new Map<string,Sample[]>();
 for(const sample of eligibleRows){
  const key=[sample.eventId,sample.contract,sample.version,sample.strategyTag].join("\u0000");
  const group=groups.get(key)??[];group.push(sample);groups.set(key,group);
 }
 const unique=[...groups.values()].filter(group=>{
  if(group.length===1)return true;
  excluded.duplicate+=group.length;return false;
 }).map(group=>group[0]);
 const byCohort=new Map<string,Sample[]>();
 for(const sample of unique){
  const key=[sample.version,sample.contract,sample.strategyTag].join(" / ");
  const group=byCohort.get(key)??[];group.push(sample);byCohort.set(key,group);
 }
 const cohorts=[...byCohort.entries()].map(([key,rows])=>cohort(key,key,rows))
  .sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
 // Overall removes repeated fixtures even across different models/markets:
 // keep only fixtures represented exactly once, no cherry-picked fallback.
 const fixtureGroups=new Map<string,Sample[]>();
 for(const sample of unique){
  const group=fixtureGroups.get(sample.eventId)??[];group.push(sample);
  fixtureGroups.set(sample.eventId,group);
 }
 const overallRows=[...fixtureGroups.values()].filter(group=>group.length===1).map(group=>group[0]);
 const overall=overallRows.length?cohort("overall","ONE UNCONFLICTED FIXTURE PER EVENT",overallRows):null;
 return{status:overall?.status??"EMPTY",totalRecords:records.length,
  eligibleRecords:unique.length,duplicateRejected:excluded.duplicate,excluded,
  cohorts,overall,prospectiveValidated:false,executablePricesVerified:false,
  validatedEdgeCount:0,maximumLocalEntries:150};
}
export function strategyValidationSelfcheck(){
 const sample=(n:number,version="m1",status:"PROVIDER_WIN"|"PROVIDER_LOSS"="PROVIDER_WIN"):PaperEntry=>({
  id:"r"+n,eventId:"evt-"+n,match:"A — B",scenario:"home",odds:2,stake:10,
  recordedAt:new Date(Date.UTC(2026,9,1+n,10)).toISOString(),
  quoteCapturedAt:new Date(Date.UTC(2026,9,1+n,9,59)).toISOString(),
  modelCapturedAt:new Date(Date.UTC(2026,9,1+n,9,58)).toISOString(),
  modelVersion:version,modelProbability:.7,
  marketContract:"FT_HOME",selectionMarketKey:"football.1x2",selectionKey:"home",
  strategyTag:"MODEL_PASS",source:"SOURCE_SNAPSHOT",status,
  settledAt:new Date(Date.UTC(2026,9,1+n,13)).toISOString(),
  verifiedAt:new Date(Date.UTC(2026,9,1+n,13,1)).toISOString(),
  verifiedProvider:"api-football",verifiedScore:{home:status==="PROVIDER_WIN"?1:0,away:1},
 });
 const rows=Array.from({length:32},(_,i)=>sample(i,"m1",i%2===0?"PROVIDER_WIN":"PROVIDER_LOSS"));
 const report=validatePaperStrategies(rows);
 const withDuplicates=validatePaperStrategies([...rows,{...rows[0],id:"repeat"}]);
 const invalidTime=validatePaperStrategies([{...rows[0],quoteCapturedAt:"2026-09-01T01:00:00Z"}]);
 const manual=validatePaperStrategies([{...rows[0],status:"MANUAL_WIN"}]);
 const tiny=validatePaperStrategies(rows.slice(0,5));
 const one=validatePaperStrategies([sample(99)]);
 const checks=[
  {name:"No empty fabricated performance",pass:validatePaperStrategies([]).overall===null},
  {name:"Only certified provider results count",pass:manual.eligibleRecords===0&&manual.excluded.manual===1},
  {name:"Retrospective cohorts are never prospective edge",pass:report.cohorts[0]?.status==="RETROSPECTIVE_ONLY"&&report.validatedEdgeCount===0&&!report.prospectiveValidated},
  {name:"Duplicate fixture and same selection excluded",pass:withDuplicates.excluded.duplicate===2&&withDuplicates.eligibleRecords===30},
  {name:"Old quote excluded even when final is certified",pass:invalidTime.excluded.invalidTiming===1},
  {name:"Minimum 30 unique fixtures before holdout",pass:tiny.overall?.status==="INSUFFICIENT"&&tiny.overall.holdoutCount===0},
  {name:"Brier score and price-implied baseline are separate",pass:Math.abs((one.overall?.brier??0)-.09)<1e-9&&Math.abs((one.overall?.baselineBrier??0)-.25)<1e-9},
  {name:"80/20 is chronological and descriptive only",pass:report.overall?.holdoutCount===7},
  {name:"Wilson 95 interval exists for valid binary outcome",pass:(report.overall?.hitRateWilson95?.[0]??1)<.5&&(report.overall?.hitRateWilson95?.[1]??0)>.5},
 ];
 return{passed:checks.every(x=>x.pass),checks};
}
