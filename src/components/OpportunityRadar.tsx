"use client";
import {useEffect,useState} from "react";
import type {RadarCase} from "@/lib/research/opportunity-radar";
import "./opportunity-radar.css";

type Feed={source:string;generatedAt:string;counts:{paper:number;watch:number;pass:number};
 rows:RadarCase[];validatedEdgeCount:number;automaticBettingEnabled:boolean};
const clock=(ts:string)=>Number.isFinite(Date.parse(ts))?new Date(ts).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}):"—";
const age=(seconds:number|null)=>seconds===null?"время неизвестно":seconds<60?`${seconds} сек`:`${Math.floor(seconds/60)} мин`;
export function OpportunityRadar(){
 const [feed,setFeed]=useState<Feed|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [mode,setMode]=useState<"all"|"paper"|"watch">("all");
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let active=true;
  const fetchRadar=async()=>{
   try{
    const r=await fetch("/api/intelligence/research/opportunity-radar",{cache:"no-store"});
    if(!r.ok)throw Error("Source read error");
    const data:Feed=await r.json();
    if(!Array.isArray(data.rows)||!data.counts||!data.generatedAt)throw Error("Bad feed");
    if(active){setFeed(data);setError("");setLoading(false);}
   }catch{if(active){setError("Не удалось получить подтверждённые наблюдения. Сигналы не создаём.");setLoading(false);}}
  };
  void fetchRadar();
  const interval=setInterval(()=>void fetchRadar(),60_000);
  return()=>{active=false;clearInterval(interval);};
 },[refresh]);
 const filtered=(feed?.rows||[]).filter(row=>mode==="all"||row.status===(mode==="paper"?"PAPER":"WATCH"));
 return <section className="opportunityRadar" id="watchRadar" aria-label="VETO Radar — проверенные исследования матчей">
  <header className="radarHeader">
   <div>
    <span className="radarEyebrow"><i/> VETO / OPPORTUNITY RESEARCH RADAR</span>
    <h2>Матчи, которые <em>стоит проверить</em></h2>
    <p>Подсвечиваем исследовательские условия, состояние счёта и подтверждённые архивные котировки. Не предлагаем ставки без доказанной модели и доступной цены.</p>
   </div>
   <button type="button" onClick={()=>{setLoading(true);setRefresh(s=>s+1);}}>Обновить данные ↻</button>
  </header>
  <div className="radarMetricGrid">
   <article className="paper"><small>● PAPER</small><strong>{feed?.counts.paper??(loading?"…":"0")}</strong><span>Есть свежий матч и цена для виртуального теста</span></article>
   <article className="watch"><small>◉ WATCH</small><strong>{feed?.counts.watch??(loading?"…":"0")}</strong><span>Матч есть, но условия недостаточны</span></article>
   <article className="pass"><small>— PASS</small><strong>{feed?.counts.pass??(loading?"…":"0")}</strong><span>Устаревший или непроверенный источник</span></article>
   <article><small>✓ VALIDATED EDGE</small><strong>0</strong><span>Ни одного доказанного преимущества</span></article>
  </div>
  {feed&&feed.counts.paper===0&&feed.counts.watch===0&&feed.rows.length>0&&
    <div className="radarQuietState"><span aria-hidden="true">◉</span>
      <div><strong>Сейчас нет достаточно свежих данных для исследования</strong>
       <p>Последние сохранённые матчи доступны ниже как архив. Это нормальная ситуация для бесплатного API, который не обновляет данные ежесекундно. VETO не выдаёт архив за текущий сигнал.</p></div>
    </div>}
  <div className="radarToolbar">
   <div role="group" aria-label="Фильтры радара">
    {([{id:"all",label:"Все наблюдения"},{id:"watch",label:"Ожидают данных"},{id:"paper",label:"Для Paper"}] as const).map(x=>
      <button type="button" key={x.id} className={mode===x.id?"active":""} aria-pressed={mode===x.id} onClick={()=>setMode(x.id)}>{x.label}</button>)}
   </div>
   <span>{feed?"ОБНОВЛЕНО "+clock(feed.generatedAt):"ОЖИДАЕМ ИСТОЧНИК"}</span>
  </div>
  {error?<div className="radarEmpty"><strong>Источник временно недоступен</strong><p>{error}</p></div>:
   loading&&!feed?<div className="radarEmpty"><strong>Загружаем подтверждённые данные…</strong><p>Обращаемся только к хранилищу VETO — бесплатные кредиты спортивных API не тратятся.</p></div>:
   filtered.length===0?<div className="radarEmpty"><strong>Пока нет подходящих наблюдений</strong><p>VETO не генерирует фальшивые ставки или сигналы. При следующем обновлении матчей исследовательский радар пересчитает статусы.</p></div>:
   <div className="radarCards">{filtered.slice(0,8).map(item=><article className={"radarCard "+item.status.toLowerCase()} key={item.id}>
    <div className="radarCardTop"><div><span className={"radarBadge "+item.status.toLowerCase()}><i/>{item.status}</span><span className="radarCompetition">{item.event.competition}</span></div><span className="radarAge">СНИМОК: {age(item.scoreAgeSeconds)}</span></div>
    <div className="radarMatch"><div><strong>{item.event.homeName}</strong><span>HOME</span></div><b>{item.event.homeScore}<i>:</i>{item.event.awayScore}</b><div className="away"><strong>{item.event.awayName}</strong><span>AWAY</span></div></div>
    <div className="radarMatchClock">МАТЧ <b>{item.event.clock}</b><span>·</span> {item.event.status==="live"?"Последний статус источника: LIVE":"Статус: "+item.event.status}</div>
    <div className="radarReason"><small>{item.scenario==="UNDER_4_5_LATE_1_1"?"СЦЕНАРИЙ: 1:1 ПОСЛЕ 80′":"СОСТОЯНИЕ ДАННЫХ"}</small>
      {item.reasons.map((reason,i)=><p key={i}>{reason}</p>)}</div>
    <div className="radarProof">
     <span className={item.evidence.freshScore?"yes":"no"}>{item.evidence.freshScore?"✓":"×"} Счёт</span>
     <span className={item.evidence.verifiedQuote?"yes":"no"}>{item.evidence.verifiedQuote?"✓":"×"} Цена</span>
     <span className="no">× Модель</span>
     <span className="no">× Исполнение</span>
    </div>
    {item.quote&&<div className="radarMarketSample"><span>{item.quote.source} · {item.quote.label}</span><b>{item.quote.decimalOdds.toFixed(2)}</b><small>СНИМОК {clock(item.quote.capturedAt)} · НЕ ДОКАЗАННОЕ ПРЕИМУЩЕСТВО</small></div>}
    <a href={"/?view=check&event="+encodeURIComponent(item.id)} className="radarOpen">Разобрать матч <span aria-hidden="true">↗</span></a>
   </article>)}</div>}
  <footer className="radarFooter"><span>● LIVE SCORE ≠ LIVE BET</span><p>WATCH — недостаточно доказательств. PAPER — только виртуальный эксперимент. PASS — пока не исследуем. Достоверность котировок и реальная возможность размещения ставки независимо не проверены.</p></footer>
 </section>;
}
