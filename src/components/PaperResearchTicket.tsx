"use client";
import {useEffect,useMemo,useState} from "react";
import type {LiveEventSummary,LiveQuotePreview} from "@/lib/live/types";
import {MAX_ENTRIES,PAPER_BANK_KEY,PAPER_STORAGE_KEY,parsePaperEntries,
 paperCsv,paperJournalStats,paperProfit,type PaperEntry,type PaperStatus} from "@/lib/paper/paper-ledger";

const outcomeNames:{[K in Exclude<PaperStatus,"UNSETTLED">]:string}={
 MANUAL_WIN:"Победа — введено вручную",
 MANUAL_LOSS:"Поражение — введено вручную",
 MANUAL_VOID:"Возврат — введено вручную",
};
const ruDate=(date:string)=>new Date(date).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const fmt=(x:number)=>Number.isFinite(x)?x.toFixed(2):"—";
function PaperEquityChart({points,count}:{points:{at:string;equity:number}[];count:number}){
 if(count===0)return <div className="paperEquityEmpty">График появится после первого результата, <b>введённого вручную</b>. Пока доходность не рассчитана.</div>;
 const values=points.map(p=>p.equity);
 const min=Math.min(...values),max=Math.max(...values);
 const padding=Math.max(1,(max-min)*.17),lo=min-padding,hi=max+padding;
 const x=(i:number)=>22+568*i/Math.max(1,points.length-1);
 const y=(v:number)=>156-(v-lo)/(hi-lo)*125;
 const d=points.map((p,i)=>(i===0?"M ":"L ")+x(i).toFixed(1)+" "+y(p.equity).toFixed(1)).join(" ");
 return <div className="paperEquityChart">
   <svg viewBox="0 0 620 185" role="img" aria-label="Виртуальная кривая капитала только по вручную внесённым результатам, без автоматически проверенных исходов">
    {[0,1,2,3].map(k=><line key={k} x1="22" x2="590" y1={27+k*42} y2={27+k*42} stroke="#c5e2d0" strokeOpacity=".15" strokeDasharray="3 8"/>)}
    <path d={d} stroke="#a1dbb1" strokeWidth="3.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {points.map((p,i)=><circle key={i} cx={x(i)} cy={y(p.equity)} r="3.5" fill="#e5f7e9" stroke="#456d4f" strokeWidth="1"/>)}
    <text x="19" y="15" fill="#a7c1ad" fontSize="11">{fmt(max)}</text>
    <text x="19" y="178" fill="#a7c1ad" fontSize="11">{fmt(min)}</text>
   </svg>
   <p>MANUAL P&amp;L · график отражает только результаты, внесённые пользователем. Это не доказанная историческая доходность стратегии.</p>
 </div>;
}
export function PaperResearchTicket({event,quotes}:{event:LiveEventSummary;quotes:LiveQuotePreview[]}){
 const [entries,setEntries]=useState<PaperEntry[]>([]);
 const [bankroll,setBankroll]=useState(1000);
 const [manual,setManual]=useState("1.50");
 const [stake,setStake]=useState("10");
 const [selected,setSelected]=useState("");
 const [outcome,setOutcome]=useState<Record<string,string>>({});
 const [message,setMessage]=useState("");
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{
  try{
   setEntries(parsePaperEntries(JSON.parse(localStorage.getItem(PAPER_STORAGE_KEY)||"[]")));
   const localBank=Number(localStorage.getItem(PAPER_BANK_KEY));
   if([100,1000,10000].includes(localBank))setBankroll(localBank);
  }catch{/* Privacy mode or corrupted local data; leave empty without inventing history */ }
  setLoaded(true);
 },[]);
 const stats=useMemo(()=>paperJournalStats(entries,bankroll),[entries,bankroll]);
 const deduped=useMemo(()=>{
  const map=new Map<string,LiveQuotePreview>();
  for(const q of quotes){
   if(q.suspended||!Number.isFinite(q.decimalOdds)||q.decimalOdds<=1||!Number.isFinite(Date.parse(q.capturedAt)))continue;
   const key=[q.provider,q.marketKey,q.selectionKey,q.bookmaker].join("|");
   if(!map.has(key)||Date.parse(q.capturedAt)>Date.parse(map.get(key)!.capturedAt))map.set(key,q);
  }
  return [...map.values()].sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt)).slice(0,24);
 },[quotes]);
 const candidate=deduped.find(q=>[q.provider,q.marketKey,q.selectionKey,q.bookmaker].join("|")===selected);
 const odds=candidate?.decimalOdds??Number(manual);
 const amount=Number(stake);
 const valid=Number.isFinite(odds)&&odds>1&&odds<=1000&&Number.isFinite(amount)&&amount>0;
 const withinRisk=valid&&amount<=stats.maxNewStake+.0001;
 const currentEntries=entries.filter(x=>x.eventId===event.id).slice(-12).reverse();
 const save=(next:PaperEntry[],okText:string)=>{
  const safe=next.slice(-MAX_ENTRIES);
  setEntries(safe);
  try{localStorage.setItem(PAPER_STORAGE_KEY,JSON.stringify(safe));setMessage(okText);}
  catch{setMessage("Изменение сохранено только до закрытия этого сеанса. Браузер запретил постоянное хранение.");}
 };
 const place=()=>{
  if(!loaded||!valid||!withinRisk){
   setMessage(`Виртуальный риск на одну запись ограничен 2% начального банка и доступным остатком: сейчас максимум ${fmt(stats.maxNewStake)} ед.`);
   return;
  }
  const recordedAt=new Date().toISOString();
  const row:PaperEntry={
   id:crypto.randomUUID(),eventId:event.id,match:event.homeName+" — "+event.awayName,
   scenario:candidate?candidate.selectionLabel+" · "+candidate.marketKey:"Ручная гипотеза · рынок НЕ проверен",
   odds,stake:amount,recordedAt,source:candidate?"SOURCE_SNAPSHOT":"HYPOTHETICAL_MANUAL",
   quoteCapturedAt:candidate?.capturedAt,status:"UNSETTLED",
  };
  save([...entries,row],"Виртуальный тест сохранён локально. Исход матча автоматически не проверялся.");
 };
 const settle=(row:PaperEntry)=>{
  const status=outcome[row.id];
  if(row.status!=="UNSETTLED"||!["MANUAL_WIN","MANUAL_LOSS","MANUAL_VOID"].includes(status))return;
  const next=entries.map(e=>e.id===row.id?{...e,status:status as PaperStatus,settledAt:new Date().toISOString()}:e);
  save(next,"Результат внесён ВРУЧНУЮ. Его достоверность VETO не проверял.");
 };
 const chooseBank=(n:number)=>{
  if(![100,1000,10000].includes(n))return;
  setBankroll(n);
  try{localStorage.setItem(PAPER_BANK_KEY,String(n));}
  catch{setMessage("Браузер не сохранил выбранный виртуальный банк.");}
 };
 const exportCsv=()=>{
  if(entries.length===0){setMessage("Журнал пока пуст.");return;}
  const blob=new Blob(["\uFEFF",paperCsv(entries)],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");anchor.href=url;anchor.download="veto-sport-paper-journal.csv";
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  setMessage("CSV экспортирован. Исходы по-прежнему обозначены как MANUAL_UNVERIFIED.");
 };
 return <section className="paperStudio paperLedger" id="veto-paper-studio">
  <header className="observedStudioSectionHead">
   <div><span>03 / PAPER LAB · NO REAL MONEY</span><h3>Paper Trading · лаборатория</h3>
    <p>Виртуальный банк, журнал исследований, ручной расчёт результатов и контроль риска. Никаких реальных ставок или подключений к букмекеру.</p>
   </div>
   <span className="observedStudioCount">100% ВИРТУАЛЬНО</span>
  </header>
  <div className="paperControlBar">
    <label>Виртуальный начальный банк
     <select value={bankroll} onChange={e=>chooseBank(Number(e.target.value))} aria-label="Начальный виртуальный банк">
      <option value="100">100 единиц</option><option value="1000">1 000 единиц</option><option value="10000">10 000 единиц</option>
     </select>
    </label>
    <span>Лимит на один тест: <strong>2%</strong> от начального банка</span>
    <button type="button" onClick={exportCsv} disabled={!entries.length}>Экспорт журнала CSV ↗</button>
  </div>
  <div className="paperPerformance" aria-label="Метрики виртуального журнала с результатами, внесёнными вручную">
   <article><small>ВИРТУАЛЬНЫЙ КАПИТАЛ</small><strong>{fmt(stats.equity)}</strong><span>начальный банк + ручной P&amp;L</span></article>
   <article><small>РУЧНОЙ P&amp;L</small><strong className={stats.net<0?"negative":stats.net>0?"positive":""}>{stats.net>0?"+":""}{fmt(stats.net)}</strong><span>не проверено VETO автоматически</span></article>
   <article><small>ROI ПО РУЧНЫМ ИСХОДАМ</small><strong className={stats.roi<0?"negative":stats.roi>0?"positive":""}>{stats.roi>0?"+":""}{stats.roi.toFixed(1)}%</strong><span>{stats.settled} рассчитано · {stats.unsettled} ожидают</span></article>
   <article><small>МАКСИМАЛЬНАЯ ПРОСАДКА</small><strong>{fmt(stats.maxDrawdown)}</strong><span>по введённым вручную исходам</span></article>
  </div>
  <div className="paperEquityWrap">
   <header><span>P&amp;L / MANUAL EQUITY</span><strong>История виртуального капитала</strong><small>{stats.wins} побед · {stats.losses} поражений · {stats.voids} возвратов</small></header>
   <PaperEquityChart points={stats.equityPoints} count={stats.settled}/>
  </div>
  <div className="paperStudioGrid">
   <div className="paperTicketEditor">
    <h4>Добавить виртуальный эксперимент</h4>
    <label>Коэффициент или ручной сценарий
     <select value={selected} onChange={e=>setSelected(e.target.value)}>
      <option value="">Ручной гипотетический сценарий</option>
      {deduped.map(q=><option key={[q.provider,q.marketKey,q.selectionKey,q.bookmaker].join("|")} value={[q.provider,q.marketKey,q.selectionKey,q.bookmaker].join("|")}>
       {q.selectionLabel} · {q.decimalOdds.toFixed(2)} · {q.bookmaker}
      </option>)}
     </select>
    </label>
    <div className="paperTicketFields">
     <label>Коэффициент
      <input type="number" min="1.01" max="1000" step="0.01" inputMode="decimal" value={candidate?candidate.decimalOdds:manual}
       disabled={Boolean(candidate)} onChange={e=>setManual(e.target.value)}/>
     </label>
     <label>Виртуальная сумма
      <input type="number" min="0.01" step="0.1" inputMode="decimal" value={stake} onChange={e=>setStake(e.target.value)}/>
     </label>
    </div>
    <div className="paperTicketMetrics">
     <article><span>В РИСКЕ (ВИРТУАЛЬНО)</span><strong>{valid?fmt(amount):"—"}</strong></article>
     <article><span>ПРИБЫЛЬ ПРИ РУЧНОМ WIN</span><strong>{valid?fmt(amount*(odds-1)):"—"}</strong></article>
     <article><span>ПОРОГ БЕЗУБЫТОЧНОСТИ</span><strong>{valid?(100/odds).toFixed(1)+"%":"—"}</strong></article>
    </div>
    <div className="paperRiskNotice" role="status">
     <span className={withinRisk?"ok":"warn"} aria-hidden="true">●</span>
     <div><strong>{withinRisk?"Виртуальный лимит соблюдён":"Превышен виртуальный риск"}</strong>
       <p>Максимум для новой записи: {fmt(stats.maxNewStake)} ед. · Открытая виртуальная экспозиция: {fmt(stats.exposure)} ед.</p>
     </div>
    </div>
    {candidate?<p className="paperQuoteCaveat">Цена провайдера {candidate.provider} · записана {ruDate(candidate.capturedAt)}. Это архивный снимок, не обещание исполнения.</p>:
     <p className="paperQuoteCaveat">Ручная цена — гипотеза, которой нет в подтверждённой букмекерской линии.</p>}
    <button className="paperTicketCommit" type="button" disabled={!loaded||!withinRisk} onClick={place}>Записать виртуальную ставку ↗</button>
    {message&&<p className="paperTicketMessage" role="status">{message}</p>}
   </div>
   <div className="paperTicketHistory">
    <div className="paperTicketHistoryHeading"><span>ЖУРНАЛ ЭТОГО МАТЧА</span><b>{currentEntries.length} ПОКАЗАНО</b></div>
    {currentEntries.length?currentEntries.map(e=><article className="paperLedgerEntry" key={e.id}>
      <div><strong>{e.scenario}</strong><span>{e.source==="SOURCE_SNAPSHOT"?"СОХРАНЁННЫЙ СНИМОК · НЕ ИСПОЛНЕН":"РУЧНАЯ ГИПОТЕЗА"}</span></div>
      <div><b>{e.odds.toFixed(2)}</b><small>{fmt(e.stake)} виртуальных единиц</small></div>
      <time dateTime={e.recordedAt}>{ruDate(e.recordedAt)}</time>
      <em>{e.status==="UNSETTLED"?"НЕ РАССЧИТАНО":outcomeNames[e.status]}</em>
      {e.status==="UNSETTLED"?<div className="paperOutcomeControls">
        <label>Результат (внести вручную)
         <select value={outcome[e.id]||""} onChange={ev=>setOutcome(prev=>({...prev,[e.id]:ev.target.value}))}>
          <option value="">Выбери исход…</option>
          <option value="MANUAL_WIN">Победа (по твоей проверке)</option>
          <option value="MANUAL_LOSS">Проигрыш (по твоей проверке)</option>
          <option value="MANUAL_VOID">Возврат (по твоей проверке)</option>
         </select>
        </label>
        <button type="button" disabled={!outcome[e.id]} onClick={()=>settle(e)}>Подтвердить результат ↗</button>
       </div>:
       <strong className={"paperOutcomeNet "+((paperProfit(e)??0)<0?"negative":"positive")}>
        РУЧНОЙ P&amp;L: {(paperProfit(e)??0)>0?"+":""}{fmt(paperProfit(e)??0)} · НЕ ПРОВЕРЕНО
       </strong>}
    </article>):<div className="paperEmpty"><span aria-hidden="true">▱</span><strong>Виртуальный журнал пуст</strong>
      <p>Добавь гипотетический тест. Ни банк, ни результат не являются реальными деньгами.</p></div>}
    <p className="paperJournalCaveat">Данные хранятся на этом устройстве. Расчёт победы/поражения делается ТОЛЬКО после твоего ручного подтверждения. VETO не проверяет итог матча или правила букмекерского рынка. Экспортируй CSV для резервной копии.</p>
   </div>
  </div>
 </section>;
}
