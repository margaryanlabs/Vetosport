"use client";
import {useCallback,useEffect,useState} from "react";
import type {DailyPaperAccount,DailyPaperTicket} from "@/lib/paper/daily-research";

type Reply={ok:true;source:string;generatedAt:string;account:DailyPaperAccount;
 scheduler:{configuredInRepo:boolean;lastHeartbeat:string|null;health:string;note:string;blockedBy:Record<string,number>};
 sourceHealth:{oddsScores:{lastCheckedAt:string|null;healthy:boolean};
 ftProvider:{status:string;lastCheckedAt:string|null;subscriptionBlocked:boolean};
 model:{recentlyProduced:boolean;lastRecordedAt:string|null}};
 coverage:{historyMayBeCapped:boolean;realBetsPlaced:0;prospectiveProfitabilityProven:false}};
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",
 minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const signed=(n:number)=>(n>0?"+":"")+money(n);
const dt=(ts:string)=>new Date(ts).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",
 hour:"2-digit",minute:"2-digit"});
const label=(contract:string)=>({
 FT_HOME:"Победа хозяев",FT_AWAY:"Победа гостей",FT_DRAW:"Ничья",
 FT_BTTS_YES:"Обе забьют · Да",FT_BTTS_NO:"Обе забьют · Нет",
}[contract]??contract.replace(/^FT_TOTAL_(OVER|UNDER)_([1-4])_5$/,(_raw,side:string,line:string)=>
 `Тотал ${side==="OVER"?"Больше":"Меньше"} ${line}.5`));
function Curve({account}:{account:DailyPaperAccount}){
 const series=account.points;
 if(series.length<2)return <div className="paperDailyNoChart">
  Здесь появится реальная кривая виртуального банка после первых подтверждённых результатов FT.
 </div>;
 const values=series.map(x=>x.balance),min=Math.min(...values),max=Math.max(...values),
  span=Math.max(1,max-min),lo=min-span*.2,hi=max+span*.2;
 const x=(i:number)=>20+i*660/Math.max(1,series.length-1);
 const y=(p:number)=>170-(p-lo)/(hi-lo)*135;
 const path=series.map((p,i)=>(i===0?"M":"L")+x(i).toFixed(2)+" "+y(p.balance).toFixed(2)).join(" ");
 return <svg viewBox="0 0 710 200" role="img" aria-label="История виртуального капитала по проверенным окончательным результатам">
  {[0,1,2,3].map(n=><line key={n} x1="20" x2="680" y1={32+n*41} y2={32+n*41}
    stroke="currentColor" opacity=".12" strokeDasharray="4 7"/>)}
  <path d={path} stroke="#e4e5e8" strokeWidth="2.6" fill="none" vectorEffect="non-scaling-stroke"/>
  {series.map((p,i)=><circle key={i} cx={x(i)} cy={y(p.balance)} r="3"
    fill="#e55c6a" stroke="currentColor" strokeWidth=".7"/>)}
  <text x="20" y="17" fontSize="11" fill="currentColor">{money(max)}</text>
  <text x="20" y="196" fontSize="11" fill="currentColor">{money(min)}</text>
 </svg>;
}
const exportLedger=(tickets:DailyPaperTicket[])=>{
 const columns=["event","selection","bookmaker","price","stake","probability","model","captured","picked",
 "result","final_score","settlement","virtual_profit"];
 const csv=(v:unknown)=>{
  const str=String(v??""),safe=/^[\s\uFEFF]*[=+@\-]/.test(str)?"'"+str:str;
  return '"'+safe.replace(/"/g,'""')+'"';
 };
 const lines=tickets.map(x=>[x.match,x.contract,x.bookmaker,x.odds,x.stake,
  x.modelProbability,x.modelVersion,x.quoteAt,x.pickedAt,
  x.settlement?.result??"UNSETTLED",
  x.settlement?`${x.settlement.score.home}:${x.settlement.score.away}`:"",
  x.settlement?.settledAt??"",
  x.settlement?(x.settlement.result==="WIN"?x.stake*(x.odds-1):-x.stake):"",
 ].map(csv).join(","));
 const blob=new Blob(["\uFEFF",columns.map(csv).join(","),"\r\n",lines.join("\r\n")],
  {type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="veto-sport-forward-paper-research.csv";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
};
export function DailyPaperResearchPanel(){
 const [data,setData]=useState<Reply|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [filter,setFilter]=useState<"ALL"|"OPEN"|"SETTLED">("ALL");
 const refresh=useCallback(async()=>{
  try{
   const response=await fetch("/api/intelligence/paper-journal/daily",{cache:"no-store"});
   if(!response.ok)throw Error("NOT_READY");
   const result:Reply=await response.json();
   if(!result.ok||result.source!=="SERVER_PERSISTED_FORWARD_ONLY")throw Error("NO_PROOF");
   setData(result);setError("");
  }catch{
   try{
    const res=await fetch("/api/intelligence/paper-journal/readiness",{cache:"no-store"});
    const data:{issues?:Array<{scope:string;reason:string}>}=await res.json();
    const issues=data.issues?.map(x=>x.scope+": "+x.reason).join("; ");
    setError(issues?
      "Ошибка доступа к данным: "+issues+". Подробный статус доступен в диагностике соединения.":
      "Сервис исследования пока не ответил, но соединение с базой проверено. Проверь журнал работы.");
   }catch{
    setError("Preview или API недоступны: проверь авторизацию Vercel. Ключи букмекеров не требуются для чтения архива.");
   }
  }finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  void refresh();const timer=setInterval(()=>void refresh(),60_000);
  return()=>clearInterval(timer);
 },[refresh]);
 const a=data?.account;
 const shown=(a?.tickets??[]).filter(x=>
  filter==="ALL"||filter==="OPEN"&&!x.settlement||filter==="SETTLED"&&!!x.settlement);
 const last=data?.scheduler.lastHeartbeat;
 return <section className="paperDaily" id="veto-forward-daily-paper" aria-labelledby="daily-research-title">
  <div className="paperDailyTop">
   <div><span className="paperDailyEyebrow">06 / FORWARD RESEARCH · AUTOMATIC VIRTUAL TESTS</span>
    <h3 id="daily-research-title">Daily Paper Research</h3>
    <p>VETO фиксирует виртуальные решения до исхода: live-рынки и отдельные заранее определённые pre-match контрольные исследования. Результаты — только после точного провайдерского FT. Общий виртуальный счёт, никаких реальных ставок.</p>
   </div>
   <div className="paperDailyTools">
    <span className={last&&data?.scheduler.health==="OBSERVED_RECENTLY"?"paperDailyState running":"paperDailyState"}>
     ● {data?.scheduler.health==="OBSERVED_RECENTLY"?"CRON ПОДТВЕРЖДЁН":"CRON НЕ ПОДТВЕРЖДЁН"}
    </span>
    <button type="button" onClick={()=>void refresh()} disabled={loading}>{loading?"Читаем архив…":"Обновить ↻"}</button>
   </div>
  </div>
  <div className="paperDailyRules">
   <strong>НАУЧНЫЙ ПРОТОКОЛ / $200 VIRTUAL BANK</strong>
   <span>Стартовый банк $200 · до 3 экспериментов в сутки · $4 на эксперимент (2% стартового банка) · максимум $12 дневного риска. Если нет прогноза VETO, можно наблюдать контрольную группу по реальным котировкам без утверждений о преимуществе.</span>
   <small>Количество тестов не гарантируется. Контрольная вероятность = 1/коэффициент, получена из той же цены и НЕ является независимым прогнозом. Окончательный P&L возможен только при подтверждённом FT.</small>
  </div>
  {error&&<div className="paperDailyError" role="alert">{error}</div>}
  {!data&&!error&&<div className="paperDailyEmpty">Загружаем реальные записи. Ни демонстрационной прибыли, ни фиктивных матчей.</div>}
  {a&&<div className="paperDailyData">
   <div className="paperDailySourceStatus">
    <article className={data.sourceHealth.ftProvider.subscriptionBlocked?"blocked":""}>
     <small>FT CERTIFICATION / ИСХОДЫ</small>
     <strong>{data.sourceHealth.ftProvider.subscriptionBlocked?"ПОДПИСКА API ОГРАНИЧЕНА":
      data.sourceHealth.ftProvider.status==="healthy"?"ПРОВАЙДЕР ДОСТУПЕН":"ПОДТВЕРЖДЕНИЕ НЕ ПРОВЕРЕНО"}</strong>
     <span>{data.sourceHealth.ftProvider.subscriptionBlocked?
      "Провайдер API-Football FT недоступен. EPL можно подтверждать альтернативно по тому же ID в The Odds API, если разрешён scores cron. Мы не рисуем прибыль.":
      "Счёт не меняется, пока для конкретного матча нет сохранённого FT-сертификата."}</span>
    </article>
    <article className={!data.sourceHealth.model.recentlyProduced?"blocked":""}>
     <small>MODEL PIPELINE / КАЛИБРОВКА</small>
     <strong>{data.sourceHealth.model.recentlyProduced?"SHADOW SNAPSHOTS ОБНАРУЖЕНЫ":"НОВЫХ SHADOW SNAPSHOTS НЕТ"}</strong>
     <span>При отсутствии прогноза VETO возможны только отдельные контрольные наблюдения по реальным котировкам.</span>
    </article>
    <article>
     <small>THE ODDS API / INDEPENDENT EPL SCORES</small>
     <strong>{data.sourceHealth.oddsScores.healthy?"ИСТОЧНИК FT ПОДТВЕРЖДЁН":"FT-СВЕРКА НЕ ЗАПУЩЕНА ИЛИ НЕДОСТУПНА"}</strong>
     <span>Проверка EPL по точному ID источника; плановая стоимость 2 API-кредита в день. Выключена без явного разрешения оператора.</span>
    </article>
   </div>
   {Object.entries(data.scheduler.blockedBy).length>0&&<div className="paperDailyBlocked">
    <strong>ПОЧЕМУ НЕ БЫЛО PAPER-СТАВОК / ПОСЛЕДНЯЯ ПРОВЕРКА</strong>
    <div>{Object.entries(data.scheduler.blockedBy).map(([key,n])=><span key={key}>
     {({
      EVENT_NOT_LIVE:"Матч не в live",FRESH_SCORE_MISSING:"Нет свежего счёта",
      FRESH_OPEN_PRICE_MISSING:"Нет свежей открытой котировки",
      FULLTIME_MARKET_NOT_MAPPED:"Нет безопасно сопоставленного FT-рынка",
      TIMESTAMP_OR_MODEL_PROOF_INCOMPLETE:"Не совпали временные доказательства",
      PREMATCH_QUOTES_CAPPED:"Архив котировок неполный",
      PREMATCH_COMPLETE_BOOKMAKER_TRIO_MISSING:"Нет полной тройки 1X2 одного букмекера",
      LIVE_HISTORY_CAPPED:"Live-история ограничена",
     } as Record<string,string>)[key]??key}: <b>{n}</b></span>)}</div>
   </div>}
   {data.coverage.historyMayBeCapped&&<div className="paperDailyError">Предупреждение: объём архива достиг лимита чтения — показатели могут быть неполными.</div>}
   <div className="paperDailyKpis">
    <article className="main"><small>ВИРТУАЛЬНЫЙ БАЛАНС</small><strong>{money(a.balance)}</strong><span>Старт {money(a.initialBank)} · резерв {money(a.reserved)}</span></article>
    <article><small>ЧИСТЫЙ PAPER P&L</small><strong className={a.net<0?"negative":a.net>0?"positive":""}>{signed(a.net)}</strong><span>{a.roiPct>0?"+":""}{a.roiPct.toFixed(2)}% от стартового банка</span></article>
    <article><small>ДОСТУПНО ДЛЯ ТЕСТОВ</small><strong>{money(a.available)}</strong><span>Резерв незавершённых вычтен</span></article>
    <article><small>ПРОВЕРЕННЫЕ ИСХОДЫ</small><strong>{a.settled}</strong><span>{a.wins} побед · {a.losses} поражений · {a.open} открыто</span></article>
    <article><small>PAPER YIELD</small><strong>{a.yieldPct===null?"—":`${a.yieldPct>0?"+":""}${a.yieldPct.toFixed(2)}%`}</strong><span>Прибыль / сумма закрытых paper-тестов</span></article>
   </div>
   <section className="paperDailyCohorts" aria-label="Независимые исследовательские группы">
    <header><span>SCIENTIFIC SCOREBOARD / COHORTS ≠ VERIFIED EDGE</span>
     <h4>Какая гипотеза действительно работает?</h4>
     <p>Сравниваем три группы отдельно. Контрольные вероятности взяты из самих котировок. Модельные результаты не являются доказательством преимущества даже при положительном P&L.</p>
    </header>
    <div className="paperDailyCohortGrid">
     {a.cohorts.map(cohort=><article key={cohort.id}>
      <small>{cohort.id}</small>
      <h5>{cohort.label}</h5>
      <strong className={cohort.net<0?"negative":cohort.net>0?"positive":""}>{signed(cohort.net)}</strong>
      <div><span>Виртуальные тесты</span><b>{cohort.count}</b></div>
      <div><span>Подтверждено FT</span><b>{cohort.settled}</b></div>
      <div><span>W / L · ожидают</span><b>{cohort.wins} / {cohort.losses} · {cohort.open}</b></div>
      <div><span>Yield по ставкам</span><b>{cohort.yieldPct===null?"—":cohort.yieldPct.toFixed(2)+"%"}</b></div>
      <div><span>Brier (меньше лучше)</span><b>{cohort.brier===null?"—":cohort.brier.toFixed(4)}</b></div>
      <div><span>95% Wilson win-rate</span><b>{cohort.wilson95?
       `${(cohort.wilson95[0]*100).toFixed(1)}–${(cohort.wilson95[1]*100).toFixed(1)}%`:"—"}</b></div>
      <footer>{cohort.minimumSampleReached?
       "Есть ≥30 исходов, но преимущество не доказано.":
       `До порога 30 подтверждённых исходов: ${Math.max(0,30-cohort.settled)}.`}
      </footer>
     </article>)}
    </div>
   </section>
   <div className="paperDailySecondary">
    <div className="paperDailyEquity">
     <header><span>BANKROLL CURVE / ONLY VERIFIED FT</span><b>Как меняются виртуальные $200</b></header>
     <Curve account={a}/>
     <small>Завершённые решения влияют на баланс только после отдельно подтверждённого FT. Открытые ставки резервируют виртуальные средства.</small>
    </div>
    <div className="paperDailyHistory">
     <header><span>RESEARCH BY DAY</span><b>Ежедневная активность</b></header>
     {a.daily.length?a.daily.slice(0,8).map(day=><div key={day.day}>
      <span>{day.day}</span><small>{day.count} тестов · {day.wins}W/{day.losses}L</small>
      <strong className={day.pnl<0?"negative":day.pnl>0?"positive":""}>{signed(day.pnl)}</strong>
     </div>):<p>Система ещё не зафиксировала подходящих реальных исследований.</p>}
    </div>
   </div>
   <div className="paperDailyTickets">
    <header><div><span>FORWARD SHADOW DECISIONS / SERVER LEDGER</span>
     <h4>Исследовательские paper-ставки</h4></div>
     <button type="button" disabled={!a.tickets.length} onClick={()=>exportLedger(a.tickets)}>CSV ↗</button>
    </header>
    <div className="paperDailyFilters" role="group" aria-label="Исходы paper решений">
     {(["ALL","OPEN","SETTLED"] as const).map(mode=><button key={mode} type="button"
      aria-pressed={filter===mode} onClick={()=>setFilter(mode)}>
      {mode==="ALL"?"Все":mode==="OPEN"?"Ожидают FT":"Подтверждены"}
     </button>)}
    </div>
    {shown.length?<div className="paperDailyRows">{shown.slice(0,30).map(t=><article key={t.id}>
     <div><span>{t.competition}</span><b>{t.match}</b>
      <small>{label(t.contract)} · {t.bookmaker} · {dt(t.pickedAt)}</small></div>
     <div><small>КОЭФФИЦИЕНТ</small><b>{t.odds.toFixed(2)}</b><span>{money(t.stake)} виртуально</span></div>
     <div><small>{t.modelVersion.includes("CONTROL")?"РЫНОЧНЫЙ КОНТРОЛЬ · НЕ ПРОГНОЗ VETO":"ПРОГНОЗ VETO · НЕ ПРОВЕРЕН"}</small><b>{(t.modelProbability*100).toFixed(1)}%</b><span>{t.modelVersion.includes("CONTROL")?"MARKET BASELINE · без независимого преимущества":t.modelVersion}</span></div>
     <div><small>ИСХОД / P&L</small><b>{t.settlement?t.settlement.result:"ОЖИДАЕТ FT"}</b>
      <span className={t.settlement?.result==="LOSS"?"negative":"positive"}>{t.settlement?
       signed(t.settlement.result==="WIN"?t.stake*(t.odds-1):-t.stake):"—"}
       {t.settlement?` · ${t.settlement.score.home}:${t.settlement.score.away}`:""}</span>
      {t.settlement&&<small>FT: {t.settlement.provider} · exact source ID</small>}</div>
    </article>)}</div>:
     <div className="paperDailyEmpty">{filter==="ALL"?
      "Пока нет подходящих подтверждённых исходных котировок и прогнозов. Принудительно добавлять тесты не будем.":
      "Нет записей в выбранной категории."}</div>}
   </div>
   <footer><b>RESEARCH ONLY · НЕ БУКМЕКЕР</b>
    <span>Последнее подтверждённое выполнение: {last?dt(last):"не обнаружено"}. {data.scheduler.note}</span>
    <span>Серверная история общая для VETO Sport, не личный депозит. Pre-match источник не передаёт надёжного флага доступности ставки: его цены только индикативные. Контрольная вероятность вычислена из котировок, а не предсказана VETO. Отсутствуют комиссии, лимиты, гарантии исполнения и прибыль.</span>
   </footer>
  </div>}
 </section>;
}
