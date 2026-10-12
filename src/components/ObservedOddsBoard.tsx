"use client";

import {useMemo,useState} from "react";
import type {LiveQuotePreview} from "@/lib/live/types";

type Tab="all"|"h2h"|"totals";
const fmt=(s:string)=>Number.isFinite(Date.parse(s))?new Date(s).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"нет подтверждения";
const age=(s:string,now:number)=>{const n=Math.floor((now-Date.parse(s))/60000);return Number.isFinite(n)&&n>=0?n===0?"<1 мин":`${n} мин`:"неизвестно";};
const group=(marketKey:string)=>marketKey.toLowerCase().endsWith(".h2h")||marketKey==="h2h"?"h2h":marketKey.toLowerCase().endsWith(".totals")||marketKey==="totals"?"totals":"other";

export function ObservedOddsBoard({quotes}: {quotes:LiveQuotePreview[]}){
 const [tab,setTab]=useState<Tab>("all");
 const [expanded,setExpanded]=useState(false);
 const [explain,setExplain]=useState(false);
 const now=Date.now();
 const normalized=useMemo(()=>{
  const latest=new Map<string,LiveQuotePreview>();
  for(const quote of quotes){
   if(!Number.isFinite(quote.decimalOdds)||quote.decimalOdds<=1||!Number.isFinite(Date.parse(quote.capturedAt)))continue;
   const key=[quote.provider,quote.bookmaker,quote.marketKey,quote.selectionKey].join("|");
   const earlier=latest.get(key);
   if(!earlier||Date.parse(quote.capturedAt)>Date.parse(earlier.capturedAt))latest.set(key,quote);
  }
  return [...latest.values()].sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt));
 },[quotes]);
 const current=normalized.filter(q=>tab==="all"||group(q.marketKey)===tab);
 const visible=expanded?current:current.slice(0,8);
 const newest=normalized[0];
 const allBooks=new Set(normalized.map(q=>q.bookmaker));
 const currentSource=normalized.some(q=>q.provider==="the-odds-api")?"THE ODDS API":"PROVIDER ARCHIVE";
 const readyCount=normalized.filter(q=>!q.suspended&&now-Date.parse(q.capturedAt)>=0&&now-Date.parse(q.capturedAt)<=120_000).length;
 const uniqueMarkets=new Set(normalized.map(q=>q.marketKey)).size;
 return <section className="observedOddsStudio" id="veto-odds-studio">
   <header className="observedStudioSectionHead">
    <div><span>02 / BOOKMAKER INTELLIGENCE</span><h3>Коэффициенты букмекеров</h3><p>Реальные сохранённые цены, с указанием источника и времени. Не торговый терминал.</p></div>
    <span className="observedStudioCount">{normalized.length} КОТИРОВОК</span>
   </header>
   <div className="observedOddsMetrics">
    <article><small>БУКМЕКЕРОВ</small><strong>{allBooks.size}</strong><span>по сохранённым снимкам</span></article>
    <article><small>РЫНКОВ</small><strong>{uniqueMarkets}</strong><span>только подтверждённые</span></article>
    <article><small>СВЕЖИХ ЦЕН ≤ 2 МИН</small><strong>{readyCount}</strong><span>по времени самого провайдера</span></article>
    <article><small>ПОСЛЕДНИЙ СНИМОК</small><strong className="observedOddsAge">{newest?age(newest.capturedAt,now):"—"}</strong><span>{newest?fmt(newest.capturedAt):"источник ещё не передал цены"}</span></article>
   </div>
   {normalized.length?<>
    <div className="observedOddsBanner">
     <div><i className={readyCount>0?"recent":"stale"}/><strong>{readyCount>0?"ЕСТЬ СВЕЖИЕ ЗАПИСИ":"КОТИРОВКИ МОГУТ БЫТЬ УСТАРЕВШИМИ"}</strong><span>{currentSource} · время поставщика · не гарантируется доступность для реальной ставки</span></div>
     <button type="button" onClick={()=>setExplain(x=>!x)} aria-expanded={explain}>Как читать цифры {explain?"−":"+"}</button>
    </div>
    {explain&&<div className="observedOddsExplanation"><p><strong>Цена 2.00</strong> математически соответствует порогу безубыточности 50% (100 / 2). Это не прогноз VETO, не очищенная от маржи вероятность и не гарантия доступности ставки. Приостановленные или старые котировки нельзя использовать как текущие live-цены.</p></div>}
    <div className="observedOddsFilters" aria-label="Фильтр букмекерских рынков">
      {([{id:"all",title:"Все рынки"},{id:"h2h",title:"Исход матча"},{id:"totals",title:"Тоталы"}] as const).map(t=><button key={t.id} type="button" className={tab===t.id?"active":""} aria-pressed={tab===t.id} onClick={()=>{setTab(t.id);setExpanded(false);}}>{t.title}</button>)}
    </div>
    {current.length?<div className="observedOddsRows">{visible.map(q=>{
     const pct=100/q.decimalOdds;
     const elapsed=now-Date.parse(q.capturedAt);
     const available=!q.suspended&&elapsed>=0&&elapsed<=120_000;
     return <article key={[q.provider,q.bookmaker,q.marketKey,q.selectionKey].join("|")} className={available?"isRecent":"isArchive"}>
      <div className="observedOddsRowMain"><span>{q.bookmaker}</span><strong>{q.selectionLabel}</strong><small>{q.marketKey}</small></div>
      <div className="observedOddsBarGroup"><div className="observedOddsBarHead"><span>100 / коэффициент</span><b>{pct.toFixed(1)}%</b></div><div className="observedOddsBarTrack"><i style={{width:`${Math.min(100,Math.max(0,pct))}%`}}/></div></div>
      <div className="observedOddsRowPrice"><b>{q.suspended?"—":q.decimalOdds.toFixed(2)}</b><small>{q.suspended?"РЫНОК ПРИОСТАНОВЛЕН":available?"СНИМОК ≤ 2 МИН":"АРХИВНЫЙ СНИМОК"}</small></div>
      <time dateTime={q.capturedAt}>{fmt(q.capturedAt)}</time>
     </article>;
    })}</div>:<p className="observedOddsNone">В сохранённых данных пока нет котировок выбранного типа. Другие рынки могут быть доступны в соседних вкладках.</p>}
    {current.length>8&&<button type="button" className="observedOddsMore" onClick={()=>setExpanded(s=>!s)}>{expanded?"Показать меньше":"Показать все сохранённые цены"} ({current.length}) ↗</button>}
   </>:<div className="observedOddsEmpty">
      <div aria-hidden="true" className="observedOddsEmptyIcon">◎</div>
      <div><strong>Линия для этого матча ещё не получена</strong>
       <p>VETO уже может получать реальные футбольные события. The Odds API работает по ограниченному бесплатному расписанию, и не каждый матч или рынок есть у букмекеров. Здесь будут показаны только фактически сохранённые коэффициенты.</p>
       <span>СТАТУС: ОЖИДАЕМ ДОКАЗАТЕЛЬСТВА · НЕ ПОДСТАВЛЯЕМ ЦЕНЫ</span>
      </div>
    </div>}
   <footer>Котировки — архивные наблюдения для исследования. VETO не размещает ставки и не рассчитывает вероятность выигрыша по одной только цене.</footer>
  </section>;
}
