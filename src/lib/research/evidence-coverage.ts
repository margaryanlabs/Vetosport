import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";

const seconds=(t:string|undefined,now:number):number|null=>{
 const at=t?Date.parse(t):NaN;
 return Number.isFinite(at)&&at<=now?Math.floor((now-at)/1000):null;
};

/** Only an explicit provider final-result ingestion, not a stale last known LIVE score. */
export function certifiedRegulationFinal(row:PersistedEventStateRecord,event:PersistedEvent):boolean{
 const state=row.state;
 return event.event.sport==="football"&&event.event.status==="finished"&&
  row.sourceProvider==="api-football"&&state.source==="api-football.fixtures.results"&&
  state.status==="finished"&&state.regulationTimeOnly===true&&
  (typeof state.providerEventId==="number"&&Number.isSafeInteger(state.providerEventId)&&state.providerEventId>0)&&
  !!state.score&&typeof state.score==="object"&&!Array.isArray(state.score)&&
  [ (state.score as {home?:unknown}).home, (state.score as {away?:unknown}).away]
   .every(s=>typeof s==="number"&&Number.isInteger(s)&&s>=0&&s<=40)&&
  Number.isFinite(Date.parse(row.capturedAt));
}

export type EvidenceStage="ready"|"blocked"|"partial";
export type EvidenceCheck={id:string;label:string;stage:EvidenceStage;detail:string};
export type EvidenceCoverage={
 model:"veto.evidence-coverage.observed-v1";
 source:"PERSISTED_ONLY";
 generatedAt:string;
 windowHours:number;
 eventsScanned:number;
 eventsWithLiveSamples:number;
 certifiedRegulationFinals:number;
 finishedStatusWithoutCertificate:number;
 eventsWithRecordedPrices:number;
 freshEventStates:number;
 freshQuotedEvents:number;
 freshScoreAndPriceEvents:number;
 researchReadyForRealMoney:false;
 externalProviderCalls:0;
 sampleMayBeCapped:boolean;
 gates:EvidenceCheck[];
 note:string;
};

export function evidenceCoverage(input:{
 events:PersistedEvent[];states:PersistedEventStateRecord[];quotes:PersistedMarketQuoteRecord[];
 at:string;windowHours?:number;sampleMayBeCapped?:boolean
}):EvidenceCoverage{
 const now=Date.parse(input.at),windowHours=input.windowHours??48;
 const events=new Map(input.events.filter(e=>e.event.sport==="football").map(e=>[e.id,e]));
 const seenLive=new Set<string>(),certificate=new Set<string>(),statusOnly=new Set<string>();
 const freshStates=new Set<string>(),quotesAvailable=new Set<string>(),freshPrices=new Set<string>();
 for(const row of input.states){
  const event=events.get(row.eventId);if(!event)continue;
  const age=seconds(row.capturedAt,now);
  if(age===null)continue;
  if(row.state.status==="live"&&row.sourceProvider==="api-football"){
    seenLive.add(row.eventId);
    if(age<=120&&event.event.status==="live")freshStates.add(row.eventId);
  }
  if(certifiedRegulationFinal(row,event))certificate.add(row.eventId);
 }
 for(const e of events.values()){
  if(e.event.status==="finished"&&!certificate.has(e.id))statusOnly.add(e.id);
 }
 for(const row of input.quotes){
  if(!events.has(row.eventId)||row.provider==="normalized"||
      !Number.isFinite(row.decimalOdds)||row.decimalOdds<=1||row.decimalOdds>1000)continue;
  const age=seconds(row.capturedAt,now);
  if(age===null)continue;
  quotesAvailable.add(row.eventId);
  const sourceAge=seconds(row.providerLastUpdate??row.capturedAt,now);
  if(!row.suspended&&age<=120&&sourceAge!==null&&sourceAge<=120&&events.get(row.eventId)?.event.status==="live"){
    freshPrices.add(row.eventId);
  }
 }
 const aligned=[...freshPrices].filter(id=>freshStates.has(id)).length;
 const count=(n:number)=>n>0?"partial" as const:"blocked" as const;
 const gates:EvidenceCheck[]=[
  {id:"live-scores",label:"Наблюдаемые матчи",
   stage:count(seenLive.size),detail:seenLive.size?
    `${seenLive.size} реальных событий имеют сохранённый игровой снимок. Источник не является секундной трансляцией.`:
    "Не найдено сохранённых живых состояний от спортивного источника."},
  {id:"finals",label:"Завершённые исходы",
   stage:count(certificate.size),detail:certificate.size?
    `${certificate.size} матчей подтверждены отдельным FT-снимком API-Football. Это ещё не проверка стратегии.`:
    "Нет отдельно подтверждённых FT-снимков: исследовательская статистика исходов пока недоступна."},
  {id:"prices",label:"Совпадающие цены и время",
   stage:count(aligned),detail:aligned?
    `${aligned} матчей имеют свежий счёт и котировку по одному каноническому событию. Линия может быть недоступна для исполнения.`:
    quotesAvailable.size?
      `Записаны цены для ${quotesAvailable.size} матчей, но нет одновременно свежей пары счёт + котировка.`:
      "Для этих наблюдаемых матчей нет сохранённых подходящих букмекерских цен."},
  {id:"independent-probability",label:"Независимая валидация модели",
   stage:"blocked",detail:"Пока нет доказанной вневыборочной калибровки и контроля множества проверенных гипотез."},
  {id:"execution",label:"Исполнение и чистый EV",
   stage:"blocked",detail:"Нет верифицированной исполнимости котировок и чистого результата после расходов."},
 ];
 return{
  model:"veto.evidence-coverage.observed-v1",source:"PERSISTED_ONLY",
  generatedAt:input.at,windowHours,eventsScanned:events.size,
  eventsWithLiveSamples:seenLive.size,certifiedRegulationFinals:certificate.size,
  finishedStatusWithoutCertificate:statusOnly.size,
  eventsWithRecordedPrices:quotesAvailable.size,freshEventStates:freshStates.size,
  freshQuotedEvents:freshPrices.size,freshScoreAndPriceEvents:aligned,
  researchReadyForRealMoney:false,externalProviderCalls:0,
  sampleMayBeCapped:Boolean(input.sampleMayBeCapped),
  gates,note:"Агрегированная диагностика на сохранённых данных. Даже полный набор снимков не доказывает положительный EV; новые платные запросы к спортивным API не выполняются.",
 };
}

export function evidenceCoverageSelfcheck(){
 const at="2026-10-13T12:00:00Z";
 const ev=(id:string,status:"live"|"finished"):PersistedEvent=>({
  id,canonicalKey:id,event:{id,sport:"football",competition:"Test",startsAt:"2026-10-13T09:00:00Z",status}
 });
 const live=(id:string):PersistedEventStateRecord=>({
  eventId:id,sourceProvider:"api-football",capturedAt:"2026-10-13T11:59:45Z",
  state:{providerEventId:10,status:"live",clock:"82′",score:{home:1,away:0}}
 });
 const final=(id:string):PersistedEventStateRecord=>({
  ...live(id),capturedAt:"2026-10-13T11:59:55Z",
  state:{providerEventId:10,source:"api-football.fixtures.results",
   status:"finished",regulationTimeOnly:true,score:{home:1,away:0}}
 });
 const quote:PersistedMarketQuoteRecord={eventId:"a",provider:"api-football-live-odds",
  bookmaker:"No bookmaker",marketKey:"total",selectionKey:"under-4.5",
  selectionLabel:"Under 4.5",decimalOdds:1.7,capturedAt:"2026-10-13T11:59:45Z",suspended:false};
 const input={events:[ev("a","live"),ev("b","finished")],states:[live("a"),live("b"),final("b")],quotes:[quote],at};
 const r=evidenceCoverage(input);
 const checks=[
  {name:"Distinct certified FT counted exactly once",passed:r.certifiedRegulationFinals===1},
  {name:"Fresh price plus independent live score share canonical event",passed:r.freshScoreAndPriceEvents===1},
  {name:"Final status alone does not certify outcome",passed:evidenceCoverage({...input,states:[live("a"),live("b")]}).certifiedRegulationFinals===0},
  {name:"Untrusted source cannot certify outcome",passed:!certifiedRegulationFinal({...final("b"),sourceProvider:"other"},ev("b","finished"))},
  {name:"Missing regulation marker rejects final",passed:!certifiedRegulationFinal({...final("b"),state:{...final("b").state,regulationTimeOnly:false}},ev("b","finished"))},
  {name:"Stale price cannot create aligned pair",passed:evidenceCoverage({...input,quotes:[{...quote,capturedAt:"2026-10-13T11:30:00Z"}]}).freshScoreAndPriceEvents===0},
  {name:"Suspension rejects active price",passed:evidenceCoverage({...input,quotes:[{...quote,suspended:true}]}).freshScoreAndPriceEvents===0},
  {name:"Future provider time rejected",passed:evidenceCoverage({...input,quotes:[{...quote,providerLastUpdate:"2026-10-13T12:05:00Z"}]}).freshScoreAndPriceEvents===0},
  {name:"No real-money edge ever minted by observational coverage",passed:r.researchReadyForRealMoney===false},
  {name:"No external API requests in coverage",passed:r.externalProviderCalls===0},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
