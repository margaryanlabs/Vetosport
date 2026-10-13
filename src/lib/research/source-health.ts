import type {ProviderHealthSample} from "@/lib/persistence/contracts";

export const sourceDescriptors=[
 {id:"api-football",label:"Игровые состояния",cadenceHours:0.5},
 {id:"api-football-finals",label:"Окончательные результаты",cadenceHours:4},
 {id:"api-football-live-odds",label:"Рыночные котировки",cadenceHours:2},
] as const;
export type ProviderReadiness="active"|"degraded"|"stale"|"unknown";

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
  lastRunCode:string|null;
  lastFailureStage:string|null;
  upstreamAttempted:boolean|null;
  note:string;
}
export function toSourceHealthView(input:{
 descriptor:{id:string;label:string;cadenceHours:number};
 latest:ProviderHealthSample|null;now:string;
}):SourceHealthView{
 const {descriptor,latest}=input;
 const now=Date.parse(input.now),at=latest?Date.parse(latest.checkedAt):NaN;
 const ageMinutes=latest&&Number.isFinite(at)&&Number.isFinite(now)&&at<=now
  ?Math.floor((now-at)/60000):null;
 const stale=ageMinutes!==null&&ageMinutes>Math.ceil(descriptor.cadenceHours*120+40);
 const state:ProviderReadiness=ageMinutes===null?"unknown":stale?"stale":
  latest?.status==="healthy"?"active":"degraded";
 const info=latest?.metadata??{};
 // Never forward provider message, errors, metadata, ids or quota; metrics only.
 const stored=asSafeCount(info.finishedStored??info.stored??info.quotesWritten);
 const scanned=asSafeCount(info.scannedEvents??info.upstreamFixtures??info.providerRows);
 const pending=descriptor.id==="api-football-finals"
  ?asSafeCount(info.eligibleCandidates??info.candidateCount):null;
 // Error labels are a strict, non-sensitive allowlist. Raw provider payloads,
 // bridge URLs, credentials, quota headers and arbitrary messages remain private.
 const safeCodes=new Set([
  "STORAGE_OR_PROVIDER_FAILURE","UPSTREAM_REJECTED_TARGETED_IDS",
  "MALFORMED_PROVIDER_PAYLOAD","NO_ELIGIBLE_OBSERVED_FIXTURES",
  "UPSTREAM_DAILY_QUOTA","UPSTREAM_MINUTE_QUOTA","UPSTREAM_SUBSCRIPTION",
  "UPSTREAM_AUTH","UPSTREAM_INVALID_PARAMETERS","UPSTREAM_UNCLASSIFIED",
  "QUOTA_RESERVE","LIVE_FOOTBALL_OR_STORAGE_NOT_ENABLED",
  "UPSTREAM_HTTP_400","UPSTREAM_HTTP_401","UPSTREAM_HTTP_403",
  "UPSTREAM_HTTP_404","UPSTREAM_HTTP_429","UPSTREAM_HTTP_500",
  "UPSTREAM_HTTP_502","UPSTREAM_HTTP_503","UPSTREAM_HTTP_504",
 ]);
 const candidateCode=typeof info.failureCode==="string"?info.failureCode:
  typeof info.reason==="string"?info.reason:null;
 const lastRunCode=candidateCode&&safeCodes.has(candidateCode)?candidateCode:null;
 const upstreamAttempted=typeof info.upstreamAttempted==="boolean"?info.upstreamAttempted:null;
 const validStages=new Set(["FETCH_EVENTS","FETCH_STATE_HISTORY","FETCH_UPSTREAM","PERSIST_FINALS","WRITE_PROVIDER_HEALTH"]);
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
   "Источник отклонил параметры запроса; требуется исправление интеграции.":null;
 const note=quotaHint??(state==="unknown"?"Нет подтверждённого запуска этого источника.":
  state==="stale"?"Последний запуск устарел; новые данные не подтверждены.":
  state==="degraded"?"Последний запуск сообщил об ограничении, ошибке или неполных данных.":
  descriptor.id==="api-football-finals"?
   "Проверка окончательных результатов выполнена. Положительная доходность не следует из количества FT.":
   "Последняя проверка источника прошла. Это не гарантирует полноту и секундную свежесть.");
 return{id:descriptor.id,label:descriptor.label,state,updatedAt:ageMinutes===null?null:latest!.checkedAt,
  ageMinutes,receivedRecords:stored,scannedRecords:scanned,pendingFixtureChecks:pending,
  lastRunCode,lastFailureStage,upstreamAttempted,note};
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
  {name:"Server diagnostics and provider quota never leaked",passed:!json.includes("TOP_SECRET")&&!json.includes("quotaRemaining")&&!json.includes("SHOULD_NOT_EXPOSE")&&!json.includes("private service diagnostics")},
 ];
 return{passed:checks.every(c=>c.passed),checks};
}
