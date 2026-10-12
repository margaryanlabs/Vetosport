"use client";
import {useEffect,useMemo,useState} from "react";
import type {LiveEventSummary,LiveQuotePreview} from "@/lib/live/types";

type PaperEntry={id:string;eventId:string;match:string;scenario:string;odds:number;stake:number;recordedAt:string;
  source:"HYPOTHETICAL_MANUAL"|"SOURCE_SNAPSHOT";quoteCapturedAt?:string;status:"UNSETTLED";};
const storageKey="veto-sport-paper-research-v1";
export function PaperResearchTicket({event,quotes}:{event:LiveEventSummary;quotes:LiveQuotePreview[]}){
 const [entries,setEntries]=useState<PaperEntry[]>([]);
 const [manual,setManual]=useState("1.50");
 const [stake,setStake]=useState(10);
 const [selected,setSelected]=useState("");
 const [message,setMessage]=useState("");
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{
  try{const parsed:unknown=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(parsed))setEntries(parsed.filter(
   (r):r is PaperEntry=>!!r&&typeof r==="object"&&typeof r.eventId==="string"&&typeof r.id==="string"&&r.status==="UNSETTLED"
  ).slice(-50));}catch{/* Browser in privacy mode or invalid older records */}setLoaded(true);
 },[]);
 const deduped=useMemo(()=>{
  const m=new Map<string,LiveQuotePreview>();
  for(const q of quotes){if(q.suspended||!Number.isFinite(q.decimalOdds)||q.decimalOdds<=1)continue;
   const key=[q.provider,q.marketKey,q.selectionKey,q.bookmaker].join("|");
   if(!m.has(key)||Date.parse(q.capturedAt)>Date.parse(m.get(key)!.capturedAt))m.set(key,q);
  }return[...m.values()].sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt)).slice(0,20);
 },[quotes]);
 const candidate=deduped.find(q=>[q.provider,q.marketKey,q.selectionKey,q.bookmaker].join("|")===selected);
 const hypothetical=Number(manual);
 const odds=candidate?.decimalOdds??hypothetical;
 const valid=Number.isFinite(odds)&&odds>1&&odds<=1000;
 const ownEntries=entries.filter(x=>x.eventId===event.id).slice(-4).reverse();
 const commit=()=>{
  if(!valid||stake<=0||stake>100){setMessage("Укажи корректный коэффициент и виртуальную сумму 1–100.");return;}
  const entry:PaperEntry={
   id:crypto.randomUUID(),eventId:event.id,match:event.homeName+" — "+event.awayName,
   scenario:candidate?candidate.selectionLabel+" · "+candidate.marketKey:"Ручной сценарий · рынок не подтверждён",
   odds,stake,recordedAt:new Date().toISOString(),source:candidate?"SOURCE_SNAPSHOT":"HYPOTHETICAL_MANUAL",
   quoteCapturedAt:candidate?.capturedAt,status:"UNSETTLED",
  };
  const next=[...entries,entry].slice(-50);
  setEntries(next);
  try{localStorage.setItem(storageKey,JSON.stringify(next));setMessage("Виртуальная запись добавлена на этом устройстве. Исход не рассчитан.");}
  catch{setMessage("Запись в этом сеансе сохранена, но браузер не разрешил постоянное хранение.");}
 };
 return <section className="paperStudio" id="veto-paper-studio">
  <header className="observedStudioSectionHead"><div>
   <span>03 / PAPER TEST · LOCAL ONLY</span><h3>Проверить без реальных денег</h3>
   <p>Только виртуальный эксперимент. Не подключает букмекеров, не делает платежей и не утверждает, что коэффициент доступен сейчас.</p></div>
   <span className="observedStudioCount">₮0 REAL</span>
  </header>
  <div className="paperStudioGrid">
   <div className="paperTicketEditor">
    <label>Исследуемая котировка или ручной сценарий
      <select value={selected} onChange={e=>setSelected(e.target.value)}>
       <option value="">Ручной гипотетический сценарий</option>
       {deduped.map(q=><option key={[q.provider,q.marketKey,q.selectionKey,q.bookmaker].join("|")} value={[q.provider,q.marketKey,q.selectionKey,q.bookmaker].join("|")}>{q.selectionLabel} · {q.decimalOdds.toFixed(2)} · {q.bookmaker}</option>)}
      </select>
    </label>
    <div className="paperTicketFields">
     <label>Коэффициент
      <input type="number" min="1.01" max="1000" step="0.01" inputMode="decimal" value={candidate?candidate.decimalOdds:manual} disabled={!!candidate} onChange={e=>setManual(e.target.value)}/>
     </label>
     <label>Виртуальная сумма
      <select value={stake} onChange={e=>setStake(Number(e.target.value))}>
       <option value={1}>1 единица</option><option value={10}>10 единиц</option><option value={25}>25 единиц</option><option value={100}>100 единиц</option>
      </select>
     </label>
    </div>
    <div className="paperTicketMetrics">
     <article><span>В РИСКЕ (ВИРТУАЛЬНО)</span><strong>{stake.toFixed(2)}</strong></article>
     <article><span>ВОЗМОЖНЫЙ ПЛЮС ПРИ ВЫИГРЫШЕ</span><strong>{valid?(stake*(odds-1)).toFixed(2):"—"}</strong></article>
     <article><span>ПОРОГ БЕЗУБЫТОЧНОСТИ</span><strong>{valid?(100/odds).toFixed(1)+"%":"—"}</strong></article>
    </div>
    {candidate&&<p className="paperQuoteCaveat">Источник: {candidate.provider} · цена записана {new Date(candidate.capturedAt).toLocaleString("ru-RU")}. Это старый или текущий снимок, не обещание исполнения по такой цене.</p>}
    {!candidate&&<p className="paperQuoteCaveat">Ручная цена не подтверждена поставщиком данных. Это только гипотетическая проверка формулы.</p>}
    <button className="paperTicketCommit" type="button" disabled={!loaded||!valid} onClick={commit}>Сохранить виртуальную проверку ↗</button>
    {message&&<p className="paperTicketMessage" role="status">{message}</p>}
   </div>
   <div className="paperTicketHistory">
    <div className="paperTicketHistoryHeading"><span>ЛОКАЛЬНЫЙ ЖУРНАЛ</span><b>{ownEntries.length} ПОКАЗАНО</b></div>
    {ownEntries.length?ownEntries.map(e=><article key={e.id}>
      <div><strong>{e.scenario}</strong><span>{e.source==="SOURCE_SNAPSHOT"?"СНИМОК ПРОВАЙДЕРА":"РУЧНАЯ ГИПОТЕЗА"}</span></div>
      <div><b>{e.odds.toFixed(2)}</b><small>{e.stake} виртуальных единиц</small></div>
      <time dateTime={e.recordedAt}>{new Date(e.recordedAt).toLocaleString("ru-RU")}</time>
      <em>НЕ РАССЧИТАНО</em>
    </article>):<div className="paperEmpty"><span aria-hidden="true">▱</span><strong>Здесь пока нет тестов</strong><p>Сохрани первый виртуальный эксперимент, чтобы сравнивать гипотезы без риска деньгами.</p></div>}
    <p className="paperJournalCaveat">Записи хранятся только в этом браузере. Результаты матчей и P&amp;L пока не рассчитываются — выдуманной доходности не будет.</p>
   </div>
  </div>
 </section>;
}
