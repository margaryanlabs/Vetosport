"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";

type PaperTicket={
 id:string;eventId:string;eventStartsAt:string;match:string;competition:string;
 contract:string;selectionKey:string;marketKey:string;odds:number;modelProbability:number;
 modelVersion:string;quoteProvider:string;bookmaker:string;quoteAt:string;
 pickedAt:string;modelAt:string|null;lane?:"LIVE_OBSERVED"|"PREMATCH_ODDS_CONTROL";
 settlement:{result:"WIN"|"LOSS";score:{home:number;away:number};finalAt:string;settledAt:string}|null;
};
type PaperResponse={ok:boolean;generatedAt?:string;account?:{tickets:PaperTicket[];count:number}};
type Pattern={id:string;label:string;family:string;observations:number;settled:number;wins:number;
 holdoutCount:number;holdoutHitRate:number|null;hitRate:number|null;
 status:"NEEDS_FINAL_RESULTS"|"EXPLORATORY"|"HOLDOUT_PENDING";verifiedOddsCount:number;validatedEdge:boolean};
type LiveHypothesis={
 id:string;eventId:string;match:string;competition:string;observedAt:string;
 minute:number;score:{home:number;away:number};hypothesisId:string;hypothesisLabel:string;
 settled:number;hitRate:number|null;holdoutCount:number;holdoutHitRate:number|null;
 stage:"SOURCE_OBSERVATION"|"INDICATIVE_PAPER_ONLY";validatedEdge:false;
 executablePriceVerified:false;researchOnly:true;
 quote:null|{provider:string;bookmaker:string;odds:number;capturedAt:string;contract:string};
 reasons:string[];
};
type DiscoveryResponse={source:string;generatedAt:string;hypothesesScreened:number;validatedEdgeCount:number;
 patterns:Pattern[];liveMatches?:LiveHypothesis[];matchCoverage?:{scannedLiveEvents:number;quoteReadFailed:boolean;matched:number};fetchCoverage?:{windowMayBeCapped:boolean}};
type RadarRow={id:string;status:"PAPER"|"WATCH"|"PASS";scenario:string;
 event:{homeName:string;awayName:string;clock:string;homeScore:string;awayScore:string;lastUpdatedAt?:string};
 evidence:{freshScore:boolean;verifiedQuote:boolean;independentProbability:false;executionVerified:false};
 reasons:string[];quote?:{decimalOdds:number;capturedAt:string}};
type RadarResponse={generatedAt:string;source:string;rows:RadarRow[]};
type ShadowRow={id:string;eventId:string;competition:string;match:string;marketKey:string;selectionKey:string;
 modelProbability:number;modelFairOdds:number;modelVersion:string;predictionAt:string;stateAt:string;
 modelBasis?:"FIXED_UNCALIBRATED_GOAL_PRIORS"|"SOURCE_ALIGNED_QUOTE_RESEARCH";
 bookmakerQuoteRequired?:boolean;independentCalibrationVerified?:false;
 stage:"UNVALIDATED_SHADOW_FORECAST"};
type ShadowResponse={ok:boolean;source:string;asOf:string;rows:ShadowRow[];decisionAuthority:false};
type MarketAnomaly={id:string;eventId:string;match:string;competition:string;marketKey:string;
 selectionKey:string;line:number|null;provider:string;medianOdds:number;highestObservedOdds:number;
 highestBookmaker:string;deviationPct:number;bookmakerCount:number;lastCapturedAt:string;
 classification:"PRICE_DISPERSION_RESEARCH";validatedEdge:false;executionVerified:false;researchOnly:true};
type AnomalyResponse={ok:boolean;source:string;asOf:string;rows:MarketAnomaly[];quotesCapped?:boolean;scanMayBeCapped?:boolean};
type ModelSummary={samples:number;fixtures:number;wins:number;
 brier:number|null;logLoss:number|null;meanProbability:number|null;observedFrequency:number|null};
type ModelProofCohort={modelVersion:string;latestAt:string;total:ModelSummary;train:ModelSummary;holdout:ModelSummary;
 trainBaselineProbability:number|null;holdoutBaselineBrier:number|null;holdoutBrierSkillVsTrainBaseline:number|null;
 holdoutCountSufficient:boolean;historicalEdgeValidated:false;
 reliabilityBins:Array<{min:number;max:number;count:number;forecastMean:number;observedFrequency:number}>};
type ModelProofRow={id:string;eventId:string;match:string;competition:string;modelVersion:string;
 marketKey:string;selectionKey:string;capturedAt:string;startsAt:string;finalAt:string;
 finalScore:{home:number;away:number};probability:number;outcome:0|1;source:string};
type ModelProof={ok:boolean;source:string;selected:ModelProofCohort|null;selectedModelVersion:string|null;
 recent:ModelProofRow[];cohorts:ModelProofCohort[];
 coverage:{eventsScanned:number;eventsWithFt:number;predictionRowsRead:number;verifiedSamples:number;
 scanMayBeCapped:boolean;sampleMayBeCapped:boolean};
 profitableStrategyVerified:false;historicalEdgeValidated:false;lookbackDays:number};
type BundesligaModelRow={id:string;match:string;startsAt:string;forecastAt:string;
 modelVersion:string;probability:{home:number;draw:number;away:number};
 trainingSource:"OPENLIGADB_COMMUNITY";stage:"UNCALIBRATED_SHADOW_PREMATCH";
 bookmakerPriceVerified:false;licensedLiveClock:false;independentFtCertified:false;
 profitabilityValidated:false};
type BundesligaModelResponse={ok:boolean;source:string;asOf:string;
 rows:BundesligaModelRow[];scanMayBeCapped:boolean;fixturesScanned:number;
 bookmakerProviderCalls:0;licensedLiveClock:false;independentFtCertified:false};
type MarketReference={eventId:string;match:string;competition:string;startsAt:string;
 sampleAt:string;latestSourceAt:string;bookmakers:number;source:"PERSISTED_THE_ODDS_API";
 probability:{home:number;draw:number;away:number};
 minMax:{home:[number,number];draw:[number,number];away:[number,number]};
 overroundPct:{min:number;max:number;median:number};freshestBookmakers:string[];
 confidence:"MARKET_REFERENCE_ONLY";independentVetoModel:false;
 executablePriceVerified:false;profitabilityVerified:false};
type MarketReferenceResponse={ok:boolean;source:string;asOf:string;rows:MarketReference[];
 quotesScanned:number;fixturesScanned:number;eventsCapped:boolean;quotesCapped:boolean;independentModel:false};
type LockedControlRow={pickId:string;eventId:string;match:string;competition:string;
 startsAt:string;recordedAt:string;quoteAt:string;bookmaker:string;
 selection:string;probability:number;odds:number;
 status:"VERIFIED_FT"|"WAITING_FOR_FT"|"FT_CERTIFIED_BUT_PAPER_NOT_SETTLED";
 outcome:0|1|null;score:{home:number;away:number}|null;source:string|null;
 brier:number|null;logLoss:number|null;virtualProfit:number|null};
type LockedControlProof={ok:true;source:"PERSISTED_ONLY";rows:LockedControlRow[];
 coverage:{picksRead:number;eligibleLockedFixtures:number;sourceCertified:number;
 verifiedSettlements:number;unreconciledFinals:number;unresolved:number;
 picksMayBeCapped:boolean;eventReadsMayBeCapped:boolean;stateReadsMayBeCapped:boolean};
 quality:{samples:number;wins:number;losses:number;meanProbability:number|null;
 observedFrequency:number|null;brier:number|null;logLoss:number|null;
 virtualNet:number;virtualStake:number;virtualYieldPct:number|null;
 sufficientForCalibration:boolean;independentModel:false;
 executionVerified:false;profitabilityVerified:false};
 reliability:Array<{from:number;to:number;count:number;forecastMean:number;observedFrequency:number}>;
 externalProviderCalls:0;realMoneyBets:0};
type OperationalSource={id:string;label:string;state:"active"|"empty"|"waiting"|"degraded"|"stale"|"unknown";
 updatedAt:string|null;lastRunCode:string|null;ageMinutes:number|null;note:string};
type OperationalFeed={source:"PERSISTED_ONLY"|"PERSISTED_AND_SAFE_RUNTIME_CONFIG";secretsExposed?:boolean;providers:OperationalSource[]};
type Status="loading"|"ready"|"error";
type PredictionTab="all"|"open"|"settled";
const number=(n:number,digits=1)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(n);
const time=(value:string|null|undefined)=>value&&Number.isFinite(Date.parse(value))?
 new Date(value).toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"нет времени";
const percent=(p:number|null)=>p!==null&&Number.isFinite(p)?number(p*100)+"%":"—";
const contractLabel=(value:string,selection:string)=>{
 if(value==="FT_HOME")return "Победа хозяев";
 if(value==="FT_AWAY")return "Победа гостей";
 if(value==="FT_DRAW")return "Ничья";
 if(value==="FT_BTTS_YES")return "Обе забьют — да";
 if(value==="FT_BTTS_NO")return "Обе забьют — нет";
 const total=value.match(/^FT_TOTAL_(OVER|UNDER)_([1-4])_5$/);
 if(total)return (total[1]==="OVER"?"Тотал больше ":"Тотал меньше ")+total[2]+".5";
 return selection;
};
const isIndependent=(ticket:PaperTicket)=>typeof ticket.modelVersion==="string"&&ticket.modelVersion!=="QUOTE_IMPLIED_CONTROL_V1"&&
 ticket.lane!=="PREMATCH_ODDS_CONTROL"&&ticket.modelVersion.trim().length>0&&
 Number.isFinite(ticket.modelProbability)&&ticket.modelProbability>0&&ticket.modelProbability<1&&
 Number.isFinite(ticket.odds)&&ticket.odds>1;
const patternStage=(item:Pattern)=>item.status==="NEEDS_FINAL_RESULTS"?"ЖДЁМ ФИНАЛЫ":
 item.status==="HOLDOUT_PENDING"?"МАЛО НЕЗАВИСИМОЙ ИСТОРИИ":"ИССЛЕДУЕМ / НЕ ДОКАЗАНО";

export function PredictionsConsole(){
 const [paper,setPaper]=useState<PaperResponse|null>(null);
 const [discovery,setDiscovery]=useState<DiscoveryResponse|null>(null);
 const [radar,setRadar]=useState<RadarResponse|null>(null);
 const [shadow,setShadow]=useState<ShadowResponse|null>(null);
 const [anomalies,setAnomalies]=useState<AnomalyResponse|null>(null);
 const [proof,setProof]=useState<ModelProof|null>(null);
 const [sourceHealth,setSourceHealth]=useState<OperationalFeed|null>(null);
 const [benchmark,setBenchmark]=useState<MarketReferenceResponse|null>(null);
 const [bundesliga,setBundesliga]=useState<BundesligaModelResponse|null>(null);
 const [controlProof,setControlProof]=useState<LockedControlProof|null>(null);
 const [statuses,setStatuses]=useState<Record<string,Status>>({paper:"loading",discovery:"loading",radar:"loading",shadow:"loading",anomalies:"loading",proof:"loading",sources:"loading",benchmark:"loading",bundesliga:"loading",controlProof:"loading"});
 const [tab,setTab]=useState<PredictionTab>("all");
 const [cycle,setCycle]=useState(0);
 const [now,setNow]=useState(0);

 const refresh=useCallback(()=>setCycle(c=>c+1),[]);
 useEffect(()=>{
  const clock=()=>setNow(Date.now());
  clock();
  const timer=setInterval(clock,30000);
  return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{
  let alive=true;
  const sources=[
   {key:"paper",url:"/api/intelligence/paper-journal/daily"},
   {key:"discovery",url:"/api/intelligence/research/discovery"},
   {key:"radar",url:"/api/intelligence/research/opportunity-radar"},
   {key:"shadow",url:"/api/intelligence/predictions/shadow"},
   {key:"benchmark",url:"/api/intelligence/predictions/market-reference"},
   {key:"bundesliga",url:"/api/intelligence/predictions/bundesliga-prematch"},
   {key:"controlProof",url:"/api/intelligence/predictions/market-proof"},
   {key:"anomalies",url:"/api/intelligence/predictions/anomalies"},
   {key:"proof",url:"/api/intelligence/predictions/validation"},
   {key:"sources",url:"/api/intelligence/research/source-health"},
  ] as const;
  const update=(key:string,status:Status)=>{if(alive)setStatuses(old=>({...old,[key]:status}));};
  sources.forEach(({key,url})=>{
   update(key,"loading");
   void fetch(url,{cache:"no-store"})
    .then(async response=>{if(!response.ok)throw Error("SOURCE_UNAVAILABLE");return response.json();})
    .then((value:unknown)=>{
     if(!alive)return;
     if(key==="controlProof"){
      const item=value as LockedControlProof;
      if(item.ok!==true||item.source!=="PERSISTED_ONLY"||!Array.isArray(item.rows)||
       !item.quality||item.quality.independentModel!==false||
       item.quality.profitabilityVerified!==false||item.quality.executionVerified!==false||
       item.externalProviderCalls!==0||item.realMoneyBets!==0)
       throw Error("FORWARD_CONTROL_PROOF_INVALID");
      setControlProof(item);
    }else if(key==="bundesliga"){
      const item=value as BundesligaModelResponse;
      if(item.ok!==true||item.source!=="PERSISTED_ONLY"||!Array.isArray(item.rows)||
        item.licensedLiveClock!==false||item.independentFtCertified!==false||
        item.bookmakerProviderCalls!==0||item.rows.some(x=>
         x.trainingSource!=="OPENLIGADB_COMMUNITY"||
         x.stage!=="UNCALIBRATED_SHADOW_PREMATCH"||
         x.bookmakerPriceVerified!==false||x.profitabilityValidated!==false))
       throw Error("BUNDESLIGA_PREMATCH_INVALID");
      setBundesliga(item);
    }else if(key==="benchmark"){
      const item=value as MarketReferenceResponse;
      if(item.ok!==true||item.source!=="PERSISTED_ONLY"||
       !Array.isArray(item.rows)||item.independentModel!==false||
       item.rows.some(x=>x.independentVetoModel!==false||
        x.executablePriceVerified!==false||x.profitabilityVerified!==false))
       throw Error("MARKET_REFERENCE_INVALID");
      setBenchmark(item);
    }else if(key==="sources"){
      const item=value as OperationalFeed;
      if(!["PERSISTED_ONLY","PERSISTED_AND_SAFE_RUNTIME_CONFIG"].includes(item.source)||
       !Array.isArray(item.providers)||item.secretsExposed===true)throw Error("SOURCE_HEALTH_INVALID");
      setSourceHealth(item);
    }else if(key==="paper"){
      const item=value as PaperResponse;
      if(item.ok!==true||!Array.isArray(item.account?.tickets))throw Error("PAPER_INVALID");
      setPaper(item);
     }else if(key==="discovery"){
      const item=value as DiscoveryResponse;
      if(item.source!=="PERSISTED_ONLY"||!Array.isArray(item.patterns))throw Error("DISCOVERY_INVALID");
      setDiscovery(item);
     }else if(key==="proof"){
      const item=value as ModelProof;
      if(item.ok!==true||item.source!=="PERSISTED_ONLY"||!Array.isArray(item.recent)||
       !item.coverage||item.profitableStrategyVerified!==false||item.historicalEdgeValidated!==false)
       throw Error("MODEL_PROOF_INVALID");
      setProof(item);
    }else if(key==="anomalies"){
      const item=value as AnomalyResponse;
      if(item.ok!==true||item.source!=="PERSISTED_ONLY"||!Array.isArray(item.rows))throw Error("ANOMALIES_INVALID");
      setAnomalies(item);
    }else if(key==="shadow"){
      const item=value as ShadowResponse;
      if(item.ok!==true||item.source!=="PERSISTED_ONLY"||!Array.isArray(item.rows)||item.decisionAuthority!==false)throw Error("SHADOW_INVALID");
      setShadow(item);
    }else{
      const item=value as RadarResponse;
      if(item.source!=="PERSISTED_ONLY"||!Array.isArray(item.rows))throw Error("RADAR_INVALID");
      setRadar(item);
     }
     update(key,"ready");
    }).catch(()=>{
     if(!alive)return;
     if(key==="paper")setPaper(null);
     if(key==="discovery")setDiscovery(null);
     if(key==="radar")setRadar(null);
     if(key==="shadow")setShadow(null);
     if(key==="anomalies")setAnomalies(null);
     if(key==="proof")setProof(null);
     if(key==="sources")setSourceHealth(null);
     if(key==="benchmark")setBenchmark(null);
     if(key==="bundesliga")setBundesliga(null);
     if(key==="controlProof")setControlProof(null);
     update(key,"error");
    });
  });
  return()=>{alive=false};
 },[cycle]);

 const tickets=useMemo(()=>paper?.account?.tickets.filter(isIndependent)
  .sort((a,b)=>Date.parse(b.pickedAt)-Date.parse(a.pickedAt))??[],[paper]);
 const controlCount=paper?.account?.tickets.filter(x=>!isIndependent(x)).length??0;
 const open=tickets.filter(t=>!t.settlement);
 const settled=tickets.filter(t=>Boolean(t.settlement));
 const shown=tickets.filter(t=>tab==="all"||tab==="open"&&!t.settlement||tab==="settled"&&Boolean(t.settlement)).slice(0,40);
 const radarCases=(radar?.rows??[]).filter(x=>x.status!=="PASS"&&x.scenario==="UNDER_4_5_LATE_1_1");
 const liveHypotheses=(discovery?.liveMatches??[]).filter(x=>now>0&&Number.isFinite(Date.parse(x.observedAt))&&
  Date.parse(x.observedAt)<=now&&now-Date.parse(x.observedAt)<=120_000);
 const stats=[
  {name:"ПРЕДМАТЧЕВЫХ МОДЕЛЕЙ",value:statuses.bundesliga==="ready"?String(bundesliga?.rows.length??0):"—",detail:"История Бундеслиги · без коэффициентов"},
  {name:"РЫНОЧНЫХ ОРИЕНТИРОВ",value:statuses.benchmark==="ready"?String(benchmark?.rows.length??0):"—",detail:"Без маржи, НЕ независимая модель"},
  {name:"АНОМАЛИЙ КОТИРОВОК",value:statuses.anomalies==="ready"?String(anomalies?.rows.length??0):"—",detail:"Необычный разброс цен, не EDGE"},
  {name:"СВЕЖИХ МОДЕЛЬНЫХ ОЦЕНОК",value:statuses.shadow==="ready"?String(shadow?.rows.length??0):"—",detail:"Shadow-модель на реальных событиях"},
  {name:"ПРОГНОЗОВ МОДЕЛИ",value:statuses.paper==="ready"?String(tickets.length):"—",detail:"Записаны заранее, независимая модель"},
  {name:"ОЖИДАЮТ ИСХОДА",value:statuses.paper==="ready"?String(open.length):"—",detail:"Результат пока не подтверждён"},
  {name:"ПРОВЕРЕНЫ ПО FT",value:statuses.paper==="ready"?String(settled.length):"—",detail:"Отдельное доказательство финального счёта"},
  {name:"ГИПОТЕЗ ИССЛЕДУЕТСЯ",value:statuses.discovery==="ready"?String(discovery?.hypothesesScreened??0):"—",detail:"Не равны готовым прогнозам"},
 ];
 return <main className="predRoot">
  <header className="predNav">
   <Link href="/" className="predBrand">VETO <em>SPORT</em><small>/ INTELLIGENCE</small></Link>
   <div><Link href="/research/watchlist">Live Radar ↗</Link><Link href="/research/discovery">Discovery ↗</Link><Link href="/research/paper-lab">Paper Lab ↗</Link></div>
  </header>
  <section className="predHero">
   <div className="predEyebrow"><i/> VETO INTELLIGENCE / CENTRAL PREDICTION FEED</div>
   <h1>Прогнозы.<br/><em>Гипотезы. Аномалии.</em></h1>
   <p>Здесь — не список популярных ставок и не подборка высоких коэффициентов.
    Только заранее зафиксированные прогнозы моделей VETO на реальные события,
    наблюдаемые ситуации и исследуемые закономерности. Каждый вывод можно проверить после матча.</p>
   <div className="predHeroActions"><a href="#predNow">Прогнозы VETO ↓</a><a href="#predBundesliga">Бундеслига · модель ↓</a><a href="#predBenchmark">Контроль рынка ↓</a><a href="#predControlProof">Проверенные результаты ↓</a><a href="#predLinked">Совпадения гипотез ↓</a><a href="#predAnomalies">Аномалии и радар ↓</a><a href="#predProof">Проверка моделей ↓</a></div>
  </section>
  <section className="predStats" aria-label="Состояние исследований">
   {stats.map(s=><article key={s.name}><span>{s.name}</span><strong>{s.value}</strong><small>{s.detail}</small></article>)}
  </section>
  <div className="predEvidenceBanner">
   <div><strong>REAL SOURCE ≠ VERIFIED EDGE</strong><p>Прогноз может относиться к настоящему матчу и быть записан до исхода, но это не делает его доказанно прибыльным.
    Независимые модели пока проходят бумажную проверку. Контрольные цены букмекера не называем прогнозами VETO.</p></div>
   <button type="button" onClick={refresh}>Обновить из источников ↻</button>
  </div>
  <section className="predSection predReadiness" id="predReadiness">
   <div className="predSectionHead"><div><span>DATA PLANE / LIVE OPERATIONAL READINESS</span>
    <h2>Почему прогнозы могут отсутствовать?</h2>
    <p>Показываем состояние реальных источников. Выдавать статистическую гипотезу за прогноз без свежего
      матча и независимого результата нельзя. Диагностика использует сохранённую историю — без платных вызовов API.</p></div></div>
   {statuses.sources!=="ready"?<div className="predEmpty">
    {statuses.sources==="error"?"Нет доступа к проверенному состоянию источников.":"Проверяем источники и последние запуски…"}</div>:
    <div className="predReadinessGrid">
     {(sourceHealth?.providers??[]).map(s=><article key={s.id}>
      <header><span>{s.label}</span><b className={"source-"+s.state}>{s.state==="active"?"РАБОТАЕТ":
       s.state==="stale"?"УСТАРЕЛ":s.state==="waiting"?"ОЖИДАНИЕ":
       s.state==="degraded"?"ОГРАНИЧЕНИЕ":s.state==="empty"?"НЕТ ДАННЫХ":"НЕИЗВЕСТНО"}</b></header>
      <p>{s.note}</p><small>{s.updatedAt?"Последняя запись: "+time(s.updatedAt):"Последний успешный запуск неизвестен."}</small>
      {s.lastRunCode==="SPORTMONKS_NOT_CONFIGURED"&&<strong className="predReadinessProblem">
         Не подключён ключ Sportmonks. В Vercel → vetosport → Settings → Environment Variables
         добавьте SPORTMONKS_API_TOKEN для Production, затем проверьте разрешённые лиги и live-доступ.
         Без ключа сервер не обращается к Sportmonks.</strong>}
      {s.lastRunCode==="UPSTREAM_SUBSCRIPTION"&&<strong className="predReadinessProblem">Нужен доступ провайдера к подтверждению FT.
         Это нельзя исправить формулой прогноза.</strong>}
     </article>)}
     {(sourceHealth?.providers.length??0)===0&&<div className="predEmpty">Пока нет проверенной истории запусков источников.</div>}
    </div>}
  </section>
  <section className="predSection" id="predNow">
   <div className="predSectionHead"><div><span>01 / REAL-TIME MODEL SURFACE</span><h2>Оперативные оценки VETO</h2>
    <p>Модель рассчитывает вероятности непосредственно по реальному счёту и времени матча — даже когда
      букмекерские коэффициенты недоступны. Сначала используем явно фиксированные голевые допущения,
      не проверенную силу конкретных команд. Без калибровки это исследовательские оценки, а не ставки.</p></div></div>
   {statuses.shadow!=="ready"?<div className="predEmpty" role="status">
    {statuses.shadow==="error"?"Сохранённые прогнозы shadow-модели недоступны.":"Проверяем последние расчёты модели…"}</div>:
    (shadow?.rows.length??0)===0?<div className="predEmpty"><b>В актуальном окне нет свежих прогнозов shadow-модели.</b>
     <p>Алгоритм не должен изображать активный прогноз, когда матч, расчёт или состояние источника устарели.
        Проверить, почему модель ничего не выпустила, можно в состоянии данных и журнале исследований.</p>
     <Link href="/research/discovery">Диагностика исследований ↗</Link></div>:
    <div className="predForecastGrid">{shadow!.rows.slice(0,14).map(x=><article className="predForecast" key={x.id}>
     <header><span>{x.modelBasis==="FIXED_UNCALIBRATED_GOAL_PRIORS"?
      "REAL SCORE + CLOCK / PRIOR MODEL":"REAL MATCH / SHADOW MODEL"}</span>
      <b className="pending">НЕ КАЛИБРОВАНО</b></header>
     <small>{x.competition} · расчёт {time(x.predictionAt)}</small>
     <h3>{x.match}</h3><p className="predOutcome">{contractLabel(x.marketKey==="football.1x2"?
      x.selectionKey==="home"?"FT_HOME":x.selectionKey==="away"?"FT_AWAY":"FT_DRAW":
      "",x.marketKey+" · "+x.selectionKey)}</p>
     <div className="predNumbers"><div><small>ОЦЕНКА МОДЕЛИ</small><strong>{percent(x.modelProbability)}</strong></div>
      <div><small>МОДЕЛЬНЫЙ FAIR KF</small><strong>{number(x.modelFairOdds,2)}</strong></div>
      <div><small>ЦЕНА БУКМЕКЕРА</small><strong className="predShadowUnquoted">НЕ ПРОВЕРЕНА</strong></div></div>
     <div className="predForecastProvenance"><span>Источник: сохранённый матч · {time(x.stateAt)}</span>
      <span>Модель: {x.modelVersion} · {time(x.predictionAt)}</span>
      {x.modelBasis==="FIXED_UNCALIBRATED_GOAL_PRIORS"?
       <span>Основа: наблюдаемый счёт + время, 1,35 / 1,15 гола на матч — фиксированные
         допущения. НЕ характеристики команд и НЕ прогноз с независимой калибровкой.</span>:
       <span>Требуется связь с сохранёнными рынками; цены не подтверждают прибыльность модели.</span>}
      <span>Статус: только SHADOW / исследование. Котировка и прибыльность не подтверждены.</span></div>
     <footer><small>Вероятности пока условны: реальный матч ≠ доказанная точность или ценовое преимущество.</small>
      <Link href={"/?view=check&event="+encodeURIComponent(x.eventId)}>Разобрать ↗</Link></footer>
    </article>)}</div>}
  </section>
  <section className="predSection predBundesligaSection" id="predBundesliga">
   <div className="predSectionHead"><div>
    <span>INDEPENDENT PREMATCH RESEARCH / FREE COMMUNITY HISTORY</span>
    <h2>VETO Bundesliga · независимая предматчевая модель</h2>
    <p>Отдельная Poisson-модель оценивает исходы матчей чемпионата Германии, используя
     <b> результаты прошедших матчей и статистику конкретных команд</b> из OpenLigaDB.
     Не использует котировки букмекеров или выдуманный LIVE-таймер. Это первая исследовательская версия —
     <b> без независимой калибровки и доказанной прибыльности</b>.</p>
   </div><a className="predLink" href="/api/intelligence/research/bundesliga-model/selfcheck" target="_blank" rel="noopener noreferrer">Проверить модель ↗</a></div>
   {statuses.bundesliga!=="ready"?<div className="predEmpty" role="status">
    {statuses.bundesliga==="error"?"История предматчевых моделей пока недоступна.":
     "Проверяем настоящие сохранённые прогнозы Бундеслиги…"}</div>:
    !bundesliga?.rows.length?<div className="predEmpty">
     <b>Сейчас нет записанных предматчевых оценок с достаточной историей.</b>
     <p>Первый автоматический цикл анализирует прошлый и текущий сезоны немецкой Бундеслиги.
      Прогнозы появляются только до начала матча и только когда каждая команда имеет достаточный
      объём подтверждённой истории. У сообщества OpenLigaDB нет гарантированного секундного LIVE-времени.</p>
     <p>Найдено матчей в хранилище: {bundesliga?.fixturesScanned??0}.
      {bundesliga?.scanMayBeCapped?" Чтение истории ограничено — не делаем неполных выводов.":""}</p>
    </div>:
    <div className="predForecastGrid">
     {bundesliga.rows.slice(0,12).map(f=><article className="predForecast" key={f.id}>
      <header><span>OPENLIGADB / TEAM POISSON V1</span>
       <b className="pending">НЕ КАЛИБРОВАНО</b></header>
      <small>Германия · Бундеслига · начало {time(f.startsAt)}</small>
      <h3>{f.match}</h3>
      <p className="predOutcome">Независимая оценка 1X2 из истории команд</p>
      <div className="predNumbers">
       <div><small>ПОБЕДА 1</small><strong>{percent(f.probability.home)}</strong></div>
       <div><small>НИЧЬЯ X</small><strong>{percent(f.probability.draw)}</strong></div>
       <div><small>ПОБЕДА 2</small><strong>{percent(f.probability.away)}</strong></div>
      </div>
      <div className="predForecastProvenance">
       <span>Зафиксировано до матча: {time(f.forecastAt)}</span>
       <span>Модель: {f.modelVersion}</span>
       <span>Источник: OpenLigaDB, данные сообщества · лицензия ODbL</span>
       <span>НЕ LIVE · независимый результат FT пока не подтверждён</span>
      </div>
      <footer><small>Только SHADOW-исследование: рыночная цена и точность на отложенных матчах не проверены.</small>
       <a href="https://www.openligadb.de/" target="_blank" rel="noopener noreferrer">Источник ↗</a></footer>
     </article>)}
    </div>}
  </section>
  <section className="predSection predBenchmarkSection" id="predBenchmark">
   <div className="predSectionHead"><div>
    <span>MARKET REFERENCE / NO INDEPENDENT MODEL</span><h2>Рыночный ориентир перед матчами</h2>
    <p>Когда спортивный live-источник недоступен, мы можем показать реальные сохранённые котировки
      предстоящих матчей EPL. Отдельно рассчитываем вероятности <b>из рынка</b>, убрав букмекерскую маржу.
      Это объективный контроль для сравнения с будущими моделями VETO, но <b>не новый прогноз VETO</b>
      и не сигнал для ставки.</p>
   </div><a className="predLink" href="/api/intelligence/predictions/market-reference/selfcheck" target="_blank" rel="noopener noreferrer">Проверить расчёты ↗</a></div>
   {statuses.benchmark!=="ready"?<div className="predEmpty" role="status">
     {statuses.benchmark==="error"?"Не удалось прочитать базу сохранённых рыночных котировок.":
      "Проверяем полные котировки 1X2 минимум двух независимых букмекеров…"}</div>:
    !benchmark?.rows.length?<div className="predEmpty"><b>Сейчас нет полного рыночного ориентира.</b>
      <p>Для расчёта нужны полный набор «1–X–2» у каждого из двух разных букмекеров,
      одна временная выборка, подтверждённый ID матча и актуальные цены до начала события.
      Пустоту не заполняем предположениями.</p>
      <p>Матчей проверено: {benchmark?.fixturesScanned??0}; котировок: {benchmark?.quotesScanned??0}.
      {benchmark?.eventsCapped||benchmark?.quotesCapped?" Источник ограничил объём чтения — расчёт заблокирован.":""}</p>
      <Link href="/research/paper-lab">Смотреть настоящие бумажные эксперименты ↗</Link>
    </div>:
    <div className="predForecastGrid">
     {benchmark.rows.slice(0,12).map(m=><article className="predForecast" key={m.eventId}>
      <header><span>THE ODDS API / 1X2 DEVIGGED</span>
       <b className="pending">КОНТРОЛЬ РЫНКА</b></header>
      <small>{m.competition} · начало {time(m.startsAt)}</small><h3>{m.match}</h3>
      <p className="predOutcome">Общерыночная оценка трёх исходов</p>
      <div className="predNumbers">
       <div><small>ПОБЕДА 1</small><strong>{percent(m.probability.home)}</strong></div>
       <div><small>НИЧЬЯ X</small><strong>{percent(m.probability.draw)}</strong></div>
       <div><small>ПОБЕДА 2</small><strong>{percent(m.probability.away)}</strong></div>
      </div>
      <div className="predForecastProvenance">
       <span>Полные наборы 1X2: {m.bookmakers} букмекеров</span>
       <span>Снимок рынка: {time(m.sampleAt)} · обновление источника {time(m.latestSourceAt)}</span>
       <span>Диапазон исходных марж: {number(m.overroundPct.min,2)}–{number(m.overroundPct.max,2)}%</span>
       <span>Источники: {m.freshestBookmakers.join(", ")}</span>
      </div>
      <footer>
       <small>Вероятности выведены из котировок, не рассчитаны независимой моделью VETO.
       Исполнение, доходность и преимущество не проверены.</small>
       <Link href={"/?view=check&event="+encodeURIComponent(m.eventId)}>Матч ↗</Link>
      </footer>
     </article>)}
    </div>}
  </section>
  <section className="predSection predControlProofSection" id="predControlProof">
   <div className="predSectionHead"><div>
    <span>PROSPECTIVE LEDGER / EXACT-ID FULL TIME</span>
    <h2>Что рынок оценил до матча — и что произошло?</h2>
    <p>Независимая сверка: записанная до начала матча вероятность без маржи →
    настоящий подтверждённый FT → Brier Score. Считаем только один заранее зафиксированный
    билет на матч. <b>Это проверка рынка, а не точности собственной модели VETO.</b></p>
   </div><a className="predLink" href="/api/intelligence/predictions/market-proof/selfcheck" target="_blank" rel="noopener noreferrer">Доказательства ↗</a></div>
   {statuses.controlProof!=="ready"?<div className="predEmpty" role="status">
    <b>{statuses.controlProof==="error"?"Проверочный журнал временно недоступен":
     "Сверяем заранее записанные эксперименты с независимыми сертификатами FT…"}</b>
    <p>Никакие результаты не создаются на основе исходов, которых нет в журнале.</p></div>:
    !controlProof?.rows.length?<div className="predEmpty">
     <b>Пока нет полноценной цепочки «запись до матча → проверенный результат».</b>
     <p>Нужен сохранённый до события контрольный прогноз, исход и точный сертификат FT.
      Исторические коэффициенты задним числом не засчитываются.</p></div>:
    <div className="predControlProofBody">
     <div className="predProofTop"><div><small>CONTROL / NOT VETO MODEL</small>
      <strong>Факты против ожиданий</strong>
      <span>Бумажные рыночные наблюдения — полностью виртуальные, без реальных ставок.</span></div>
      <b>{controlProof.quality.sufficientForCalibration?"МИНИМУМ НАБЛЮДЕНИЙ ДОСТИГНУТ":
       "ВЫБОРКА МАЛА / ПРЕДВАРИТЕЛЬНО"}</b></div>
     <div className="predProofKpis">
      <article><small>ПОДТВЕРЖДЕНО ПРОВАЙДЕРОМ FT</small><strong>{controlProof.quality.samples}</strong><span>уникальных матчей с бумажным расчётом</span></article>
      <article><small>BRIER SCORE РЫНКА</small><strong>{controlProof.quality.brier===null?"—":number(controlProof.quality.brier,4)}</strong>
       <span>меньше — точнее, но только на ограниченной выборке</span></article>
      <article><small>ПРОГНОЗНАЯ ЧАСТОТА</small><strong>{percent(controlProof.quality.meanProbability)}</strong>
       <span>среднее ожидание по выбранным исходам</span></article>
      <article><small>РЕАЛЬНАЯ ЧАСТОТА</small><strong>{percent(controlProof.quality.observedFrequency)}</strong>
       <span>итоги проверенных событий</span></article>
     </div>
     <div className="predControlWarnings">
      <p><b>Границы:</b> {controlProof.coverage.picksRead} записей исследовано,
      {controlProof.coverage.verifiedSettlements} подтверждено повторно;
      {controlProof.coverage.unresolved} ожидают FT,
      {controlProof.coverage.unreconciledFinals} имеют FT, но ещё не завершена сверка журнала.</p>
      <p>Виртуальный итог только по проверенным контрольным билетам: {controlProof.quality.virtualNet>=0?"+":""}{number(controlProof.quality.virtualNet,2)} условных USD.
       Не доказаны заработок, исполнение коэффициента или преимущество VETO над рынком.</p>
      {controlProof.coverage.picksMayBeCapped||controlProof.coverage.eventReadsMayBeCapped||
       controlProof.coverage.stateReadsMayBeCapped?<p className="predProofWarning">Чтение истории ограничено. Итоги неполные.</p>:null}
     </div>
     <div className="predControlRows">
      {controlProof.rows.slice(0,18).map(r=><article key={r.pickId}>
       <div className="predControlMatch"><strong>{r.match}</strong>
        <small>{r.competition} · до начала: {time(r.recordedAt)}</small>
        <span>{contractLabel(r.selection,r.selection)} · {r.bookmaker}</span></div>
       <div><small>ПЕРВОНАЧАЛЬНО</small><b>{percent(r.probability)}</b>
        <span>Оценка рынка без маржи</span></div>
       <div><small>ИТОГ</small><b>{r.score?r.score.home+":"+r.score.away:"—"}</b>
        <span>{r.status==="VERIFIED_FT"?"Проверен по The Odds API":
         r.status==="FT_CERTIFIED_BUT_PAPER_NOT_SETTLED"?"Нужна сверка журнала":"Ожидаем независимый FT"}</span></div>
       <div><small>BRIER</small><b>{r.brier===null?"—":number(r.brier,4)}</b>
        <span>{r.outcome===null?"Без оценки":r.outcome===1?"Исход наступил":"Исход не наступил"}</span></div>
      </article>)}
     </div>
    </div>}
  </section>
  <section className="predSection predProofSection" id="predProof">
   <div className="predSectionHead"><div><span>02 / MODEL VERIFICATION · REAL FULL TIME</span>
    <h2>Что модель предсказывала на самом деле?</h2>
    <p>Сверяем сохранённые до результата оценки VETO с независимо подтверждённым финальным счётом.
       Для каждого матча используем ровно один заранее определённый снимок одной версии модели.
       Последние 30% матчей проверяются отдельно от более ранних 70%.</p></div>
    <a className="predLink" href="/api/intelligence/predictions/validation/selfcheck" target="_blank" rel="noopener noreferrer">Selfcheck ↗</a></div>
   {statuses.proof!=="ready"?<div className="predEmpty" role="status">
    <b>{statuses.proof==="error"?"Историческая проверка недоступна":"Сверяем модели с независимым FT…"}</b>
    <p>Никаких придуманных результатов, процентов побед или показателей доходности.</p></div>:
    !proof?.selected?<div className="predEmpty">
     <b>Пока нет пар «реальный прогноз модели → независимый FT».</b>
     <p>Просмотрено {proof?.coverage.eventsScanned??0} завершённых матчей, независимо подтверждены
      {proof?.coverage.eventsWithFt??0} финалов. Наличие одного только FT не доказывает, что прогноз существовал раньше.</p>
     <Link href="/research/discovery">Проверить цепочку источников ↗</Link></div>:
    <div className="predProofContent">
     <div className="predProofTop"><div><small>ВЕРСИЯ МОДЕЛИ</small><strong>{proof.selected.modelVersion}</strong>
      <span>Хронологический holdout · {proof.lookbackDays} дней сохранённой истории</span></div>
      <b>{proof.selected.holdoutCountSufficient?"МИНИМАЛЬНОЕ ПОКРЫТИЕ ЕСТЬ":"НЕДОСТАТОЧНО ПОДТВЕРЖДЕНИЙ"}</b></div>
     <div className="predProofKpis">
      <article><small>СОПОСТАВЛЕННЫХ ПРОГНОЗОВ</small><strong>{proof.selected.total.samples}</strong><span>один снимок на матч и версию</span></article>
      <article><small>ПРОВЕРЕНО НА HOLDOUT</small><strong>{proof.selected.holdout.fixtures}</strong><span>обособленные поздние матчи</span></article>
      <article><small>BRIER МОДЕЛИ / HOLDOUT</small><strong>{proof.selected.holdout.brier===null?"—":number(proof.selected.holdout.brier,4)}</strong><span>чем меньше, тем лучше</span></article>
      <article><small>BRIER БАЗОВОЙ ЧАСТОТЫ</small><strong>{proof.selected.holdoutBaselineBrier===null?"—":number(proof.selected.holdoutBaselineBrier,4)}</strong><span>частота из train, без заглядывания в holdout</span></article>
     </div>
     <div className="predProofDetails">
      <div><h3>Калибровка вероятностей</h3>
       <p>Что модель ожидала и что произошло в независимой проверочной части. Маленькая выборка не показывает надёжную закономерность.</p>
       {proof.selected.reliabilityBins.length?proof.selected.reliabilityBins.map(bin=><div key={bin.min} className="predCalibBin">
        <header><b>{Math.round(bin.min*100)}–{Math.round(bin.max*100)}% · {bin.count} матчей</b>
         <span>Модель: {percent(bin.forecastMean)} · факт: {percent(bin.observedFrequency)}</span></header>
        <div className="predCalibTracks"><div className="predCalibTrack"><i style={{width:Math.min(100,bin.forecastMean*100)+"%"}}/></div>
         <div className="predCalibTrack actual"><i style={{width:Math.min(100,bin.observedFrequency*100)+"%"}}/></div></div>
       </div>):<p>Нет проверочной части для построения калибровки.</p>}
      </div>
      <div><h3>Границы доказательств</h3>
       <p>Обучающая часть: {proof.selected.train.fixtures} матчей. Независимая: {proof.selected.holdout.fixtures}.
        Модель не настраивалась на holdout в этом отчёте, но её предыдущая разработка могла использовать пересекающуюся историю.</p>
       <p>Достаточность объёма: {proof.selected.holdoutCountSufficient?"формально есть минимальная выборка, но нужна независимая валидация":"не достигнута"}.</p>
       {proof.coverage.scanMayBeCapped||proof.coverage.sampleMayBeCapped?
        <p className="predProofWarning">История ограничена лимитом чтения. Результат не является полной оценкой качества модели.</p>:null}
       <p className="predProofWarning">Преимущество перед букмекером, исполнимая цена и прибыльность НЕ доказаны. Brier — показатель точности вероятностей, не дохода.</p>
      </div>
     </div>
     <div className="predProofHistory"><h3>Последние проверенные исходы</h3>
      <div className="predProofRows">{proof.recent.filter(r=>r.modelVersion===proof.selectedModelVersion).slice(0,12).map(r=>
       <article key={r.id}><div><strong>{r.match}</strong><small>{r.competition} · прогноз {time(r.capturedAt)}</small>
        <span>{r.marketKey} · {r.selectionKey}</span></div>
        <div><small>ОЦЕНКА</small><b>{percent(r.probability)}</b></div>
        <div><small>ИСТИННЫЙ FT</small><b>{r.finalScore.home}:{r.finalScore.away}</b></div>
        <div><small>ИСХОД СОБЫТИЯ</small><b>{r.outcome===1?"НАСТУПИЛ":"НЕ НАСТУПИЛ"}</b></div>
       </article>)}</div>
     </div>
    </div>}
  </section>
  <section className="predSection" id="predAnomalies">
   <div className="predSectionHead"><div><span>03 / MARKET ANOMALY DETECTOR</span><h2>Аномалии букмекерских котировок</h2>
    <p>Независимо сравниваем свежие цены как минимум трёх букмекеров на один и тот же рынок и исход.
     Находим значительные расхождения, но не называем их доходными ставками до проверки ликвидности и исполнения.</p></div></div>
   {statuses.anomalies!=="ready"?<div className="predEmpty" role="status">
    {statuses.anomalies==="error"?"Источник рыночных котировок недоступен.":"Сопоставляем сохранённые цены букмекеров…"}</div>:
    (anomalies?.rows.length??0)===0?<div className="predEmpty">
     <b>Нет подтверждённых аномалий в актуальной выборке.</b><p>Для результата нужны свежие однозначные цены, три различных букмекера и отклонение от медианы.
       Устаревшие или неполные котировки не показываются как найденные возможности.</p>
     {anomalies?.quotesCapped&&<p>Лимит выборки достигнут — расчёты расхождений заблокированы.</p>}</div>:
    <div className="predForecastGrid">{anomalies!.rows.slice(0,12).map(x=><article className="predForecast" key={x.id}>
     <header><span>REAL QUOTES / PRICE DISPERSION</span><b className="pending">ИССЛЕДОВАНИЕ</b></header>
     <small>{x.competition} · {time(x.lastCapturedAt)}</small>
     <h3>{x.match}</h3><p className="predOutcome">{x.marketKey} · {x.selectionKey}{x.line!==null?" · "+x.line:""}</p>
     <div className="predNumbers">
      <div><small>МЕДИАНА КОЭФФ.</small><strong>{number(x.medianOdds,2)}</strong></div>
      <div><small>МАКС. ЦЕНА</small><strong>{number(x.highestObservedOdds,2)}</strong></div>
      <div><small>ОТКЛОНЕНИЕ</small><strong>+{number(x.deviationPct)}%</strong></div>
     </div>
     <div className="predForecastProvenance">
      <span>Источники: {x.bookmakerCount} разных букмекера · {x.provider}</span>
      <span>Максимальная сохранённая цена: {x.highestBookmaker}</span>
      <span>Цена с отметкой времени: {time(x.lastCapturedAt)}</span>
     </div>
     <footer><small>Расхождение цены само по себе не доказывает ошибку рынка или исполнимость ставки.</small>
      <Link href={"/?view=check&event="+encodeURIComponent(x.eventId)}>Посмотреть матч ↗</Link></footer>
    </article>)}</div>}
  </section>
  <section className="predSection" id="predLinked">
   <div className="predSectionHead"><div><span>04 / DISCOVERY → REAL FIXTURE</span><h2>Гипотезы на реальных матчах</h2>
    <p>Когда в текущей игре возникает ситуация, которую VETO ранее обнаружил в архиве,
       мы автоматически сопоставляем её с конкретной гипотезой, проверяем время счёта и наличие цены.
       Это пока исследовательские совпадения, а не доказанные прибыльные сигналы.</p></div></div>
   {statuses.discovery!=="ready"?<div className="predEmpty" role="status">
    {statuses.discovery==="error"?"Нет доступа к источнику исторических закономерностей.":"Ищем совпадения архивных гипотез с реальными матчами…"}</div>:
    liveHypotheses.length===0?<div className="predEmpty">
     <b>Сейчас нет свежих подтверждённых совпадений.</b>
     <p>Система не подставляет старые снимки как live. На исследовании были проверены
      {discovery?.matchCoverage?.scannedLiveEvents??0} потенциальных live-матчей,
      но действующий набор гипотез и источников не дал подходящих активных кандидатов.</p>
     {discovery?.matchCoverage?.quoteReadFailed&&<p>Отдельно: считывание сохранённых букмекерских котировок было недоступно.</p>}
     <Link href="/research/discovery">Смотреть весь архив гипотез ↗</Link></div>:
    <div className="predForecastGrid">
     {liveHypotheses.slice(0,12).map(row=><article className="predForecast" key={row.id}>
      <header><span>REAL SOURCE / HYPOTHESIS MATCH</span>
       <b className="pending">{row.stage==="INDICATIVE_PAPER_ONLY"?"ТОЛЬКО PAPER":"НАБЛЮДЕНИЕ"}</b></header>
      <small>{row.competition} · {time(row.observedAt)}</small><h3>{row.match}</h3>
      <p className="predOutcome">{row.hypothesisLabel}</p>
      <div className="predNumbers"><div><small>ИСТОРИЧЕСКАЯ ЧАСТОТА*</small><strong>{percent(row.hitRate)}</strong></div>
       <div><small>НЕЗАВИСИМЫЙ HOLDOUT*</small><strong>{percent(row.holdoutHitRate)}</strong></div>
       <div><small>КОЭФФИЦИЕНТ</small><strong>{row.quote?number(row.quote.odds,2):"—"}</strong></div></div>
      <div className="predForecastProvenance">
       <span>Снимок: {row.minute}′ · {row.score.home}:{row.score.away} · {time(row.observedAt)}</span>
       <span>Исторических подтверждённых FT: {row.settled} · Holdout: {row.holdoutCount}</span>
       {row.quote&&<span>Сохранённая котировка: {row.quote.bookmaker} / {row.quote.provider} · {time(row.quote.capturedAt)}</span>}
       <span>{row.reasons[0]}</span>
      </div>
      <footer><small>*Эти частоты не являются вероятностью отдельного матча; нет доказанного EDGE или подтверждения исполнимой цены.</small>
       <Link href={"/?view=check&event="+encodeURIComponent(row.eventId)}>Разобрать ↗</Link></footer>
     </article>)}
    </div>}
  </section>
  <section className="predSection" id="predList">
   <div className="predSectionHead"><div><span>05 / FORWARD PAPER LEDGER</span><h2>Главные прогнозы VETO</h2>
    <p>Конкретный матч → исход → вероятность модели → цена из источника → проверка результата.</p></div>
    <div className="predTabRow" role="group" aria-label="Фильтр прогнозов">
     {([{id:"all",label:"Все"},{id:"open",label:"Ожидают FT"},{id:"settled",label:"Проверены"}] as const).map(x=>
      <button type="button" key={x.id} aria-pressed={tab===x.id} onClick={()=>setTab(x.id)}>{x.label}</button>)}
    </div>
   </div>
   {statuses.paper!=="ready"?<div className="predEmpty" role="status"><b>{statuses.paper==="error"?"Источник прогнозов недоступен":"Читаем сохранённый журнал…"}</b>
    <p>Не подставляем учебные исходы, не меняем прогнозы задним числом.</p></div>:
    shown.length===0?<div className="predEmpty"><b>{tickets.length?"Для выбранного фильтра прогнозов нет.":"Пока нет независимых прогнозов VETO, прошедших проверку данных."}</b>
     <p>Сейчас записано {controlCount} контрольных paper-наблюдений рыночных цен. Это не прогнозы модели и не сигналы.
       Появление события или большого коэффициента само по себе не запускает рекомендацию.</p>
     <Link href="/research/paper-lab">Смотреть журнал испытаний ↗</Link></div>:
    <div className="predForecastGrid">{shown.map(ticket=>{
     const state=ticket.settlement?ticket.settlement.result==="WIN"?"ПРОГНОЗ СБЫЛСЯ":"ПРОГНОЗ НЕ СБЫЛСЯ":
      now>Date.parse(ticket.eventStartsAt)+3*86400_000?"FT НЕ ПОДТВЕРЖДЁН":"ОЖИДАЕМ ОФИЦИАЛЬНЫЙ FT";
     const chance=1/ticket.odds;
     return <article className="predForecast" key={ticket.id}>
      <header><span>МОДЕЛЬ VETO / ПРЕДВАРИТЕЛЬНО</span><b className={ticket.settlement?(ticket.settlement.result==="WIN"?"won":"lost"):"pending"}>{state}</b></header>
      <small>{ticket.competition} · {time(ticket.eventStartsAt)}</small>
      <h3>{ticket.match}</h3><p className="predOutcome">{contractLabel(ticket.contract,ticket.selectionKey)}</p>
      <div className="predNumbers">
       <div><small>ОЦЕНКА МОДЕЛИ*</small><strong>{percent(ticket.modelProbability)}</strong></div>
       <div><small>РЫНОК 1/KF*</small><strong>{percent(chance)}</strong></div>
       <div><small>КОЭФФИЦИЕНТ</small><strong>{number(ticket.odds,2)}</strong></div>
      </div>
      <div className="predForecastProvenance">
       <span>Записан: {time(ticket.pickedAt)} · Модель: {time(ticket.modelAt)}</span>
       <span>Котировка: {ticket.bookmaker} / {ticket.quoteProvider} · {time(ticket.quoteAt)}</span>
       <span>Версия модели: {ticket.modelVersion}</span>
       {ticket.settlement&&<span>FT: {ticket.settlement.score.home}:{ticket.settlement.score.away} · {time(ticket.settlement.finalAt)}</span>}
      </div>
      <footer><small>*Вероятность модели не калибрована; 1/коэффициент включает маржу букмекера. Никаких гарантий или реальных ставок.</small>
       <Link href={"/?view=check&event="+encodeURIComponent(ticket.eventId)}>Исследовать матч ↗</Link></footer>
     </article>;
    })}</div>}
  </section>
  <div className="predLower">
   <section className="predSection" id="predHypotheses">
    <div className="predSectionHead"><div><span>06 / PATTERN DISCOVERY</span><h2>Найденные гипотезы</h2>
     <p>VETO ищет статистические закономерности. Без подтверждённых рыночных цен это ещё не готовый прогноз.</p></div></div>
    {statuses.discovery!=="ready"?<div className="predEmpty">{statuses.discovery==="error"?"Исторические наблюдения недоступны.":"Проверяем исследовательский архив…"}</div>:
     (discovery?.patterns.length??0)===0?<div className="predEmpty">Сохранённых гипотез за доступное окно пока нет.</div>:
     <div className="predPatternRows">{discovery!.patterns.slice(0,9).map(p=><article key={p.id}>
      <div><small>{p.family.toUpperCase()} / {patternStage(p)}</small><strong>{p.label}</strong></div>
      <div className="predPatternMetrics"><span>Наблюдений <b>{p.observations}</b></span>
       <span>FT подтверждено <b>{p.settled}</b></span><span>Частота <b>{percent(p.hitRate)}</b></span>
       <span>Holdout <b>{p.holdoutCount} / {percent(p.holdoutHitRate)}</b></span></div>
     </article>)}</div>}
    {discovery?.fetchCoverage?.windowMayBeCapped&&<p className="predFootnote">Исследовательская выборка ограничена лимитом загрузки — статистика неполная.</p>}
    <Link className="predLink" href="/research/discovery">Вся лаборатория закономерностей ↗</Link>
   </section>
   <section className="predSection" id="predRadar">
    <div className="predSectionHead"><div><span>07 / SITUATION SCANNER</span><h2>Необычные ситуации</h2>
     <p>Матчи с наблюдаемыми условиями для исследования. Радар не считает их аномалиями с доказанным преимуществом.</p></div></div>
    {statuses.radar!=="ready"?<div className="predEmpty">{statuses.radar==="error"?"Радар временно недоступен.":"Читаем последние сохранённые события…"}</div>:
     radarCases.length===0?<div className="predEmpty">Сейчас нет свежих ситуаций, достаточных даже для исследовательского наблюдения.</div>:
     <div className="predRadarList">{radarCases.slice(0,7).map(x=><article key={x.id}>
      <div><span>{x.status==="PAPER"?"PAPER / ВИРТУАЛЬНО":"WATCH / НАБЛЮДЕНИЕ"}</span><strong>{x.event.homeName} — {x.event.awayName}</strong>
       <small>Счёт {x.event.homeScore}:{x.event.awayScore} · {x.event.clock} · {time(x.event.lastUpdatedAt)}</small></div>
      <p>{x.scenario==="UNDER_4_5_LATE_1_1"?"Гипотеза: 1:1 после 80′ / ТМ 4,5.":"Наблюдаем изменение состояния матча."}</p>
      <Link href={"/?view=check&event="+encodeURIComponent(x.id)}>Открыть ↗</Link>
     </article>)}</div>}
    <Link className="predLink" href="/research/watchlist">Радар всех матчей ↗</Link>
   </section>
  </div>
  <footer className="predFooter">
   <p>VETO SPORT / PREDICTION INTEGRITY · Модели, контрольные цены, гипотезы и бумажные эксперименты не смешиваются.
    Ни один исследовательский прогноз не объявляется доказанным преимуществом до независимой проверки.</p>
   <Link href="/research/results">Сверить реальные результаты ↗</Link>
  </footer>
 </main>;
}
