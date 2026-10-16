import {captureLagSpectrum} from "@/lib/research/capture-lag-spectrum";
import {buildHistoricalObservationLedger,historicalObservationLedgerSelfcheck} from "@/lib/research/historical-observation-ledger";
import {historicalTimingEvidence,historicalCoCaptureSelfcheck,CO_CAPTURE_WINDOW_SECONDS} from "@/lib/research/historical-co-capture";
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
 historicalScoreAndPriceCoCapturedEvents:number;
 historicalCausallyAlignedEvents:number;
 historicalLookaheadOnlyEvents:number;
 historicalCausalIsNotExecution:true;
 captureLag:ReturnType<typeof captureLagSpectrum>;
 observationLedger:ReturnType<typeof buildHistoricalObservationLedger>;
 historicalCoCaptureWindowSeconds:120;
 historicalPairsAreNotLiveSignals:true;
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
 // Diagnostic co-capture needs chronological timestamps, not merely two
 // independently fresh sources attached to the same event.
 const freshStateTimes=new Map<string,number[]>();
 const freshPriceTimes=new Map<string,number[]>();
 for(const row of input.states){
  const event=events.get(row.eventId);if(!event)continue;
  const age=seconds(row.capturedAt,now);
  if(age===null)continue;
  if(row.state.status==="live"&&row.sourceProvider==="api-football"){
    seenLive.add(row.eventId);
    if(age<=120&&event.event.status==="live"){
     freshStates.add(row.eventId);
     const at=Date.parse(row.capturedAt);
     const times=freshStateTimes.get(row.eventId)??[];
     times.push(at);freshStateTimes.set(row.eventId,times);
    }
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
  const sourceTime=row.providerLastUpdate?Date.parse(row.providerLastUpdate):NaN;
  const quoteTime=Date.parse(row.capturedAt);
  if(!row.suspended&&age<=120&&sourceAge!==null&&sourceAge<=120&&
    (!row.providerLastUpdate||(Number.isFinite(sourceTime)&&sourceTime<=quoteTime))&&
    events.get(row.eventId)?.event.status==="live"){
    freshPrices.add(row.eventId);
    const times=freshPriceTimes.get(row.eventId)??[];
    times.push(quoteTime);freshPriceTimes.set(row.eventId,times);
  }
 }
 const aligned=[...freshPriceTimes].filter(([id,quotes])=>{
  const states=freshStateTimes.get(id)??[];
  // A later score cannot make an earlier market a legitimate input.
  // 120 seconds is an observation diagnostic, not proof of execution.
  return quotes.some(q=>states.some(st=>st<=q&&q-st<=120_000));
 }).length;
 const chronology=historicalTimingEvidence({events:[...events.values()],states:input.states,quotes:input.quotes,asOf:input.at});
 const historicalCoCaptured=chronology.observedWithin2m;
 const captureLag=captureLagSpectrum({events:[...events.values()],states:input.states,quotes:input.quotes,asOf:input.at});
 const observationLedger=buildHistoricalObservationLedger({events:[...events.values()],states:input.states,quotes:input.quotes,asOf:input.at});
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
    `${aligned} матчей имеют счёт, записанный до близкой по времени цены. Часы источников и исполнение ещё не подтверждены.`:
    quotesAvailable.size?
      `Записаны цены для ${quotesAvailable.size} матчей, но нет одновременно свежей пары счёт + котировка.`:
      "Для этих наблюдаемых матчей нет сохранённых подходящих букмекерских цен."},
  {id:"historical-capture",label:"Исторические пары: счёт + цена",
   stage:count(historicalCoCaptured),detail:historicalCoCaptured?
    `${historicalCoCaptured} матчей имеют близкие по времени снимки. Из них ${chronology.lookaheadOnlyWithin2m} — только со счётом, записанным ПОСЛЕ цены. Такие пары нельзя использовать как вход для прогнозного бэктеста.`:
    "В выбранной сохранённой выборке нет совместных исторических снимков счёта и неприостановленной цены в пределах двух минут."},
  {id:"causal-ordering",label:"Хронологическая честность анализа",
   stage:count(chronology.causallyAlignedWithin2m),
   detail:chronology.causallyAlignedWithin2m?
    `${chronology.causallyAlignedWithin2m} матчей имеют счёт, записанный не позже цены (≤2 минуты); доступность ставок и независимость часов источников НЕ подтверждены.`:
    historicalCoCaptured?
     `Из ${historicalCoCaptured} близких пар ни одна не содержит сохранённого счёта ДО цены. Эти снимки нельзя использовать для ретроспективного принятия решений без будущей информации.`:
     "Не найдено хронологически допустимых пар счёт → котировка."},
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
  historicalScoreAndPriceCoCapturedEvents:historicalCoCaptured,
  historicalCausallyAlignedEvents:chronology.causallyAlignedWithin2m,
  historicalLookaheadOnlyEvents:chronology.lookaheadOnlyWithin2m,
  historicalCausalIsNotExecution:true,
  captureLag,observationLedger,
  historicalCoCaptureWindowSeconds:120,historicalPairsAreNotLiveSignals:true,
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
 const historicalSelfcheck=historicalCoCaptureSelfcheck();
 const ledgerSelfcheck=historicalObservationLedgerSelfcheck();
 const checks=[
  {name:"Historical observation tests fail closed",passed:historicalSelfcheck.passed},
  {name:"Inspectable sample ledger never treats future score as current evidence",passed:ledgerSelfcheck.passed},
  {name:"Co-capture is not promoted to currently fresh evidence",passed:r.historicalScoreAndPriceCoCapturedEvents===1&&r.historicalPairsAreNotLiveSignals===true},
  {name:"Causal observation counts separate from look-ahead-only counts",
   passed:r.historicalCausallyAlignedEvents===1&&r.historicalLookaheadOnlyEvents===0&&
     r.historicalCausalIsNotExecution===true},
  {name:"Future score recorded after price cannot count as causal historical prediction input",
   passed:(()=>{
     const after=evidenceCoverage({...input,states:[{...live("a"),capturedAt:"2026-10-13T12:00:00Z"}]});
     // Quote was observed 15 seconds BEFORE score: bidirectional proximity
     // exists but must never imply this score was available when priced.
     return after.historicalCausallyAlignedEvents===0&&after.historicalLookaheadOnlyEvents===1;
   })()},
  {name:"Distinct certified FT counted exactly once",passed:r.certifiedRegulationFinals===1},
  {name:"Fresh price plus independent live score share canonical event",passed:r.freshScoreAndPriceEvents===1},
  {name:"Final status alone does not certify outcome",passed:evidenceCoverage({...input,states:[live("a"),live("b")]}).certifiedRegulationFinals===0},
  {name:"Untrusted source cannot certify outcome",passed:!certifiedRegulationFinal({...final("b"),sourceProvider:"other"},ev("b","finished"))},
  {name:"Missing regulation marker rejects final",passed:!certifiedRegulationFinal({...final("b"),state:{...final("b").state,regulationTimeOnly:false}},ev("b","finished"))},
  {name:"Stale price cannot create aligned pair",passed:evidenceCoverage({...input,quotes:[{...quote,capturedAt:"2026-10-13T11:30:00Z"}]}).freshScoreAndPriceEvents===0},
  {name:"Suspension rejects active price",passed:evidenceCoverage({...input,quotes:[{...quote,suspended:true}]}).freshScoreAndPriceEvents===0},
  {name:"Future provider time rejected",passed:evidenceCoverage({...input,quotes:[{...quote,providerLastUpdate:"2026-10-13T12:05:00Z"}]}).freshScoreAndPriceEvents===0},
  {name:"Two independently fresh snapshots are not a causal pair when quote comes first",
   passed:(()=>{
    const futureScore={...live("a"),capturedAt:"2026-10-13T11:59:55Z"};
    const result=evidenceCoverage({...input,states:[futureScore,live("b"),final("b")]});
    return result.freshEventStates===1&&result.freshQuotedEvents===1&&
     result.freshScoreAndPriceEvents===0;
   })()},
  {name:"Valid ordered score followed by a quote remains a fresh observed pair",
   passed:evidenceCoverage({...input,quotes:[{...quote,capturedAt:"2026-10-13T11:59:55Z"}]}).freshScoreAndPriceEvents===1},
  {name:"No real-money edge ever minted by observational coverage",passed:r.researchReadyForRealMoney===false},
  {name:"No external API requests in coverage",passed:r.externalProviderCalls===0},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
