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
type DiscoveryResponse={source:string;generatedAt:string;hypothesesScreened:number;validatedEdgeCount:number;
 patterns:Pattern[];fetchCoverage?:{windowMayBeCapped:boolean}};
type RadarRow={id:string;status:"PAPER"|"WATCH"|"PASS";scenario:string;
 event:{homeName:string;awayName:string;clock:string;homeScore:string;awayScore:string;lastUpdatedAt?:string};
 evidence:{freshScore:boolean;verifiedQuote:boolean;independentProbability:false;executionVerified:false};
 reasons:string[];quote?:{decimalOdds:number;capturedAt:string}};
type RadarResponse={generatedAt:string;source:string;rows:RadarRow[]};
type ShadowRow={id:string;eventId:string;competition:string;match:string;marketKey:string;selectionKey:string;
 modelProbability:number;modelFairOdds:number;modelVersion:string;predictionAt:string;stateAt:string;stage:"UNVALIDATED_SHADOW_FORECAST"};
type ShadowResponse={ok:boolean;source:string;asOf:string;rows:ShadowRow[];decisionAuthority:false};
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
 const [statuses,setStatuses]=useState<Record<string,Status>>({paper:"loading",discovery:"loading",radar:"loading",shadow:"loading"});
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
  ] as const;
  const update=(key:string,status:Status)=>{if(alive)setStatuses(old=>({...old,[key]:status}));};
  sources.forEach(({key,url})=>{
   update(key,"loading");
   void fetch(url,{cache:"no-store"})
    .then(async response=>{if(!response.ok)throw Error("SOURCE_UNAVAILABLE");return response.json();})
    .then((value:unknown)=>{
     if(!alive)return;
     if(key==="paper"){
      const item=value as PaperResponse;
      if(item.ok!==true||!Array.isArray(item.account?.tickets))throw Error("PAPER_INVALID");
      setPaper(item);
     }else if(key==="discovery"){
      const item=value as DiscoveryResponse;
      if(item.source!=="PERSISTED_ONLY"||!Array.isArray(item.patterns))throw Error("DISCOVERY_INVALID");
      setDiscovery(item);
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
 const stats=[
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
   <div className="predHeroActions"><a href="#predNow">Прогнозы VETO ↓</a><a href="#predHypotheses">Гипотезы ↓</a><a href="#predRadar">Аномалии и радар ↓</a></div>
  </section>
  <section className="predStats" aria-label="Состояние исследований">
   {stats.map(s=><article key={s.name}><span>{s.name}</span><strong>{s.value}</strong><small>{s.detail}</small></article>)}
  </section>
  <div className="predEvidenceBanner">
   <div><strong>REAL SOURCE ≠ VERIFIED EDGE</strong><p>Прогноз может относиться к настоящему матчу и быть записан до исхода, но это не делает его доказанно прибыльным.
    Независимые модели пока проходят бумажную проверку. Контрольные цены букмекера не называем прогнозами VETO.</p></div>
   <button type="button" onClick={refresh}>Обновить из источников ↻</button>
  </div>
  <section className="predSection" id="predNow">
   <div className="predSectionHead"><div><span>01 / REAL-TIME MODEL SURFACE</span><h2>Оперативные оценки VETO</h2>
    <p>Реальные матчи, реальные сохранённые входные данные, предварительные вероятности модели.
       Без подтверждённого коэффициента букмекера и проверки калибровки это ещё не рекомендация ставить.</p></div></div>
   {statuses.shadow!=="ready"?<div className="predEmpty" role="status">
    {statuses.shadow==="error"?"Сохранённые прогнозы shadow-модели недоступны.":"Проверяем последние расчёты модели…"}</div>:
    (shadow?.rows.length??0)===0?<div className="predEmpty"><b>В актуальном окне нет свежих прогнозов shadow-модели.</b>
     <p>Алгоритм не должен изображать активный прогноз, когда матч, расчёт или состояние источника устарели.
        Проверить, почему модель ничего не выпустила, можно в состоянии данных и журнале исследований.</p>
     <Link href="/research/discovery">Диагностика исследований ↗</Link></div>:
    <div className="predForecastGrid">{shadow!.rows.slice(0,14).map(x=><article className="predForecast" key={x.id}>
     <header><span>REAL MATCH / SHADOW MODEL</span><b className="pending">НЕЗАВИСИМАЯ ПРОВЕРКА ВПЕРЕДИ</b></header>
     <small>{x.competition} · расчёт {time(x.predictionAt)}</small>
     <h3>{x.match}</h3><p className="predOutcome">{contractLabel(x.marketKey==="football.1x2"?
      x.selectionKey==="home"?"FT_HOME":x.selectionKey==="away"?"FT_AWAY":"FT_DRAW":
      "",x.marketKey+" · "+x.selectionKey)}</p>
     <div className="predNumbers"><div><small>ОЦЕНКА МОДЕЛИ</small><strong>{percent(x.modelProbability)}</strong></div>
      <div><small>МОДЕЛЬНЫЙ FAIR KF</small><strong>{number(x.modelFairOdds,2)}</strong></div>
      <div><small>ЦЕНА БУКМЕКЕРА</small><strong>НЕ ПРОВЕРЕНА</strong></div></div>
     <div className="predForecastProvenance"><span>Источник: сохранённый матч · {time(x.stateAt)}</span>
      <span>Модель: {x.modelVersion} · {time(x.predictionAt)}</span>
      <span>Статус: исследовательская модель, не EDGE и не исполнимая котировка.</span></div>
     <footer><small>Одиночная некалиброванная модель. Нельзя выводить прибыльность без независимой цены и результата.</small>
      <Link href={"/?view=check&event="+encodeURIComponent(x.eventId)}>Разобрать ↗</Link></footer>
    </article>)}</div>}
  </section>
  <section className="predSection" id="predList">
   <div className="predSectionHead"><div><span>02 / FORWARD PAPER LEDGER</span><h2>Главные прогнозы VETO</h2>
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
    <div className="predSectionHead"><div><span>03 / PATTERN DISCOVERY</span><h2>Найденные гипотезы</h2>
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
    <div className="predSectionHead"><div><span>04 / SITUATION SCANNER</span><h2>Необычные ситуации</h2>
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
