"use client";

import {useEffect,useMemo,useState} from "react";
import {BOARD_VERSION,MISSIONS,SOURCES,type Stage,type Mission,type Track} from "@/lib/research/mission-control/catalog";
import {describeQuote,quoteBreakEven,type QuoteObservation} from "@/lib/research/mission-control/quotes";
import type {SourceObservatoryReport} from "@/lib/research/mission-control/source-observatory";
import {HIGH_HIT_CATALOG} from "@/lib/research/high-hit/catalog";
import {analyzeHighHitEvidence} from "@/lib/research/high-hit/engine";
import "./mission-control.css";

type Tab="TODAY"|"MISSIONS"|"ODDS"|"SOURCES";
type PersonalState="TO_DO"|"IN_PROGRESS"|"COMPLETE";
type Readiness={generatedAt:string;prerequisites:{
 quoteAdapterKeyConfigured:boolean;quoteAllowlistConfigured:boolean;
 quoteSportsAllowlist:string[];quoteRegions:string[];quoteMarkets:string[];
 persistenceConfigured:boolean;cronSecretConfigured:boolean;
 blocked:boolean;priceCurrent:false;actualObservedQuotes:number;
};};
const KEY="veto.zero-s.mission-control.personal.v1";
const QUOTES_KEY="veto.zero-s.mission-control.manual-quotes.v1";
const fmt=(v:number)=>(v*100).toFixed(2).replace(".",",")+"%";
const stageMap:Record<Stage,string>={BUILT:"СДЕЛАНО В КОДЕ",IN_PROGRESS:"ИССЛЕДУЕТСЯ",NOT_STARTED:"НЕ НАЧАТО",BLOCKED:"НЕ ХВАТАЕТ ДАННЫХ"};
const stageClass:Record<Stage,string>={BUILT:"built",IN_PROGRESS:"progress",NOT_STARTED:"planned",BLOCKED:"blocked"};
const trackMap:Record<Track,string>={RESEARCH:"ИССЛЕДОВАНИЯ",ODDS:"КОЭФФИЦИЕНТЫ",DATA:"ДАННЫЕ",PRODUCT:"ПЛАТФОРМА",SALES:"МОНЕТИЗАЦИЯ"};
const tabs:Array<{id:Tab,label:string}>=[{id:"TODAY",label:"СЕГОДНЯ"},{id:"MISSIONS",label:"ПЛАН РАЗРАБОТКИ"},{id:"ODDS",label:"КОЭФФИЦИЕНТЫ"},{id:"SOURCES",label:"ИСТОЧНИКИ"}];
const nextSteps=[
 "Открыть статус подключения котировок и проверить конкретные разрешённые виды спорта.",
 "Выбрать одну гипотезу в High-Hit Radar и проверить, существует ли точно такой рынок.",
 "Не считать цену «реальной», пока нет указания букмекера, времени и принятой ставки.",
 "Сохранить ВСЕ виртуальные наблюдения и отказы до результата.",
 "Сверить условия расчёта с правилами вида спорта и историей котировок."
];
const fixedPrices=[1.01,1.02,1.03,1.05,1.08,1.10,1.15,1.20];
const historicalOddsFloors=HIGH_HIT_CATALOG.filter(x=>x.sport==="football"&&x.observed).map(x=>{
 const obs=x.observed!;
 const stats=analyzeHighHitEvidence({
  wins:obs.wins,losses:obs.losses,voids:0,decimalOdds:1.05,hypotheticalStake:200,
 });
 return{label:x.selection,n:stats.n,hit:stats.observedSuccess,lower:stats.wilson95.low,
  empiricalFair:stats.observedFairOdds,lowerBoundFair:stats.conservativeFairOdds};
});
const emptyRecord={
 sport:"football",match:"",market:"Total Under 4.5",selection:"Under",bookmaker:"",odds:"1.05",
};
const fieldStyle={};
export default function MissionControlPage(){
 const [tab,setTab]=useState<Tab>("TODAY");
 const [track,setTrack]=useState<Track|"ALL">("ALL");
 const [personal,setPersonal]=useState<Record<string,PersonalState>>({});
 const [quotes,setQuotes]=useState<QuoteObservation[]>([]);
 const [record,setRecord]=useState(emptyRecord);
 const [ready,setReady]=useState(false);
 const [health,setHealth]=useState<Readiness|null>(null);
 const [healthError,setHealthError]=useState("");
 const [sourceReport,setSourceReport]=useState<SourceObservatoryReport|null>(null);
 const [sourceError,setSourceError]=useState("");
 const [sourceLoading,setSourceLoading]=useState(false);
 const [notice,setNotice]=useState("");
 const [time,setTime]=useState<Date|null>(null);
 useEffect(()=>{
  setTime(new Date());
  try{
    const p=localStorage.getItem(KEY),q=localStorage.getItem(QUOTES_KEY);
    if(p){const decoded:unknown=JSON.parse(p);if(decoded&&typeof decoded==="object"&&!Array.isArray(decoded))setPersonal(decoded as Record<string,PersonalState>);}
    if(q){const decoded:unknown=JSON.parse(q);if(Array.isArray(decoded))setQuotes(decoded.filter(x=>
      x&&typeof x.id==="string"&&typeof x.capturedAt==="string"&&typeof x.decimalOdds==="number"&&x.manuallyEntered===true).slice(0,1500));}
  }catch{setNotice("Старый локальный журнал не удалось прочитать; проверяй резервную копию.");}
  setReady(true);
 },[]);
 useEffect(()=>{
  if(!ready)return;
  try{localStorage.setItem(KEY,JSON.stringify(personal));}
  catch{setNotice("Не удалось сохранить личный план: хранилище браузера недоступно.");}
 },[personal,ready]);
 useEffect(()=>{
  if(!ready)return;
  try{localStorage.setItem(QUOTES_KEY,JSON.stringify(quotes));}
  catch{setNotice("Не удалось сохранить ручные котировки: экспортируй данные.");}
 },[quotes,ready]);
 useEffect(()=>{
  let active=true;
  fetch("/api/intelligence/research/mission-control",{cache:"no-store"})
   .then(async response=>{if(!response.ok)throw Error("HTTP "+response.status);return response.json();})
   .then((value:Readiness)=>{if(active)setHealth(value);})
   .catch(()=>{if(active)setHealthError("Статус провайдера недоступен. Это не подтверждает наличие котировок.");});
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  let active=true;
  fetch("/api/intelligence/research/source-observatory",{cache:"no-store"})
   .then(async response=>{const report:SourceObservatoryReport=await response.json();return {report,ok:response.ok};})
   .then(({report,ok})=>{if(active){setSourceReport(report);if(!ok)setSourceError("Источник данных временно недоступен.");}})
   .catch(()=>{if(active)setSourceError("Источники данных не удалось проверить.");});
  return()=>{active=false;};
 },[]);
 const observed=MISSIONS.filter(x=>x.stage==="BUILT").length;
 const blockers=MISSIONS.filter(x=>x.stage==="BLOCKED").length;
 const personalComplete=Object.values(personal).filter(x=>x==="COMPLETE").length;
 const waiting=MISSIONS.filter(x=>x.priority===1&&x.stage!=="BUILT");
 const asOf=time?.toISOString()??new Date(0).toISOString();
 async function refreshStoredSources(){
   setSourceLoading(true);setSourceError("");
   try{
     const response=await fetch("/api/intelligence/research/source-observatory",{cache:"no-store"});
     const report:SourceObservatoryReport=await response.json();
     setSourceReport(report);
     if(!response.ok)setSourceError("База временно недоступна; последние котировки не подтверждены.");
   }catch{
     setSourceReport(null);
     setSourceError("Не удалось прочитать сохранённые источники. Это НЕ означает, что рынок доступен.");
   }finally{setSourceLoading(false);}
 }
 const quoteRows=useMemo(()=>quotes.map(q=>{
  try{return describeQuote(q,asOf);}
  catch{return null;}
 }).filter((x):x is NonNullable<typeof x>=>Boolean(x)),[quotes,asOf]);
 const addQuote=()=>{
  try{
   const decimalOdds=Number(record.odds);
   quoteBreakEven(decimalOdds);
   if(!record.match.trim()||!record.market.trim()||!record.selection.trim()||!record.bookmaker.trim()){
    setNotice("Нужно указать матч, рынок, исход и букмeкера / «ручная котировка».");return;
   }
   const q:QuoteObservation={
    id:crypto.randomUUID(),
    capturedAt:new Date().toISOString(),
    eventLabel:record.match.trim().slice(0,160),
    sport:record.sport,
    market:record.market.trim().slice(0,140),
    selection:record.selection.trim().slice(0,80),
    bookmaker:record.bookmaker.trim().slice(0,120),
    decimalOdds,
    manuallyEntered:true,
   };
   setQuotes(old=>[q,...old].slice(0,1500));
   setRecord(old=>({...old,match:""}));
   setTime(new Date());
   setNotice("Ручное наблюдение записано. Оно не подтверждает, что коэффициент был принят.");
  }catch(error){setNotice(error instanceof Error?error.message:"Проверь значения.");}
 };
 const updateTask=(id:string,value:PersonalState)=>setPersonal(old=>({...old,[id]:value}));
 function exportBoard(){
  const json=JSON.stringify({version:BOARD_VERSION,exportedAt:new Date().toISOString(),note:"Local personal task states and manual quotes; not provider verified",personal,quotes},null,2);
  const url=URL.createObjectURL(new Blob([json],{type:"application/json;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="veto-zero-s-mission-control.json";link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
 return <main className="mission">
  <header className="missionNav"><a href="/" className="missionMark">VETO <span>/ SPORT</span></a><strong>RESEARCH OPERATIONS / ZERO–S</strong><a href="/research/high-hit">← HIGH-HIT RADAR</a></header>
  <section className="missionHero"><div className="missionKicker">RESEARCH CONTROL / 11.10.2026 <b>NO CLAIM OF CURRENT WINNING EDGE</b></div>
   <h1>Один центр.<br/><em>Все исследования.</em></h1>
   <p>Постоянное рабочее место, где видно <strong>что мы уже построили, что нужно найти, чего не хватает и как проверять коэффициенты.</strong> Изменения этапов разработки приходят с обновлениями сайта; твои личные отметки хранятся в браузере.</p>
  </section>
  <div className="missionKPIs">
   <div><small>ТЕХНИЧЕСКИЕ ЗАДАЧИ</small><b>{MISSIONS.length}</b><span>в общем плане</span></div>
   <div><small>РЕАЛИЗОВАНО В ВЕТКЕ</small><b>{observed}</b><span>не обязательно в production</span></div>
   <div><small>БЛОКЕРЫ</small><b>{blockers}</b><span>данные / источники / доступ</span></div>
   <div><small>ТВОИ ОТМЕТКИ</small><b>{personalComplete}</b><span>на этом устройстве</span></div>
  </div>
  <nav className="missionTabs" aria-label="Mission Control views">{tabs.map(x=><button type="button" key={x.id} onClick={()=>setTab(x.id)} className={tab===x.id?"active":""}>{x.label}</button>)}</nav>
  {tab==="TODAY"&&<div className="missionGrid">
   <section className="missionPanel"><div className="missionHead"><small>01 / PRIORITIES</small><h2>Что искать прямо сейчас</h2></div>
    <div className="missionPriority">{waiting.slice(0,7).map((x,i)=><article key={x.id}><div className="missionIdx">{String(i+1).padStart(2,"0")}</div><div><strong>{x.title}</strong><p>{x.nextAction}</p><small>{stageMap[x.stage]}</small></div></article>)}</div>
    <button className="missionButtonSub" onClick={()=>setTab("MISSIONS")}>Открыть полный план ↗</button>
   </section>
   <section className="missionPanel"><div className="missionHead"><small>02 / DATA HEALTH</small><h2>Система котировок</h2></div>
    <div className="missionStatus"><i className={health?.prerequisites.blocked?"warn":"warn"}/><div><strong>КОТИРОВКИ НЕ ПОДТВЕРЖДЕНЫ</strong><p>Наличие API-ключа не означает, что сегодня есть доступная и исполняемая цена.</p></div></div>
    {health?<div className="missionHealth">
     <div><span>Ключ The Odds API</span><b>{health.prerequisites.quoteAdapterKeyConfigured?"НАСТРОЕН":"НЕ НАСТРОЕН"}</b></div>
     <div><span>Список спортивных турниров</span><b>{health.prerequisites.quoteAllowlistConfigured?health.prerequisites.quoteSportsAllowlist.join(", "):"НЕ ЗАДАН"}</b></div>
     <div><span>Хранилище VETO</span><b>{health.prerequisites.persistenceConfigured?"НАСТРОЕНО":"НЕ НАСТРОЕНО"}</b></div>
     <div><span>CRON</span><b>{health.prerequisites.cronSecretConfigured?"НАСТРОЕН":"НЕ НАСТРОЕН"}</b></div>
     <div><span>Подтверждённых в этом модуле рыночных котировок</span><b>0</b></div>
    </div>:<p className="missionMuted">{healthError||"Проверяется статус окружения VETO без обращения к платному odds-провайдеру."}</p>}
    <p className="missionNote">Для просмотра реальных котировок нужен отдельный защищённый, лицензионно разрешённый витринный поток. Этот экран намеренно НЕ вызывает The Odds API при каждом открытии, чтобы не сжигать квоту.</p>
    <button className="missionButtonSub" onClick={()=>setTab("ODDS")}>Открыть кабинет котировок ↗</button>
   </section>
   <section className="missionPanel missionWide"><div className="missionHead"><small>03 / WORKFLOW</small><h2>Как пользоваться VETO каждый день</h2></div>
    <div className="missionSteps">{nextSteps.map((s,i)=><div key={i}><small>ШАГ {i+1}</small><p>{s}</p></div>)}</div>
    <div className="missionCtas"><a href="/research/high-hit">Выбрать вид спорта →</a><a href="/research/shadow-journal">Записать paper-наблюдение →</a><a href="/research/goal-cascade">Доказательства →</a></div>
   </section>
  </div>}
  {tab==="MISSIONS"&&<>
   <div className="missionHead missionListHead"><div><small>04 / RESEARCH BACKLOG</small><h2>Полная карта разработки</h2></div><button className="missionButtonSub" onClick={exportBoard}>Экспорт JSON / резервная копия ↗</button></div>
   <div className="missionFilters">{(["ALL","RESEARCH","ODDS","DATA","PRODUCT","SALES"] as const).map(x=><button key={x} type="button" className={track===x?"active":""} onClick={()=>setTrack(x)}>{x==="ALL"?"ВСЕ":trackMap[x]}</button>)}</div>
   <div className="missionList">{MISSIONS.filter(m=>track==="ALL"||m.track===track).map((m:Mission)=><article key={m.id} className="missionTask">
    <div className="missionTaskTop"><small>{trackMap[m.track]} · P{m.priority}</small><b className={"missionBadge "+stageClass[m.stage]}>{stageMap[m.stage]}</b></div>
    <h3>{m.title}</h3><p>{m.why}</p>
    <div className="missionTaskSections">
     <div><small>ЧТО УЖЕ ИЗВЕСТНО</small><span>{m.evidence}</span></div>
     <div><small>ЧТО ДЕЛАТЬ ДАЛЬШЕ</small><span>{m.nextAction}</span></div>
     <div><small>КОГДА СЧИТАТЬ СДЕЛАННЫМ</small><span>{m.doneWhen}</span></div>
    </div>
    <div className="missionTaskActions"><label>Моя отметка
     <select value={personal[m.id]??"TO_DO"} onChange={e=>updateTask(m.id,e.target.value as PersonalState)}>
      <option value="TO_DO">В моём списке</option><option value="IN_PROGRESS">Начал работать</option><option value="COMPLETE">Я завершил свою часть</option>
     </select></label>
     <div>{m.links?.map(l=><a key={l.href} href={l.href} target={l.href.startsWith("http")?"_blank":undefined} rel={l.href.startsWith("http")?"noreferrer":undefined}>{l.title} ↗</a>)}</div>
    </div>
   </article>)}</div>
   <p className="missionMuted">Моя отметка — личный чекбокс, она не меняет официальную готовность кода, статус GitHub или доказательность модели. Экспорт сохраняет только локальное состояние.</p>
  </>}
  {tab==="ODDS"&&<>
   <div className="missionHead missionListHead"><div><small>05 / PRICE INVESTIGATION</small><h2>Кабинет коэффициентов</h2></div><span>Математические пороги, НЕ реальные цены букмекеров</span></div>
   <section className="missionPanel">
    <div className="missionHead"><div><small>05A / ACTUAL STORED SOURCE MARKS</small><h2>Источники котировок · фактические записи</h2></div>
     <button type="button" className="missionButtonSub" onClick={()=>void refreshStoredSources()} disabled={sourceLoading}>{sourceLoading?"Проверяем хранилище…":"Обновить источники ↻"}</button>
    </div>
    <p className="missionMuted">Это снимки из существующего хранилища VETO, без новых платных запросов к букмекерам. Время провайдера не доказывает доступную цену, принятие ставки или статистическое преимущество.</p>
    {sourceError&&<p className="missionNote" role="status">{sourceError}</p>}
    {!sourceReport&&!sourceError&&<p className="missionMuted">{sourceLoading?"Читаем только сохранённые наблюдения.":"Открой «Обновить источники», чтобы проверить состояние."}</p>}
    {sourceReport&&<>
      <div className="missionHealth">
       <div><span>Событий из хранилища</span><b>{sourceReport.eventCount}</b></div>
       <div><span>Сохранённых снимков (в окне запроса)</span><b>{sourceReport.storedQuoteSnapshots}</b></div>
       <div><span>Уникальных контрактов в выборке</span><b>{sourceReport.uniqueContracts}</b></div>
       <div><span>Недавний timestamp поставщика ≤60 сек</span><b>{sourceReport.recentProviderTimestampCount}</b></div>
       <div><span>Отметка «рынок приостановлен»</span><b>{sourceReport.suspendedCount}</b></div>
       <div><span>Отсутствует timestamp поставщика</span><b>{sourceReport.missingProviderTimestampCount}</b></div>
       <div><span>Последний timestamp поставщика</span><b>{sourceReport.lastProviderAt?new Date(sourceReport.lastProviderAt).toLocaleString("ru-RU"):"—"}</b></div>
       <div><span>Подтверждено принятие ставки</span><b>НЕТ</b></div>
      </div>
      <p className="missionNote">{sourceReport.message} · Статус: {sourceReport.mode}. Реальные цены публично скрыты до проверки права их распространения.</p>
      {sourceReport.displayedQuotes.length>0&&<div className="missionQuoteRows">
       {sourceReport.displayedQuotes.map((q,i)=><article key={q.eventId+q.bookmaker+q.marketKey+q.selectionKey+i}>
        <header><b>{q.eventLabel}</b><small>{q.sport} · {q.eventState}</small></header>
        <p>{q.provider} / {q.bookmaker} · {q.marketKey} · {q.selectionLabel} {q.line??""}</p>
        <div><strong>{q.decimalOdds.toFixed(3)}</strong><span>{q.status}</span></div>
        <small>Источник: {q.providerLastUpdate??"нет времени"} · получено: {q.capturedAt}</small>
        <em>НЕ ПОДТВЕРЖДЕНЫ ДОСТУПНОСТЬ, ЛИМИТЫ И ИСПОЛНЕНИЕ</em>
       </article>)}
      </div>}
    </>}
   </section>
   <section className="missionPanel"><div className="missionPriceStrip">
    {fixedPrices.map(v=><div key={v}><small>КОЭФ. {v.toFixed(2)}</small><strong>{fmt(quoteBreakEven(v))}</strong><span>порог безубыточности</span></div>)}
   </div>
    <div className="missionHistorical"><h3>Какая цена вообще понадобилась бы по СТАРЫМ футбольным данным?</h3>
     <p className="missionMuted">Это не реальные предложенные коэффициенты. Минимальные коэффициенты вычислены математически из старой частоты 2012–2015. Ни один из них не подтверждает наличие предложения букмекера в 2026 году.</p>
     <div className="missionPriceMatrix"><div className="missionPriceMatrixHead"><span>ИСТОРИЧЕСКИЙ РЫНОК</span><span>НАБЛЮДЕНИЯ</span><span>ТОЧКА НОЛЯ</span><span>ПРИ НИЖНЕЙ 95% ГРАНИЦЕ</span></div>
      {historicalOddsFloors.map(row=><div key={row.label} className="missionPriceMatrixRow"><strong>{row.label} · 1:1, 80′</strong><span>{fmt(row.hit)} · n={row.n}</span><b>{row.empiricalFair?.toFixed(3)??"—"}</b><b>{row.lowerBoundFair?.toFixed(3)??"—"}</b></div>)}
     </div>
    </div>
    <p className="missionNote">При 1.05 один проигрыш уничтожает прибыль от 20 выигрышей. Таблица показывает только обязательную вероятность для нулевого математического ожидания без комиссии. Это не доступные котировки и не торговые сигналы.</p></section>
   <div className="missionGrid missionQuoteGrid">
    <section className="missionPanel"><div className="missionHead"><small>06 / MANUAL NOTEBOOK</small><h2>Записать увиденную котировку</h2></div>
     <p className="missionMuted">Запиши точный матч, рынок, исход, компанию и коэффициент. Время записи фиксируется браузером, но **не** подтверждает время публикации или принятия букмекером.</p>
     <div className="missionForm">
      <label>Спорт<select value={record.sport} onChange={e=>setRecord(o=>({...o,sport:e.target.value}))}><option value="football">Футбол</option><option value="tennis">Теннис</option><option value="volleyball">Волейбол</option><option value="baseball">Бейсбол</option><option value="basketball">Баскетбол</option><option value="hockey">Хоккей</option></select></label>
      <label>Матч / событие<input value={record.match} maxLength={160} placeholder="Team A — Team B" onChange={e=>setRecord(o=>({...o,match:e.target.value}))}/></label>
      <label>Рынок<input value={record.market} maxLength={140} onChange={e=>setRecord(o=>({...o,market:e.target.value}))}/></label>
      <label>Исход<input value={record.selection} maxLength={80} onChange={e=>setRecord(o=>({...o,selection:e.target.value}))}/></label>
      <label>Bookmaker / наблюдатель<input value={record.bookmaker} maxLength={120} placeholder="Название или ручная запись" onChange={e=>setRecord(o=>({...o,bookmaker:e.target.value}))}/></label>
      <label>Коэффициент<input type="number" step=".01" min="1.01" max="1000" value={record.odds} onChange={e=>setRecord(o=>({...o,odds:e.target.value}))}/></label>
     </div>
     <button className="missionButtonMain" type="button" onClick={addQuote}>Зафиксировать ручное наблюдение</button>
     {notice&&<p className="missionMuted" role="status">{notice}</p>}
    </section>
    <section className="missionPanel"><div className="missionHead"><small>07 / PAST MANUAL OBSERVATIONS</small><h2>История цен ({quotes.length})</h2></div>
     <div className="missionQuoteRows">{quoteRows.length?quoteRows.map(q=><article key={q.id}><header><b>{q.eventLabel}</b><small>{q.sport}</small></header>
      <p>{q.market} · {q.selection} · {q.bookmaker}</p>
      <div><strong>{q.decimalOdds.toFixed(2)}</strong><span>порог {fmt(q.breakEvenProbability)}</span></div>
      <small>Записано: {new Date(q.capturedAt).toLocaleString("ru-RU")} · {q.ageSeconds>=0?Math.round(q.ageSeconds)+" сек назад":"часы устройства рассинхронизированы"}</small>
      <em>НЕ ПРОВЕРЕННОЕ ИСПОЛНЕНИЕ · {q.status}</em>
     </article>):<p className="missionMuted">Ни одной ручной записи. Мы НЕ подставляем фальшивые live-коэффициенты для заполнения экрана.</p>}</div>
     <button className="missionButtonSub" type="button" onClick={exportBoard}>Экспортировать журнал и задачи ↗</button>
     <p className="missionNote">История хранится только на этом устройстве. Отметка «недавно записано» не подтверждает свежесть букмекерской котировки. Нельзя выводить вероятность исхода из одной цены без учёта маржи.</p>
    </section>
   </div>
  </>}
  {tab==="SOURCES"&&<>
   <div className="missionHead missionListHead"><div><small>08 / EVIDENCE LIBRARY</small><h2>Куда идти за исследованиями</h2></div><span>Проверенные точки входа · лицензия и ограничения важны</span></div>
   <div className="missionSources">{SOURCES.map(x=><article key={x.id}><small>{x.kind}</small><h3>{x.name}</h3><p>{x.evidence}</p><div className="missionSourceLic">ПРАВА / ОГРАНИЧЕНИЯ<br/>{x.licensing}</div><a href={x.url} target="_blank" rel="noreferrer">Открыть официальный источник ↗</a></article>)}</div>
  </>}
  {notice&&tab!=="ODDS"&&<p role="status" className="missionMuted">{notice}</p>}
  <footer className="missionFooter"><span>MISSION CONTROL · {BOARD_VERSION}</span><span>NO EXECUTABLE BOOKMAKER PRICES VERIFIED · NO VALIDATED EDGE · RESEARCH ONLY</span><a href="/research/high-hit">HIGH-HIT LAB ↗</a></footer>
 </main>;
}
