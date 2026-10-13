"use client";

import {useEffect,useMemo,useState} from "react";
import {PitchVision} from "@/components/PitchVision";
import {OpportunityRadar} from "@/components/OpportunityRadar";
import {VetoMark} from "@/components/VetoMark";
import {SportAppearanceToggle} from "@/components/SportAppearanceToggle";
import type {LiveEventSummary, LiveQuotePreview} from "@/lib/live/types";
import {getObservedFreshness} from "@/lib/live/freshness";
import {screenPersistedResearchMatches} from "@/lib/research/watchlist/engine";
import "./watchlist.css";

type LiveFeed={mode:"persisted"|"sandbox-fallback";generatedAt:string;events:LiveEventSummary[];warning?:string};
const formatted=(time?:string)=>time&&Number.isFinite(Date.parse(time))?new Date(time).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"неизвестно";
const ageLabel=(seconds:number|null)=>seconds===null?"нет времени":seconds<60?String(seconds)+" сек. назад":String(Math.floor(seconds/60))+" мин. назад";
const validPrice=(v:string)=>{const n=Number(v);return v.trim()&&Number.isFinite(n)&&n>1&&n<=1000?n:null;};

export default function ResearchWatchlistPage(){
 const [feed,setFeed]=useState<LiveFeed|null>(null);
 const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
 const [now,setNow]=useState(0);
 const [selectedId,setSelectedId]=useState("");
 const [manualOdds,setManualOdds]=useState("");
 const [marketQuotes,setMarketQuotes]=useState<LiveQuotePreview[]>([]);
 const [refresh,setRefresh]=useState(0);
 const [note,setNote]=useState("");
 const [filter,setFilter]=useState<"all"|"live"|"candidates">("all");

 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const response=await fetch("/api/live/events",{cache:"no-store"});
    if(!response.ok)throw new Error("feed response");
    const data:LiveFeed=await response.json();
    if(!Array.isArray(data?.events)||!["persisted","sandbox-fallback"].includes(data.mode))throw new Error("invalid feed");
    if(active){setFeed(data);setNow(Date.now());setStatus("ready");}
   }catch{if(active){setStatus("error");setNow(Date.now());}}
  }
  void load();
  const timer=setInterval(()=>void load(),35_000);
  return()=>{active=false;clearInterval(timer);};
 },[refresh]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15_000);return()=>clearInterval(timer);},[]);

 const observed=useMemo(()=>feed?.mode==="persisted"?feed.events.filter(x=>x.source==="persisted"):[],[feed]);
 const football=useMemo(()=>observed.filter(x=>x.sport==="football").sort((a,b)=>{
   const aFresh=getObservedFreshness(a,now).freshLive?1:0,bFresh=getObservedFreshness(b,now).freshLive?1:0;
   return bFresh-aFresh||(Date.parse(b.lastUpdatedAt||"")||0)-(Date.parse(a.lastUpdatedAt||"")||0);
 }),[observed,now]);
 const fresh=football.filter(x=>getObservedFreshness(x,now).freshLive);
 const candidates=useMemo(()=>feed?.mode==="persisted"&&now>0?
   screenPersistedResearchMatches({mode:"persisted",events:football,asOf:new Date(now).toISOString()}):
   [],[feed,football,now]);
 const currentCandidates=candidates.filter(x=>x.freshness==="RECENT_SNAPSHOT");
 const focus=football.find(x=>x.id===selectedId)??currentCandidates[0]?.event??fresh[0]??football[0]??null;
 const shown=filter==="candidates"?currentCandidates.map(x=>x.event):filter==="live"?fresh:football;
 useEffect(()=>{
  let active=true;
  setMarketQuotes([]);
  if (!focus || focus.source!=="persisted") return()=>{active=false;};
  const query="/api/live/workspace?id="+encodeURIComponent(focus.id);
  fetch(query,{cache:"no-store"})
   .then(r=>r.ok?r.json():null)
   .then(data=>{if(active){setMarketQuotes(Array.isArray(data?.observation?.quotes)?
     (data.observation.quotes as LiveQuotePreview[]).filter(q=>q.provider==="the-odds-api"||q.provider==="api-football-live-odds"):[]);}})
   .catch(()=>{if(active)setMarketQuotes([]);});
  return()=>{active=false;};
 },[focus?.id]);
 const mostRecentQuote=marketQuotes.length?marketQuotes.reduce((a,b)=>Date.parse(a.capturedAt)>Date.parse(b.capturedAt)?a:b):null;
 const quoteAgeMs=mostRecentQuote&&now?now-Date.parse(mostRecentQuote.capturedAt):null;
 const price=validPrice(manualOdds);
 const breakEven=price?(100/price).toFixed(2).replace(".",",")+"%":null;
 const candidate=focus?currentCandidates.find(x=>x.event.id===focus.id):null;
 const providerLabel=feed?.mode==="persisted"?"СОХРАНЁННЫЕ РЕАЛЬНЫЕ СОБЫТИЯ":"ДЕМО / РЕАЛЬНЫЙ ПОТОК НЕ ПОДТВЕРЖДЁН";
 const copyCase=async()=>{
  const content=[
    "VETO SPORT · ИССЛЕДОВАНИЕ (НЕ РЕКОМЕНДАЦИЯ)",
    focus?"Матч: "+focus.homeName+" — "+focus.awayName:"Матч не выбран",
    focus?"Источник: "+focus.source+"; снимок: "+(focus.lastUpdatedAt??"нет")+"; счёт: "+focus.homeScore+":"+focus.awayScore+"; минута: "+focus.clock:"",
    "Что посмотреть: доступность точного рынка Total Under 4.5 при 1:1 после 80-й минуты (историческая гипотеза).",
    "Проверить: настоящий коэффициент букмекера, статус рынка, актуальность, правила расчёта, независимую вероятность и EV.",
    "Ручной пример цены: "+(price===null?"нет":price)+"; порог безубыточности: "+(breakEven||"неизвестен"),
    "До проверки: ТОЛЬКО PAPER / PASS. Нет верифицированной линии и преимущества."
  ].filter(Boolean).join("\n");
  try{await navigator.clipboard.writeText(content);setNote("Чеклист скопирован.");}
  catch{setNote("Не удалось скопировать автоматически. Проверь разрешения браузера.");}
 };
 return <main className="watchRoot watchReal">
  <header className="watchHeader">
   <a href="/" className="watchBrand" aria-label="VETO Sport — главный экран"><VetoMark size={30}/> VETO <span>SPORT</span></a>
   <span>LIVE / SOURCE / RESEARCH</span>
   <div className="watchHeaderActions"><SportAppearanceToggle /><a href="/?view=matches">← К МАТЧАМ</a></div>
  </header>
  <section className="watchRealHero">
    <div className="watchRealHeroCopy">
     <div className="watchEyebrow"><i/> VETO SPORT / ЧТО ПРОВЕРИТЬ <b>НЕ ГОТОВЫЕ СТАВКИ</b></div>
     <h1>Что смотреть<br/><em>прямо сейчас?</em></h1>
     <p>Настоящие матчи из нашего источника, понятная проверка ситуации и честное время снимка. Никаких нарисованных коэффициентов и обещаний выигрыша.</p>
     <div className="watchHeroActions">
      <a href="#watchRadar">Исследовать матчи ↗</a>
      <a href="#watchResearch">Что проверить в линии ↓</a>
      <a href="/research/discovery">Исследования без ограничений ↗</a>
     </div>
     <p className="watchRealDisclosure">API-Football FREE опрашивается примерно раз в 30 минут. Снимок матча — не видеотрансляция и не текущая букмекерская линия.</p>
    </div>
    <div className="watchRealHeroVision">
     {focus?<PitchVision event={focus} onOpen={()=>{window.location.href="/?event="+encodeURIComponent(focus.id)+"&view=check";}}/>:
      <div className="watchEmpty"><strong>Ожидаем первый реальный матч</strong><p>Демонстрационные события не показываются как реальные.</p><a href="/">Открыть демо-терминал ↗</a></div>}
    </div>
  </section>
  <div className="watchStats" role="status" aria-live="polite">
   <article><small>СОХРАНЁННЫХ СОБЫТИЙ</small><strong>{status==="loading"?"…":football.length}</strong><span>{providerLabel}</span></article>
   <article><small>СВЕЖИХ LIVE-СНИМКОВ</small><strong>{status==="loading"?"…":fresh.length}</strong><span>состояние обновлено ≤ 120 сек назад</span></article>
   <article><small>СОВПАДЕНИЙ ДЛЯ ИССЛЕДОВАНИЯ</small><strong>{status==="loading"?"…":currentCandidates.length}</strong><span>1:1 после 80' · только наблюдение</span></article>
   <article><small>КОТИРОВОК ДЛЯ ВЫБРАННОГО МАТЧА</small><strong>{marketQuotes.length}</strong><span>{marketQuotes.length?"Сохранённая линия; свежесть проверяйте ниже":"Пока нет совпавших предложений букмекеров"}</span></article>
  </div>
  <OpportunityRadar/>
  <section className="watchSurface" id="watchLive">
   <div className="watchSurfaceTitle">
    <div><small>01 / MATCH INTELLIGENCE</small><h2>Матчи в источнике</h2></div>
    <button className="watchRefresh" type="button" onClick={()=>{setStatus("loading");setRefresh(x=>x+1);}}>Обновить ↻</button>
   </div>
   <p className="watchSub">Время проверки: {formatted(feed?.generatedAt)}. Данные из API-Football проходят через сервер VETO и сохраняются с указанием времени снимка. Устаревшие матчи остаются видимыми, но помечены как архивные снимки.</p>
   <div className="watchFilters">
    {([{id:"all",label:"Все сохранённые"},{id:"live",label:"Свежие ≤ 2 мин"},{id:"candidates",label:"Условие 1:1 / 80′"}] as const).map(x=><button type="button" key={x.id} aria-pressed={filter===x.id} className={filter===x.id?"active":""} onClick={()=>setFilter(x.id)}>{x.label}</button>)}
   </div>
   {status==="error"?<div className="watchEmpty"><strong>Источник недоступен</strong><p>Не используем вымышленные результаты в качестве резервных.</p></div>:
     status==="loading"?<div className="watchEmpty"><strong>Запрашиваем сохранённые матчи…</strong><p>Не обращаемся напрямую к платному провайдеру.</p></div>:
     shown.length===0?<div className="watchEmpty"><strong>Для этого фильтра сейчас нет матчей.</strong><p>{feed?.mode==="sandbox-fallback"?"Реальные матчи ещё не записаны. На главной доступны только явно отмеченные примеры.":"Свежесть ограничена бесплатным интервалом обновлений. Можно посмотреть все сохранённые события."}</p><button type="button" className="watchRefresh" onClick={()=>setFilter("all")}>Показать все</button></div>:
     <div className="watchMatches">{shown.slice(0,30).map(event=>{
       const age=getObservedFreshness(event,now);
       const matched=currentCandidates.some(x=>x.event.id===event.id);
       return <article className={"watchRealMatch "+(focus?.id===event.id?"selected":"")} key={event.id}>
        <div className="watchMatchTop"><span>{event.competition}</span><b>{matched?"ПРОВЕРИТЬ УСЛОВИЕ":age.freshLive?"СВЕЖИЙ СНИМОК":age.stale?"АРХИВНЫЙ СНИМОК":"НЕТ ВРЕМЕНИ"}</b></div>
        <h3>{event.homeName} — {event.awayName}</h3>
        <div className="watchScore"><strong>{event.homeScore}:{event.awayScore}</strong><span>{event.clock} / {event.status==="live"?(age.freshLive?"СВЕЖИЙ LIVE-СНИМОК":age.delayedLive?"ИСТОЧНИК: LIVE · ДАННЫЕ ЗАДЕРЖАНЫ":"LIVE БЫЛ В ПОСЛЕДНЕЙ ЗАПИСИ · FT НЕ ПОДТВЕРЖДЁН"):"СТАТУС: "+event.status}</span></div>
        <p>{matched?"1:1 после 80′. Имеет смысл изучить наличие и условия Total Under 4.5. Коэффициент не подтверждён.":event.status==="live"?"Снимок матча сохранён. Сам по себе счёт не означает наличия ставки с преимуществом.":"Событие сохранено в хранилище."}</p>
        <div className="watchMeta"><span>{age.label}</span><span>{ageLabel(age.ageSeconds)}</span><span>Рынков: {event.markets}</span></div>
        <div className="watchMatchActions"><button type="button" onClick={()=>{setSelectedId(event.id);document.getElementById("watchResearch")?.scrollIntoView({behavior:"smooth"});}}>Исследовать ↓</button><a href={"/?event="+encodeURIComponent(event.id)+"&view=check"}>Открыть анализ ↗</a></div>
       </article>;
     })}</div>}
  </section>
  <section className="watchSurface" id="watchResearch">
   <div className="watchSurfaceTitle"><div><small>02 / RESEARCH ONLY</small><h2>Что проверить перед любым решением</h2></div><span>Никакой автоматической ставки</span></div>
   <div className="watchRealResearch">
    <article className="watchSelected">
     <small>ВЫБРАННЫЙ МАТЧ / ИССЛЕДОВАНИЕ</small>
     <h2>{focus?focus.homeName+" — "+focus.awayName:"Матч не выбран"}</h2>
     <p>{focus?"Счёт "+focus.homeScore+":"+focus.awayScore+" · "+focus.clock+" · Снимок: "+formatted(focus.lastUpdatedAt):"Дождитесь записи события в хранилище."}</p>
     <div className="watchDetail"><small>УСЛОВИЕ</small><strong>1:1 после 80-й минуты. Проверять, существует ли рынок «Тотал меньше 4.5» и каковы реальные условия его расчёта.</strong></div>
     <div className="watchDetail"><small>СТАТУС ДАННЫХ</small><strong>{candidate?"Есть свежее совпадение, но нет подтверждённой цены.":"Условие сейчас не подтверждено свежим снимком. Пока только исследование."}</strong></div>
     <div className="watchDetail"><small>РИСК И ОГРАНИЧЕНИЯ</small><strong>Голы в оставшееся время, задержки провайдера, дополнительное время, остановка рынков, невыгодный коэффициент, изменившаяся статистика. Историческая частота не гарантирует прибыль.</strong></div>
     <div className="watchDetail"><small>СОХРАНЁННАЯ БУКМЕКЕРСКАЯ ЛИНИЯ</small>
      <strong>{marketQuotes.length?"Реальные снимки The Odds API / API-Football In-Play с отметками времени. Для некоторых линий источник не называет букмекера; доступность ставки не гарантирована.":"Для этого матча нет сохранённых котировок. Не подменяем их ручными оценками."}</strong>
      {mostRecentQuote&&<p>Последняя отметка букмекера: {formatted(mostRecentQuote.capturedAt)} · {quoteAgeMs!==null&&quoteAgeMs>=0?Math.floor(quoteAgeMs/60000)+" мин назад":"время не подтверждено"} · {quoteAgeMs!==null&&quoteAgeMs>120000?"АРХИВ · НЕ ТЕКУЩИЕ LIVE-КОЭФФИЦИЕНТЫ":"СНИМОК · НЕ ПОДТВЕРЖДЕНА ДОСТУПНОСТЬ"}</p>}
      {marketQuotes.slice(0,8).map(q=><div className="watchRealQuote" key={q.bookmaker+"-"+q.marketKey+"-"+q.selectionKey+"-"+q.capturedAt}>
        <span>{q.provider} · {q.bookmaker} · {q.marketKey}</span><strong>{q.selectionLabel}</strong><b>{q.suspended?"ПРИОСТАНОВЛЕНО":q.decimalOdds.toFixed(2)}</b>
        <small>{formatted(q.capturedAt)}</small>
      </div>)}
     </div>
    </article>
    <aside className="watchPrice">
     <small>03 / MANUAL ODDS CHECK</small><h2>Если нашёл коэффициент</h2>
     <p>Введи увиденную цену вручную. VETO рассчитает только порог безубыточности — это не прогноз исхода.</p>
     <label>Коэффициент (ручной ввод)<input type="number" inputMode="decimal" min="1.001" max="1000" step="0.01" placeholder="например, 1.25" value={manualOdds} onChange={e=>setManualOdds(e.target.value)}/></label>
     <div className="watchBreak"><small>ТРЕБУЕМАЯ ВЕРОЯТНОСТЬ БЕЗУБЫТОЧНОСТИ</small><strong>{breakEven||"—"}</strong><span>1 / коэффициент · без комиссии и проскальзывания</span></div>
     <p>При маленьких коэффициентах даже очень высокая проходимость может быть убыточной. Понадобятся независимые данные и проверка котировки.</p>
     <button type="button" onClick={()=>void copyCase()}>Скопировать чеклист для ChatGPT ↗</button>
     {note&&<p role="status">{note}</p>}
     <a className="watchRealBack" href="/">← Вернуться в VETO Sport</a>
    </aside>
   </div>
  </section>
  <footer className="watchFooter"><span>VETO / SPORTS INTELLIGENCE</span><span>REAL SCORE SNAPSHOTS · NO VERIFIED LIVE ODDS · PAPER ONLY</span><a href="/">ТЕРМИНАЛ ↗</a></footer>
 </main>;
}
