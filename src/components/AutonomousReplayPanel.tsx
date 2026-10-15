"use client";
import {useState} from "react";
import type {ReplayReport} from "@/lib/paper/autonomous-replay";

type Response=ReplayReport&{ok:boolean;limits?:{
 days:number;eventCap:number;eventsExcludedByGlobalCap:number;
 incompleteGroupsDropped:number;sourceTruncationPossible:boolean}};
const pct=(n:number|null)=>n===null?"—":(n*100).toFixed(1)+"%";
const num=(n:number|null)=>n===null?"—":n.toFixed(4);
const date=(v:string)=>new Date(v).toLocaleString("ru-RU",{
 day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"
});
export function AutonomousReplayPanel(){
 const [report,setReport]=useState<Response|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const run=async()=>{
  if(loading)return;
  setLoading(true);setError("");setReport(null);
  try{
   const response=await fetch("/api/intelligence/paper-journal/autonomous",{cache:"no-store"});
   if(!response.ok)throw Error("NO_SOURCE");
   const data:Response=await response.json();
   if(!data.ok||data.source!=="PERSISTED_ONLY"||!Array.isArray(data.cases))throw Error("INVALID_SOURCE");
   setReport(data);
  }catch{setError("Сохранённые спортивные данные сейчас недоступны. Фиктивные эксперименты не создаём.");}
  finally{setLoading(false);}
 };
 return <section className="paperAutoReplay" aria-label="Autonomous historical paper replay">
  <header className="paperAutoHeader">
   <div><span>05 / AUTONOMOUS RESEARCH · READ ONLY</span><h3>Autonomous Replay</h3>
    <p>Автоматически собирает виртуальные эксперименты из реально записанных состояний матча, котировок, прогнозов VETO и подтверждённых FT. Один заранее определённый алгоритм выбирает самый ранний подходящий снимок каждого матча. Никакого ввода результатов вручную.</p>
   </div>
   <button type="button" disabled={loading} onClick={()=>void run()}>{loading?"Сопоставляем снимки…":report?"Повторить анализ ↻":"Исследовать архив ↗"}</button>
  </header>
  <div className="paperAutoPolicy">
   <strong>ЗАФИКСИРОВАННЫЕ ПРАВИЛА V1</strong>
   <span>Только 1X2 / BTTS · реальные события · live-состояние ≤120 с · возраст цены ≤120 с · модель ≤120 с · ожидаемый paper yield ≥5% · не более 1 выбора на событие.</span>
   <small>Этот порог — исследовательский фильтр, а не доказанное преимущество. Выборка ретроспективная и может быть неполной.</small>
  </div>
  {!report&&!error&&!loading?<div className="paperAutoEmpty">Анализ по запросу: без платных вызовов к провайдерам, без записи ставок и без подмены отсутствующих матчей.</div>:null}
  {loading?<div className="paperAutoEmpty" role="status">Читаем сохранённые события VETO. Не запрашиваем новые коэффициенты и не создаём ставки.</div>:null}
  {error?<div className="paperAutoEmpty" role="alert">{error}</div>:null}
  {report&&<div className="paperAutoResult">
   {report.coverage.sampleMayBeCapped&&<div className="paperAutoWarning" role="alert">
    ЧАСТИЧНЫЙ АРХИВ: сработали ограничения чтения. Отчёт не охватывает все матчи, и статистику нельзя обобщать.
    {report.limits?.incompleteGroupsDropped? ` Пропущено групп: ${report.limits.incompleteGroupsDropped}.`:""}
   </div>}
   <div className="paperAutoMetrics">
    <article><small>РЕАЛЬНЫЕ СОБЫТИЯ</small><strong>{report.scans.events}</strong><span>из доступного архива</span></article>
    <article><small>ПРОШЛИ ПРОТОКОЛ</small><strong>{report.counts.eligible}</strong><span>строгая совместимость снимков</span></article>
    <article><small>СВЕРЕНО FT</small><strong>{report.counts.settled}</strong><span>{report.counts.wins} WIN · {report.counts.losses} LOSS</span></article>
    <article><small>PAPER YIELD / СЛУЧАЙ</small><strong>{pct(report.metrics.paperYield)}</strong><span>не подтверждение реального исполнения</span></article>
    <article><small>BRIER / MODEL</small><strong>{num(report.metrics.brier)}</strong><span>только подтверждённые исходы</span></article>
    <article><small>BRIER / PRICE BASELINE</small><strong>{num(report.metrics.priceBaselineBrier)}</strong><span>без удаления букмекерской маржи</span></article>
   </div>
   <div className="paperAutoAudit">
    <span><b>{report.scans.liveStates}</b> записей состояния</span>
    <span><b>{report.scans.quotes}</b> котировок</span>
    <span><b>{report.scans.predictions}</b> модельных снимков</span>
    <span><b>{report.scans.finals}</b> FT сертификатов</span>
    <span><b>{report.counts.rejected.noEligiblePair}</b> матчей без подходящей тройки снимков</span>
    <span><b>0</b> новых обращений к спортивным провайдерам</span>
   </div>
   <div className="paperAutoCases">
    <h4>Исследовательский журнал · автоматически восстановлен из архива</h4>
    {report.cases.length?<div className="paperAutoCaseList">{report.cases.map(row=><article key={row.eventId}>
     <div><span>{row.competition}</span><b>{row.match}</b><small>{row.contract} · {row.modelVersion}</small></div>
     <div><small>МОДЕЛЬ / ЦЕНА</small><b>{pct(row.fairProbability)} / {row.decimalOdds.toFixed(2)}</b>
      <small>Цена: {date(row.quoteAt)} · прогноз: {date(row.modelAt)}</small></div>
     <div><small>ПОДТВЕРЖДЕНИЕ</small><b>{row.result==="UNSETTLED"?"ОЖИДАЕТ FT":row.result==="PROVIDER_WIN"?"FT WIN":"FT LOSS"}</b>
      <small>{row.finalScore?`${row.finalScore.home}:${row.finalScore.away}`:"Нет подтверждённого FT"} · {row.paperProfitUnits===null?"без P&L":`${row.paperProfitUnits>0?"+":""}${row.paperProfitUnits.toFixed(2)} виртуальных ед.`}</small></div>
    </article>)}</div>:
     <p className="paperAutoEmpty">Нет ни одного события с подходящей тройкой независимых записанных снимков. Это не отрицательный результат стратегии — нет достаточных данных.</p>}
   </div>
   <footer>PROTOCOL: {report.model} · ПЕРИОД: последние {report.limits?.days??7} дней · РЕАЛЬНЫХ СТАВОК: 0 · VALIDATED EDGE: 0. Данный read-only replay не формирует серверный ledger и не является перспективным экспериментом.</footer>
  </div>}
 </section>;
}
