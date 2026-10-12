"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import type {LiveEventSummary} from "@/lib/live/types";
import {HIGH_HIT_CATALOG,type HighHitSport} from "@/lib/research/high-hit/catalog";
import {quoteBreakEven} from "@/lib/research/mission-control/quotes";
import type {SourceObservatoryReport} from "@/lib/research/mission-control/source-observatory";
import {screenPersistedResearchMatches} from "@/lib/research/watchlist/engine";
import "./watchlist.css";

type LiveResponse = {mode: string; generatedAt: string; events: LiveEventSummary[]};
const priority = [
 "football-late-under-45","football-late-under-35","baseball-late-ml",
 "tennis-late-set","volleyball-set","football-late-under-55",
 "basketball-late-winner","hockey-late-winner"
];
const items = [...HIGH_HIT_CATALOG].sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id));
const sports: Array<{id:"all"|HighHitSport;label:string}> = [
 {id:"all",label:"Все рынки"},{id:"football",label:"Футбол"},{id:"baseball",label:"Бейсбол"},
 {id:"tennis",label:"Теннис"},{id:"volleyball",label:"Волейбол"},
 {id:"basketball",label:"Баскетбол"},{id:"hockey",label:"Хоккей"}
];
const pct = (n:number)=>(100*n).toFixed(2).replace(".",",")+"%";
const dateLabel = (value:string)=>{const t=Date.parse(value);return Number.isFinite(t)?new Date(t).toLocaleString("ru-RU"):"время неизвестно";};
export default function ResearchWatchlistPage(){
 const [sport,setSport]=useState<"all"|HighHitSport>("all");
 const [selected,setSelected]=useState("football-late-under-45");
 const [odds,setOdds]=useState("1.05");
 const [live,setLive]=useState<LiveResponse|null>(null);
 const [report,setReport]=useState<SourceObservatoryReport|null>(null);
 const [status,setStatus]=useState<"CHECKING"|"READY"|"UNAVAILABLE">("CHECKING");
 const [lastCheck,setLastCheck]=useState("");
 const [copyStatus,setCopyStatus]=useState("");
 const [now,setNow]=useState<string>("");
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  let active=true;
  async function refresh(){
   try{
    const [eventsResult,sourceResult]=await Promise.all([
      fetch("/api/live/events",{cache:"no-store"}),
      fetch("/api/intelligence/research/source-observatory",{cache:"no-store"})
    ]);
    if(!eventsResult.ok)throw new Error("Event source failed");
    const events:LiveResponse=await eventsResult.json();
    if(!events||!Array.isArray(events.events)||typeof events.mode!=="string")throw new Error("Invalid event response");
    const sources:SourceObservatoryReport|null=sourceResult.ok?await sourceResult.json():null;
    if(active){
     setLive(events);
     setReport(sources);
     setNow(new Date().toISOString());
     setLastCheck(new Date().toISOString());
     setStatus("READY");
    }
   }catch{
    if(active){setLive(null);setReport(null);setStatus("UNAVAILABLE");setNow(new Date().toISOString());}
   }
  }
  void refresh();
  const interval=window.setInterval(()=>{void refresh();},45_000);
  return()=>{active=false;window.clearInterval(interval);};
 },[refreshKey]);
 const candidates=useMemo(()=>live&&now?screenPersistedResearchMatches({
  mode:live.mode,events:live.events,asOf:now
 }):[],[live,now]);
 const active=items.find(x=>x.id===selected)??items[0];
 const rawOdds=Number(odds);
 const threshold=Number.isFinite(rawOdds)&&rawOdds>1&&rawOdds<=1000?quoteBreakEven(rawOdds):null;
 const hasActualData=live?.mode==="persisted";
 const historical=active.observed;
 const historicP=historical?historical.wins/(historical.wins+historical.losses):active.referenceRate??null;
 const describedEvidence=historical?
   "Наблюдения "+historical.wins+"/"+(historical.wins+historical.losses)+" за "+historical.period+". Нет синхронизированных котировок.":
   active.evidence==="OFFICIAL_AGGREGATE"?"Опубликованный исторический пример; неизвестен независимый размер сопоставимой выборки.":
   "Исследовательская гипотеза: вероятность на реальных данных не подтверждена.";
 const caseText=[
  "VETO SPORT / MARKET RESEARCH CASE (НЕ СТАВКА)",
  "Спорт: "+active.sportLabel,
  "Что посмотреть: "+active.selection,
  "Точное условие: "+active.state,
  "Правила рынка: "+active.marketSemantics,
  "Главный риск: "+active.risk,
  "Историческая частота или reference: "+(historicP===null?"не подтверждена":pct(historicP)),
  "Качество: "+describedEvidence,
  "Ручной пример коэффициента (не live): "+(threshold===null?"не введён":rawOdds.toFixed(3)),
  "Математический порог безубыточности: "+(threshold===null?"неизвестен":pct(threshold)),
  "Обязательные проверки: точный матч и состояние, bookmaker/provider, marketKey/line, время котировки, suspension, расчёт исхода, доступность, права на данные, независимая калибровка.",
  "ВЕРДИКТ: PASS_RESEARCH_ONLY. Реальная ставка и положительный EV не подтверждены."
 ].join("\n");
 const copy=useCallback(async()=>{
  try{await navigator.clipboard.writeText(caseText);setCopyStatus("Чеклист скопирован. Вставь в ChatGPT для проверки.");}
  catch{setCopyStatus("Не удалось скопировать автоматически; выдели текст в поле ниже.");}
 },[caseText]);
 return <main className="watchRoot">
  <header className="watchHeader">
   <a href="/" className="watchBrand">VETO <span>SPORT</span></a>
   <span>ZERO–S / RESEARCH WATCHLIST</span>
   <a href="/research/mission-control">MISSION CONTROL ↗</a>
  </header>
  <section className="watchHero">
   <div className="watchEyebrow"><i/> РЕЕСТР РЫНКОВ ДЛЯ ПРОВЕРКИ <b>НЕ СИГНАЛЫ К СТАВКАМ</b></div>
   <h1>Какие рынки<br/><em>проверить сегодня?</em></h1>
   <p>Не обещания «90% побед», а конкретные состояния матчей и рынки, которые нужно исследовать. Сначала данные, время и цена — затем независимая проверка. <strong>До неё везде PASS.</strong></p>
   <div className="watchHeroActions"><a href="#watchConditions">Что искать ↓</a><a href="#watchLive">Сохранённые события ↗</a><a href="/research/shadow-journal">Paper-журнал ↗</a></div>
  </section>
  <div className="watchStats">
   <article><small>ИССЛЕДОВАТЕЛЬСКИХ СЦЕНАРИЕВ</small><strong>{items.length}</strong><span>6 видов спорта</span></article>
   <article><small>СОБЫТИЯ, СООТВЕТСТВУЮЩИЕ УСЛОВИЮ</small><strong>{status==="CHECKING"?"…":candidates.length}</strong><span>только сохранённые события, 1:1 после 80′</span></article>
   <article><small>ИСТОЧНИК МАТЧЕЙ</small><strong className="watchSmallNumber">{status==="UNAVAILABLE"?"НЕТ ДОСТУПА":status==="CHECKING"?"ПРОВЕРКА":hasActualData?"PERSISTED":"DEMO / НЕТ ДАННЫХ"}</strong><span>демо никогда не попадает в кандидаты</span></article>
   <article><small>ДОКАЗАННЫЙ ПОЛОЖИТЕЛЬНЫЙ EV</small><strong>0</strong><span>не подтверждён независимым тестом</span></article>
  </div>
  <section id="watchLive" className="watchSurface">
   <div className="watchSurfaceTitle"><div><small>01 / SOURCE-BOUND MATCH SCANNER</small><h2>Что найдено в хранилище</h2></div>
    <button type="button" className="watchRefresh" onClick={()=>{setStatus("CHECKING");setRefreshKey(x=>x+1);}}>Проверить заново ↻</button></div>
   <p className="watchSub">Экран не обращается напрямую к платным букмекерам и не выводит демо-матчи как реальные. Кандидат — лишь сохранённое состояние игры, а не ставка или подтверждённый live-коэффициент.</p>
   {status==="UNAVAILABLE"?<div className="watchEmpty"><strong>Источник временно недоступен.</strong><p>Кандидаты скрыты. Не заменяем их вымышленными матчами или ценами.</p></div>:
    status==="CHECKING"?<div className="watchEmpty"><strong>Проверяем источник…</strong><p>Никаких сигналов до подтверждения данных.</p></div>:
    candidates.length===0?<div className="watchEmpty"><strong>Подтверждённых совпадений сейчас нет.</strong><p>{hasActualData?"В сохранённом потоке не найден футбольный live-матч со счётом 1:1 после 80-й минуты.":"Система вернула демонстрационный fallback или пустой поток. Он не используется для этого экрана."} Посмотри ниже исследовательские условия, но не воспринимай их как сегодняшние ставки.</p></div>:
    <div className="watchMatches">{candidates.map(row=><article key={row.event.id}>
     <div className="watchMatchTop"><span>⚽ {row.event.competition}</span><b>ТОЛЬКО ПРОВЕРКА</b></div>
     <h3>{row.event.homeName} — {row.event.awayName}</h3>
     <div className="watchScore"><strong>{row.event.homeScore}:{row.event.awayScore}</strong><span>{row.event.clock} · {row.event.period}</span></div>
     <p>Условие: 1:1 после 80′. <b>Посмотреть наличие и правила Total Under 4.5</b>, сравнить с текущей линией, проверить минуты и отсутствие suspension.</p>
     <div className="watchMeta"><span>Источник: PERSISTED</span><span>Снимок: {row.freshness==="RECENT_SNAPSHOT"?"≤ 120 сек":row.freshness==="STALE_SNAPSHOT"?"УСТАРЕЛ":"ВРЕМЯ НЕ ПОДТВЕРЖДЕНО"}</span></div>
     <small>Изменено: {row.event.lastUpdatedAt?dateLabel(row.event.lastUpdatedAt):"неизвестно"} · наличие рынка и коэффициент НЕ подтверждены.</small>
     <a href={"/?event="+encodeURIComponent(row.event.id)}>Открыть наблюдение в VETO ↗</a>
    </article>)}</div>}
   <p className="watchSource">Источник коэффициентов: {report?report.mode+" · снимков "+report.storedQuoteSnapshots+" · свежих отметок поставщика "+report.recentProviderTimestampCount:"не подтверждён"} · Последняя проверка: {lastCheck?dateLabel(lastCheck):"—"}. Ни один матч не прошёл проверку исполнения ставки.</p>
  </section>
  <section id="watchConditions" className="watchSurface watchIdeas">
   <div className="watchSurfaceTitle"><div><small>02 / HUMAN RESEARCH QUEUE</small><h2>Какие именно рынки смотреть</h2></div><span>Не текущие предложения букмекеров</span></div>
   <div className="watchFilters">{sports.map(x=><button key={x.id} type="button" aria-pressed={sport===x.id} onClick={()=>setSport(x.id)} className={sport===x.id?"active":""}>{x.label}</button>)}</div>
   <div className="watchIdeaGrid">{items.filter(x=>sport==="all"||x.sport===sport).map((x,i)=>{
    const p=x.observed?x.observed.wins/(x.observed.wins+x.observed.losses):x.referenceRate??null;
    return <button className={"watchIdea "+(selected===x.id?"selected":"")} type="button" key={x.id} aria-pressed={selected===x.id} onClick={()=>{setSelected(x.id);setCopyStatus("");}}>
      <div><small>{String(priority.indexOf(x.id)+1).padStart(2,"0")} / {x.sportLabel}</small><span>{x.evidence==="HYPOTHESIS_NO_RATE"?"ГИПОТЕЗА":x.evidence==="OFFICIAL_AGGREGATE"?"ИСТОРИЧЕСКИЙ ПРИМЕР":"СТАРАЯ ВЫБОРКА"}</span></div>
      <h3>{x.selection}</h3><p>{x.state}</p>
      <footer><strong>{p===null?"НЕТ ОЦЕНКИ":pct(p)}</strong><span>Проверить условие ↗</span></footer>
     </button>;
   })}</div>
   <div className="watchChecklist">
    <div className="watchSelected"><small>03 / SELECTED HYPOTHESIS</small><h2>{active.sportLabel} / {active.selection}</h2><p>{active.state}</p>
     <div className="watchDetail"><small>ЧТО ПРОВЕРЯТЬ В ЛИНИИ</small><strong>{active.marketSemantics}</strong></div>
     <div className="watchDetail"><small>ПОЧЕМУ МОЖЕТ НЕ СРАБОТАТЬ</small><strong>{active.risk}</strong></div>
     <div className="watchDetail"><small>КАЧЕСТВО ИСТОРИИ</small><strong>{describedEvidence}</strong></div>
     <div className="watchDetail"><small>ЧТО ДЕЛАТЬ</small><strong>Найти точное событие и рынок, время снимка, провайдера, suspension, правило расчёта и независимую оценку вероятности. Пока нет — PASS.</strong></div>
    </div>
    <div className="watchPrice">
     <small>04 / PRICE REALITY CHECK</small><h2>Цена ≠ вероятность</h2>
     <p>Введи увиденный или гипотетический коэффициент. Это ручное число: оно НЕ подтверждено букмекером.</p>
     <label>Десятичный коэффициент (ручной ввод)<input type="number" inputMode="decimal" min="1.001" max="1000" step="0.01" value={odds} onChange={e=>setOdds(e.target.value)}/></label>
     <div className="watchBreak"><small>ПОРОГ БЕЗУБЫТОЧНОСТИ</small><strong>{threshold===null?"НЕКОРРЕКТНАЯ ЦЕНА":pct(threshold)}</strong><span>без комиссии / проскальзывания, не вероятность победы</span></div>
     <p>Высокая историческая частота не доказывает прибыль, особенно при очень маленьком коэффициенте. Нужны современный независимый тест и реальная доступная цена.</p>
     <button type="button" onClick={()=>{void copy();}}>Скопировать кейс для ChatGPT ↗</button>
     {copyStatus&&<p role="status">{copyStatus}</p>}
     <textarea readOnly aria-label="Исследовательский кейс для ручной передачи в ChatGPT" value={caseText} rows={8}/>
     <div className="watchBottomLinks"><a href="/research/high-hit">Открыть глубокое исследование ↗</a><a href="/research/mission-control">Проверить источники и план ↗</a></div>
    </div>
   </div>
  </section>
  <footer className="watchFooter"><span>VETO SPORT / ZERO–S</span><span>NO EXECUTABLE QUOTES · NO VERIFIED EDGE · NO AUTO-WAGER</span><a href="/">TERMINAL ↗</a></footer>
 </main>;
}
