import type {ProviderHealthSample} from "@/lib/persistence/contracts";

export const sourceDescriptors=[
 {id:"api-football",label:"Игровые состояния",cadenceHours:0.5},
 {id:"api-football-finals",label:"Окончательные результаты",cadenceHours:4},
 {id:"api-football-live-odds",label:"Рыночные котировки",cadenceHours:2},
] as const;
export type ProviderReadiness="active"|"empty"|"waiting"|"degraded"|"stale"|"unknown";
export interface SafeSourceRun{
  checkedAt:string;recorded:number|null;
  outcome:"recorded"|"empty"|"waiting"|"degraded"|"unverified";
}

const asSafeCount=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0
  ?Math.min(v,100000):null;
export interface SourceHealthView{
  id:string;label:string;
  state:ProviderReadiness;
  updatedAt:string|null;
  ageMinutes:number|null;
  receivedRecords:number|null;
  scannedRecords:number|null;
  pendingFixtureChecks:number|null;
  matchedFixtures:number|null;
  scannedActiveFixtures:number|null;
  openProviderQuotes:number|null;
  lastRunCode:string|null;
  lastFailureStage:string|null;
  upstreamAttempted:boolean|null;
  recentRuns:SafeSourceRun[];
  note:string;
}
export function toSourceHealthView(input:{
 descriptor:{id:string;label:string;cadenceHours:number};
 latest:ProviderHealthSample|null;history?:ProviderHealthSample[];now:string;
}):SourceHealthView{
 const {descriptor,latest}=input;
 const now=Date.parse(input.now),at=latest?Date.parse(latest.checkedAt):NaN;
 const ageMinutes=latest&&Number.isFinite(at)&&Number.isFinite(now)&&at<=now
  ?Math.floor((now-at)/60000):null;
 const stale=ageMinutes!==null&&ageMinutes>Math.ceil(descriptor.cadenceHours*120+40);
 const info=latest?.metadata??{};
 // Successful request != usable market data. The sparse 2-hour in-play
 // sampling often reaches an empty upstream response.
 const noMarkets=descriptor.id==="api-football-live-odds"&&
  latest?.status==="healthy"&&
  (info.unsuspendedWritten===0||(info.unsuspendedWritten===undefined&&info.quotesWritten===0));
 const noVerifiedFixtures=descriptor.id==="api-football-live-odds"&&
  info.failureCode==="NO_RECENT_VERIFIED_SCORE_FIXTURES"&&
  info.providerCalled===false;
 const state:ProviderReadiness=ageMinutes===null?"unknown":stale?"stale":
  noVerifiedFixtures?"waiting":noMarkets?"empty":
  latest?.status==="healthy"?"active":"degraded";
 // Never forward provider message, errors, metadata, ids or quota; metrics only.
 const stored=asSafeCount(info.finishedStored??info.stored??info.quotesWritten);
 const scanned=asSafeCount(info.scannedEvents??info.upstreamFixtures??info.providerRows);
 const pending=descriptor.id==="api-football-finals"
  ?asSafeCount(info.eligibleCandidates??info.candidateCount):null;
 const matchedFixtures=descriptor.id==="api-football-live-odds"?
  asSafeCount(info.mapped):null;
 const scannedActiveFixtures=descriptor.id==="api-football-live-odds"?
  asSafeCount(info.scannedActiveFixtures):null;
 const openProviderQuotes=descriptor.id==="api-football-live-odds"?
  asSafeCount(info.unsuspendedWritten):null;
 // Error labels are a strict, non-sensitive allowlist. Raw provider payloads,
 // bridge URLs, credentials, quota headers and arbitrary messages remain private.
 const safeCodes=new Set([
  "STORAGE_OR_PROVIDER_FAILURE","UPSTREAM_REJECTED_TARGETED_IDS",
  "MALFORMED_PROVIDER_PAYLOAD","NO_ELIGIBLE_OBSERVED_FIXTURES",
  "UPSTREAM_DAILY_QUOTA","UPSTREAM_MINUTE_QUOTA","UPSTREAM_SUBSCRIPTION",
  "UPSTREAM_AUTH","UPSTREAM_INVALID_PARAMETERS","UPSTREAM_UNCLASSIFIED",
  "QUOTA_RESERVE","LIVE_FOOTBALL_OR_STORAGE_NOT_ENABLED",
  "NO_OVERLAPPING_FIXTURES","NO_USABLE_BOOKMAKER_QUOTES",
  "NO_LIVE_MARKETS_RETURNED","NO_RECENT_VERIFIED_SCORE_FIXTURES",
  "ALL_MARKETS_SUSPENDED",
  "STORAGE_WRITE_FAILURE","API_FOOTBALL_LIVE_ODDS_BAD_BODY",
  "UPSTREAM_HTTP_400","UPSTREAM_HTTP_401","UPSTREAM_HTTP_403",
  "UPSTREAM_HTTP_404","UPSTREAM_HTTP_429","UPSTREAM_HTTP_500",
  "UPSTREAM_HTTP_502","UPSTREAM_HTTP_503","UPSTREAM_HTTP_504",
 ]);
 const candidateCode=typeof info.failureCode==="string"?info.failureCode:
  typeof info.reason==="string"?info.reason:null;
 const lastRunCode=candidateCode&&safeCodes.has(candidateCode)?candidateCode:null;
 const upstreamAttempted=typeof info.upstreamAttempted==="boolean"?info.upstreamAttempted:
  typeof info.providerCalled==="boolean"?info.providerCalled:null;
 const validStages=new Set(["FETCH_EVENTS","FETCH_STATE_HISTORY","FETCH_UPSTREAM","PERSIST_FINALS","WRITE_PROVIDER_HEALTH",
  "LIST_ACTIVE_EVENTS","LOAD_MATCH_SNAPSHOTS","FETCH_INPLAY_ODDS","PERSIST_MARKET_QUOTES"]);
 const lastFailureStage=typeof info.failureStage==="string"&&validStages.has(info.failureStage)?info.failureStage:null;
 const quotaHint=lastRunCode==="UPSTREAM_DAILY_QUOTA"?
   "Дневной лимит API исчерпан; новые проверки станут возможны после сброса квоты.":
  lastRunCode==="UPSTREAM_MINUTE_QUOTA"?
   "Достигнуто минутное ограничение запросов; источник должен снизить частоту.":
  lastRunCode==="UPSTREAM_SUBSCRIPTION"?
   "Подписка спортивного провайдера ограничивает этот запрос.":
  lastRunCode==="UPSTREAM_AUTH"?
   "Источник отклонил авторизацию; требуется проверка подключения.":
  lastRunCode==="UPSTREAM_INVALID_PARAMETERS"?
   "Источник отклонил параметры запроса; требуется исправление интеграции.":
  lastRunCode==="NO_RECENT_VERIFIED_SCORE_FIXTURES"?
   "Пока нет актуальных событий с точным ID и проверенным игровым снимком. Внешний API коэффициентов не вызывался; квота сохранена.":
  lastRunCode==="NO_LIVE_MARKETS_RETURNED"?
   "Источник ответил, но не предоставил ни одного in-play рынка. Нулевые коэффициенты — это не работающий рыночный поток.":
  lastRunCode==="ALL_MARKETS_SUSPENDED"?
   "Источник передал только приостановленные рынки. Сохранённая история не означает наличие открытых коэффициентов.":
  lastRunCode==="NO_OVERLAPPING_FIXTURES"?
   "Провайдер передал рынки, но не было точного совпадения с наблюдаемыми активными матчами. Никаких букмекерских линий не придумано.":
  lastRunCode==="NO_USABLE_BOOKMAKER_QUOTES"?
   "Матчи совпали, но подходящих актуальных рыночных снимков не удалось записать.":
  lastRunCode==="QUOTA_RESERVE"?
   "Достигнут резерв бесплатной квоты; новые цены не записывались.":
  lastRunCode==="STORAGE_WRITE_FAILURE"?
   "Ошибка сохранения проверенной котировки; запись и подтверждение рынков неполные.":null;
 const note=quotaHint??(state==="unknown"?"Нет подтверждённого запуска этого источника.":
  state==="stale"?"Последний запуск устарел; новые данные не подтверждены.":
  state==="empty"?"Источник ответил без новых рыночных данных. Проверять нечего, цены отсутствуют.":
  state==="waiting"?"Нет подходящих наблюдений: внешний источник коэффициентов не запрашивался.":
  state==="degraded"?"Последний запуск сообщил об ограничении, ошибке или неполных данных.":
  descriptor.id==="api-football-finals"?
   "Проверка окончательных результатов выполнена. Положительная доходность не следует из количества FT.":
   "Последняя проверка источника прошла. Это не гарантирует полноту и секундную свежесть.");
 const safeHistory=(input.history??(latest?[latest]:[])).slice(0,6);
 const recentRuns:SafeSourceRun[]=safeHistory.flatMap(run=>{
  const t=Date.parse(run.checkedAt);
  if(!Number.isFinite(t)||t>now||t<=0)return[];
  const m=run.metadata??{};
  const recorded=asSafeCount(descriptor.id==="api-football-live-odds"&&m.unsuspendedWritten!==undefined?
   m.unsuspendedWritten:(m.finishedStored??m.stored??m.quotesWritten));
  const outcome:SafeSourceRun["outcome"]=m.failureCode==="NO_RECENT_VERIFIED_SCORE_FIXTURES"&&m.providerCalled===false?
    "waiting":run.status!=="healthy"?"degraded":
    descriptor.id==="api-football-live-odds"&&recorded===0?"empty":
    recorded!==null&&recorded>0?"recorded":"unverified";
  return[{checkedAt:new Date(t).toISOString(),recorded,outcome}];
 });
 return{id:descriptor.id,label:descriptor.label,state,updatedAt:ageMinutes===null?null:latest!.checkedAt,
  ageMinutes,receivedRecords:stored,scannedRecords:scanned,pendingFixtureChecks:pending,
  matchedFixtures,scannedActiveFixtures,openProviderQuotes,lastRunCode,lastFailureStage,upstreamAttempted,recentRuns,note};
}
export function sourceHealthSelfcheck(){
 const at="2026-10-13T15:00:00Z";
 const descriptor=sourceDescriptors[1];
 const sample:ProviderHealthSample={
  providerId:descriptor.id,status:"healthy",checkedAt:"2026-10-13T14:55:00Z",
  quotaRemaining:13,message:"private service diagnostics",
  metadata:{finishedStored:2,eligibleCandidates:21,scannedEvents:150,
   internalAccessToken:"TOP_SECRET",failureCode:"SHOULD_NOT_EXPOSE"},
 };
 const result=toSourceHealthView({descriptor,latest:sample,now:at});
 const missed=toSourceHealthView({descriptor,latest:null,now:at});
 const old=toSourceHealthView({descriptor,latest:{...sample,checkedAt:"2026-10-13T01:00:00Z"},now:at});
 const bad=toSourceHealthView({descriptor,latest:{...sample,status:"degraded"},now:at});
 const json=JSON.stringify(result);
 const checks=[
  {name:"Recent healthy run is active, not fresh betting data",passed:result.state==="active"&&result.receivedRecords===2},
  {name:"No stored record is UNKNOWN",passed:missed.state==="unknown"&&missed.updatedAt===null},
  {name:"Old formerly healthy cron is stale",passed:old.state==="stale"},
  {name:"Degraded data source is never called active",passed:bad.state==="degraded"},
  {name:"Safe counts emitted from allowlist only",passed:result.scannedRecords===150&&result.pendingFixtureChecks===21},
  {name:"Whitelisted stage error codes shown without arbitrary messages",passed:
   toSourceHealthView({descriptor,latest:{...sample,metadata:{failureCode:"STORAGE_OR_PROVIDER_FAILURE",
    upstreamAttempted:false}},now:at}).lastRunCode==="STORAGE_OR_PROVIDER_FAILURE" &&
   toSourceHealthView({descriptor,latest:{...sample,metadata:{failureCode:"TOP_SECRET"}},now:at}).lastRunCode===null},
  {name:"No arbitrary diagnostic stage can cross into public source-health",passed:
   toSourceHealthView({descriptor,latest:{...sample,metadata:{failureStage:"FETCH_STATE_HISTORY"}},now:at}).lastFailureStage==="FETCH_STATE_HISTORY" &&
   toSourceHealthView({descriptor,latest:{...sample,metadata:{failureStage:"TOP_SECRET"}},now:at}).lastFailureStage===null},
  {name:"Source mismatch is explainable with safe counters only",passed:(()=>{
    const row={...sample,providerId:"api-football-live-odds",status:"degraded" as const,
      metadata:{failureCode:"NO_OVERLAPPING_FIXTURES",mapped:0,scannedActiveFixtures:14,
        internalAccessToken:"TOP_SECRET"}};
    const view=toSourceHealthView({descriptor:sourceDescriptors[2],latest:row,now:at});
    return view.lastRunCode==="NO_OVERLAPPING_FIXTURES"&&
      view.matchedFixtures===0&&view.scannedActiveFixtures===14&&
      !JSON.stringify(view).includes("TOP_SECRET");
   })()},
  {name:"Healthy but empty odds response never called active bookmaker data",passed:(()=>{
    const run={...sample,providerId:"api-football-live-odds",metadata:{
      quotesWritten:0,providerRows:0,internalAccessToken:"DO_NOT_LEAK"}};
    const v=toSourceHealthView({descriptor:sourceDescriptors[2],latest:run,now:at,history:[run]});
    return v.state==="empty"&&v.receivedRecords===0&&v.recentRuns[0].outcome==="empty"&&
      !JSON.stringify(v).includes("DO_NOT_LEAK");
   })()},
  {name:"Known fixture-gap prevents pretending provider was polled",passed:(()=>{
    const run={...sample,providerId:"api-football-live-odds",status:"degraded" as const,
      metadata:{failureCode:"NO_RECENT_VERIFIED_SCORE_FIXTURES",providerCalled:false}};
    const v=toSourceHealthView({descriptor:sourceDescriptors[2],latest:run,now:at});
    return v.state==="waiting"&&v.upstreamAttempted===false&&v.recentRuns[0].outcome==="waiting";
   })()},
  {name:"Six source history windows are bounded and raw errors never surfaced",passed:(()=>{
    const rows=Array.from({length:15},(_,i)=>({...sample,
      checkedAt:new Date(Date.parse(at)-(i+1)*60000).toISOString(),
      metadata:{quotesWritten:i,rawPrivateHeaders:"TOKEN_PRIVATE"}}));
    const v=toSourceHealthView({descriptor:sourceDescriptors[2],latest:rows[0],history:rows,now:at});
    return v.recentRuns.length===6&&!JSON.stringify(v).includes("TOKEN_PRIVATE");
   })()},
  {name:"Suspended market prices cannot be advertised as available",passed:(()=>{
    const row={...sample,providerId:"api-football-live-odds",
      metadata:{quotesWritten:8,unsuspendedWritten:0,suspendedWritten:8,
        failureCode:"ALL_MARKETS_SUSPENDED"}};
    const v=toSourceHealthView({descriptor:sourceDescriptors[2],latest:row,now:at});
    return v.state==="empty"&&v.openProviderQuotes===0&&
      v.lastRunCode==="ALL_MARKETS_SUSPENDED"&&v.recentRuns[0].outcome==="empty";
   })()},
  {name:"Server diagnostics and provider quota never leaked",passed:!json.includes("TOP_SECRET")&&!json.includes("quotaRemaining")&&!json.includes("SHOULD_NOT_EXPOSE")&&!json.includes("private service diagnostics")},
 ];
 return{passed:checks.every(c=>c.passed),checks};
}
