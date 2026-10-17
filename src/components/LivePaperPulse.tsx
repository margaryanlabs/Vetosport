"use client";

import {useCallback,useEffect,useState} from "react";
import type {LiveEventSummary} from "@/lib/live/types";
import {getObservedFreshness} from "@/lib/live/freshness";
import "./live-paper-pulse.css";

type BaseData={
 ok:boolean;
 generatedAt:string;
 account:{initialBank:number;balance:number;open:number;settled:number;
  wins:number;losses:number;net:number;tickets?:Array<{eventId:string;match:string}>;};
 scheduler:{lastHeartbeat:string|null;health:string};
 sourceHealth?:{ftProvider?:{subscriptionBlocked:boolean};oddsScores?:{healthy:boolean}};
};
type HighData={
 ok:boolean;
 generatedAt:string;
 account:{nominalInitialBank:number;balance:number;open:number;
  settled:number;wins:number;losses:number;net:number;
  tickets?:Array<{legs:Array<{eventId:string}>}>;};
 observer:{lastHeartbeat:string|null;recent?:boolean};
};
type State={base:BaseData|null;high:HighData|null;at:string|null;error:boolean};
const fmt=(amount:number)=>new Intl.NumberFormat("en-US",{
 style:"currency",currency:"USD",maximumFractionDigits:2}).format(amount);
const age=(iso:string|null,now:number)=>{
 const n=iso?Date.parse(iso):NaN;
 if(!Number.isFinite(n)||n>now)return "нет подтверждённого запуска";
 const minutes=Math.floor((now-n)/60_000);
 return minutes<1?"меньше минуты назад":
  minutes<60?`${minutes} мин назад`:`${Math.floor(minutes/60)} ч назад`;
};
/** Read-only observational ribbon. No discovery writes or bookmaker calls.
 * The server alone issues authenticated research cron requests and commits
 * forward-only virtual decisions before kick-off.
 */
export function LivePaperPulse({events}: {events:LiveEventSummary[]}){
 const [data,setData]=useState<State>({base:null,high:null,at:null,error:false});
 const [busy,setBusy]=useState(false);
 const [now,setNow]=useState(Date.now());
 const reload=useCallback(async(signal?:AbortSignal)=>{
  if(typeof document!=="undefined"&&document.hidden)return;
  setBusy(true);
  try{
   const [daily,high]=await Promise.all([
    fetch("/api/intelligence/paper-journal/daily",{cache:"no-store",signal}),
    fetch("/api/intelligence/paper-journal/high-odds",{cache:"no-store",signal}),
   ]);
   if(!daily.ok||!high.ok)throw Error("LEDGER_READ_FAILED");
   const [base,highData]=await Promise.all([
    daily.json() as Promise<BaseData>,high.json() as Promise<HighData>,
   ]);
   if(!base.ok||!highData.ok||!base.account||!highData.account)
    throw Error("NO_CERTIFIED_LEDGER");
   if(signal?.aborted)return;
   setData({base,high:highData,at:new Date().toISOString(),error:false});
  }catch{
   if(!signal?.aborted)setData(previous=>({
    ...previous,error:true,base:null,high:null,at:null,
   }));
  }finally{if(!signal?.aborted)setBusy(false);}
 },[]);
 useEffect(()=>{
  const controller=new AbortController();
  const update=()=>{if(!document.hidden){setNow(Date.now());void reload(controller.signal);}};
  update();
  const interval=window.setInterval(update,60_000);
  document.addEventListener("visibilitychange",update);
  return()=>{controller.abort();window.clearInterval(interval);
   document.removeEventListener("visibilitychange",update);};
 },[reload]);
 const real=events.filter(e=>e.source==="persisted");
 const fresh=real.filter(e=>getObservedFreshness(e,now).freshLive).length;
 const delayed=real.filter(e=>getObservedFreshness(e,now).delayedLive).length;
 const archived=real.filter(e=>getObservedFreshness(e,now).unverifiedArchive).length;
 const scheduled=real.filter(e=>e.status==="scheduled").length;
 const baseAt=data.base?.scheduler.lastHeartbeat??null;
 const highAt=data.high?.observer.lastHeartbeat??null;
 const baseRecent=baseAt!==null&&now-Date.parse(baseAt)<90*60_000&&now>=Date.parse(baseAt);
 const highRecent=highAt!==null&&now-Date.parse(highAt)<90*60_000&&now>=Date.parse(highAt);
 const base=data.base?.account;
 const high=data.high?.account;
 const exposure=new Map<string,{daily:number;longshot:number}>();
 for(const ticket of base?.tickets??[]){
  const row=exposure.get(ticket.eventId)??{daily:0,longshot:0};
  row.daily++;exposure.set(ticket.eventId,row);
 }
 for(const ticket of high?.tickets??[])for(const leg of ticket.legs){
  const row=exposure.get(leg.eventId)??{daily:0,longshot:0};
  row.longshot++;exposure.set(leg.eventId,row);
 }
 const matched=real.filter(e=>exposure.has(e.id)).slice(0,8);
 return <section className="livePaperBridge" aria-label="Состояние live и виртуальных экспериментов">
  <div className="livePaperBridgeTop">
   <div><span className="livePaperEyebrow">VETO / LIVE → RESEARCH → VERIFIED RESULTS</span>
    <h3>Live & Paper <em>Command.</em></h3>
    <p>Одни и те же наблюдаемые матчи, отдельные виртуальные журналы.
     Нет автоматических реальных ставок. Если источник отстаёт, статус не называется LIVE.</p>
   </div>
   <button type="button" onClick={()=>void reload()} disabled={busy}>
    {busy?"Синхронизация…":"Синхронизировать ↻"}
   </button>
  </div>
  <div className="livePaperBridgeGrid">
   <article>
    <span className="livePaperEyebrow">01 / REAL MATCH EVIDENCE</span>
    <strong>{fresh} <small>FRESH LIVE</small></strong>
    <div className="livePaperSmallStats"><span>{delayed} с задержкой</span>
     <span>{scheduled} по расписанию</span><span>{archived} архивных</span></div>
    <p>{fresh?"Снимок счёта обновлён менее 120 секунд назад.":
     "Нет подтверждённого свежего live-снимка. Сохранённые статусы не равны прямой трансляции."}</p>
    <a href="/research/watchlist">Радар и подтверждение источника ↗</a>
   </article>
   <article>
    <span className="livePaperEyebrow">02 / DAILY PAPER · $200 NOMINAL</span>
    <strong>{base?fmt(base.balance):"—"} <small>VIRTUAL</small></strong>
    <div className="livePaperSmallStats"><span>{base?.open??"—"} ожидают FT</span>
     <span>{base?.settled??"—"} закрыто</span><span>{base?.wins??"—"} W</span></div>
    <p className={baseRecent?"livePaperGood":"livePaperWarn"}>{baseRecent?
     `Обработчик наблюдался ${age(baseAt,now)}`:
     `Регулярный запуск пока не подтверждён · ${age(baseAt,now)}`}</p>
    <a href="/research/paper-lab">Открыть Daily Paper ↗</a>
   </article>
   <article>
    <span className="livePaperEyebrow">03 / HIGH ODDS · NO REAL BETS</span>
    <strong>{high?fmt(high.balance):"—"} <small>VIRTUAL</small></strong>
    <div className="livePaperSmallStats"><span>{high?.open??"—"} комбинаций в работе</span>
     <span>{high?.settled??"—"} закрыто</span><span>{high?.wins??"—"} W</span></div>
    <p className={highRecent?"livePaperGood":"livePaperWarn"}>{highRecent?
     `Обработчик наблюдался ${age(highAt,now)}`:
     `Регулярный запуск пока не подтверждён · ${age(highAt,now)}`}</p>
    <a href="/research/high-odds">Открыть High Odds ↗</a>
   </article>
  </div>
  {matched.length>0&&<div className="livePaperExposure">
   <div><strong>Реальные матчи в виртуальных исследованиях</strong>
    <span>У каждого исследования — исходная цена и время записи. Ссылки ведут к фактическому матчу, а не к покупке ставки.</span></div>
   <div className="livePaperExposureLinks">
    {matched.map(e=><a key={e.id} href={`/?view=check&event=${encodeURIComponent(e.id)}`}>
      <strong>{e.homeName} — {e.awayName}</strong>
      <span>{exposure.get(e.id)?.daily?"Daily Paper × "+exposure.get(e.id)?.daily:""}
       {exposure.get(e.id)?.daily&&exposure.get(e.id)?.longshot?" · ":""}
       {exposure.get(e.id)?.longshot?"High Odds × "+exposure.get(e.id)?.longshot:""}</span>
      <small>{getObservedFreshness(e,now).label}</small>
     </a>)}
   </div>
  </div>}
  <div className="livePaperBridgeFoot">
   <span className={data.error?"livePaperWarn":""}>{data.error?
    "Не удалось прочитать серверные журналы. Числа скрыты, имитаций нет.":
    data.at?`Журналы проверены ${new Date(data.at).toLocaleTimeString("ru-RU")}`:
    "Проверяем серверные журналы…"}</span>
   <span>{data.base?.sourceHealth?.ftProvider?.subscriptionBlocked?
    "API-Football FT ограничен подпиской · альтернативный FT проверяется отдельно":
    "Результат подтверждается только независимым FT, не статусом матча"}</span>
  </div>
 </section>;
}
