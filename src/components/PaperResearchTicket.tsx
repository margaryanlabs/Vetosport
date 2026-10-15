"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import type {LiveEventSummary,LiveQuotePreview} from "@/lib/live/types";
import {MAX_ENTRIES,PAPER_BANK_KEY,PAPER_STORAGE_KEY,parsePaperEntries,
 paperCsv,paperJournalStats,paperProfit,paperExpectedValue,type PaperEntry,type PaperStatus} from "@/lib/paper/paper-ledger";
import {paperContractFromQuote,reconcilePaperEntry,type CertifiedPaperFinal} from "@/lib/paper/paper-verification";

const outcomeNames:{[K in Exclude<PaperStatus,"UNSETTLED">]:string}={
 MANUAL_WIN:"Победа — введено вручную",
 MANUAL_LOSS:"Поражение — введено вручную",
 MANUAL_VOID:"Возврат — введено вручную",
 PROVIDER_WIN:"Победа · результат API-Football FT",
 PROVIDER_LOSS:"Поражение · результат API-Football FT",
 PROVIDER_VOID:"Возврат · результат API-Football FT",
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
 const [hypothesis,setHypothesis]=useState("");
 const [estimatedProbability,setEstimatedProbability]=useState("");
 const [historyScope,setHistoryScope]=useState<"EVENT"|"ALL"|"PENDING">("EVENT");
 const [outcome,setOutcome]=useState<Record<string,string>>({});
 const [message,setMessage]=useState("");
 const [loaded,setLoaded]=useState(false);
 const [verifying,setVerifying]=useState(false);
 const [verificationNote,setVerificationNote]=useState("");
 const entriesRef=useRef<PaperEntry[]>([]);
 const autoCheckedRef=useRef(false);
 const inFlightRef=useRef(false);
 entriesRef.current=entries;
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
 const missingQuote=Boolean(selected&&!candidate);
 const odds=candidate?.decimalOdds??Number(manual);
 const amount=Number(stake);
 const valid=Number.isFinite(odds)&&odds>1&&odds<=1000&&Number.isFinite(amount)&&amount>0;
 const withinRisk=valid&&amount<=stats.maxNewStake+.0001;
 const probabilityInput=estimatedProbability.trim();
 const userProbability=probabilityInput?Number(probabilityInput)/100:null;
 const invalidProbability=userProbability!==null&&(!Number.isFinite(userProbability)||userProbability<=0||userProbability>=1);
 const subjectiveEV=valid&&userProbability!==null&&!invalidProbability?paperExpectedValue(amount,odds,userProbability):null;
 const quoteCapturedMs=Date.parse(candidate?.capturedAt??"");
 const canRecord=withinRisk&&!missingQuote&&!invalidProbability&&
  event.status!=="finished"&&event.status!=="suspended"&&
  (!candidate||(Number.isFinite(quoteCapturedMs)&&quoteCapturedMs<=Date.now()+5000));
 const currentEntries=useMemo(()=>entries.filter(x=>
   historyScope==="EVENT"?x.eventId===event.id:
   historyScope==="PENDING"?x.status==="UNSETTLED":true
 ).slice(-20).reverse(),[entries,event.id,historyScope]);
 const save=(next:PaperEntry[],okText:string)=>{
  const safe=next.slice(-MAX_ENTRIES);
  entriesRef.current=safe;
  setEntries(safe);
  try{localStorage.setItem(PAPER_STORAGE_KEY,JSON.stringify(safe));setMessage(okText);}
  catch{setMessage("Изменение сохранено только до закрытия этого сеанса. Браузер запретил постоянное хранение.");}
 };
 const place=()=>{
  if(!loaded||!canRecord){
   setMessage(event.status==="finished"||event.status==="suspended"?"Матч уже завершён или приостановлен. Новые эксперименты после результата не записываем.":
    missingQuote?"Исходный снимок коэффициента больше не доступен. Выбери другой снимок или явно переключись на ручную гипотезу.":
    invalidProbability?"Вероятность должна быть больше 0% и меньше 100%.":
    `Виртуальный риск на одну запись ограничен 2% начального банка и доступным остатком: сейчас максимум ${fmt(stats.maxNewStake)} ед.`);
   return;
  }
  const recordedAt=new Date().toISOString();
  const row:PaperEntry={
   id:crypto.randomUUID(),eventId:event.id,match:event.homeName+" — "+event.awayName,
   scenario:candidate?candidate.selectionLabel+" · "+candidate.marketKey:(hypothesis.trim()||"Ручная гипотеза · рынок НЕ проверен"),
   odds,stake:amount,recordedAt,source:candidate?"SOURCE_SNAPSHOT":"HYPOTHETICAL_MANUAL",
   quoteCapturedAt:candidate?.capturedAt,
   marketContract:candidate?paperContractFromQuote(event,candidate)??undefined:undefined,
   selectionMarketKey:candidate?.marketKey,selectionKey:candidate?.selectionKey,
   hypothesis:hypothesis.trim().slice(0,300)||undefined,
   estimatedProbability:userProbability??undefined,status:"UNSETTLED",
  };
  save([...entries,row],"Виртуальный тест сохранён локально. Исход матча автоматически не проверялся.");
 };
 const settle=(row:PaperEntry)=>{
  const status=outcome[row.id];
  if(row.status!=="UNSETTLED"||!["MANUAL_WIN","MANUAL_LOSS","MANUAL_VOID"].includes(status))return;
  const next=entries.map(e=>e.id===row.id?{...e,status:status as PaperStatus,settledAt:new Date().toISOString()}:e);
  save(next,"Результат внесён ВРУЧНУЮ. Его достоверность VETO не проверял.");
 };
 /** Run once on journal hydration and on demand. Only exact certified FT
  * is applied locally, and only to selections locked before the FT record.
  */
 const checkCertifiedFinals=async()=>{
  if(!loaded||inFlightRef.current)return;
  const pending=entriesRef.current.filter(e=>e.status==="UNSETTLED"&&
   e.source==="SOURCE_SNAPSHOT"&&e.marketContract&&e.quoteCapturedAt);
  const eventIds=[...new Set(pending.map(e=>e.eventId))].slice(0,8);
  if(!eventIds.length){setVerificationNote("Нет незавершённых записей с однозначным рынком и снимком реальной цены.");return;}
  inFlightRef.current=true;
  setVerifying(true);
  setVerificationNote("Сверяем сохранённые события с записями FT провайдера…");
  try{
   const response=await fetch("/api/intelligence/paper-journal/finals",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({eventIds}),cache:"no-store"});
   if(!response.ok)throw Error("PROVIDER_FT_NOT_AVAILABLE");
   const data:unknown=await response.json();
   const finals=(data&&typeof data==="object"&&"finals" in data)?
    (data as {finals?:unknown}).finals:null;
   if(!Array.isArray(finals))throw Error("INVALID_CERTIFICATE_REPLY");
   const byId=new Map<string,CertifiedPaperFinal>();
   for(const raw of finals){
    if(!raw||typeof raw!=="object")continue;
    const cert=raw as CertifiedPaperFinal;
    if(typeof cert.eventId==="string"&&
      cert.source==="api-football.fixtures.results"&&cert.provider==="api-football"&&
      cert.regulationTimeOnly===true)byId.set(cert.eventId,cert);
   }
   let updated=0;
   const next=entriesRef.current.map(e=>{
    const cert=byId.get(e.eventId);
    const settled=cert?reconcilePaperEntry(e,cert):null;
    if(settled){updated++;return settled;}
    return e;
   });
   if(updated)save(next,`Сверено ${updated} виртуальных исходов. Это не доказательство доступной ставки или прибыльности модели.`);
   setVerificationNote(updated?
    `Подтверждено по FT провайдера: ${updated}. Остальные исходы требуют данных или ручной проверки.`:
    "Новых однозначно подтверждённых FT нет. Никаких результатов не подставлено.");
  }catch{
   setVerificationNote("Источник финальных результатов временно недоступен. Записи остаются без изменений.");
  }finally{inFlightRef.current=false;setVerifying(false);}
 };
 // The background-free hydration check runs only when a journal is opened.
 useEffect(()=>{
  if(!loaded||autoCheckedRef.current)return;
  autoCheckedRef.current=true;
  if(entries.some(e=>e.status==="UNSETTLED"&&e.marketContract&&e.source==="SOURCE_SNAPSHOT"))
   void checkCertifiedFinals();
 // Intentionally one run per mounting of the lab, not polling.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[loaded]);
 const chooseBank=(n:number)=>{
  if(![100,1000,10000].includes(n))return;
  if(entries.length>0){setMessage("Начальный виртуальный банк зафиксирован после первой записи. Изменение переписало бы историю результатов.");return;}
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
   <div><span>03 / PAPER LAB · NO REAL MONEY</span><h3>Paper Betting Lab</h3>
    <p>Сохраняй гипотезы и исходные цены. Поддерживаемые исходы 1X2/BTTS сверяются с сохранёнными результатами API-Football FT. Остальные исходы — только вручную.</p>
   </div>
   <span className="observedStudioCount">100% ВИРТУАЛЬНО</span>
  </header>
  <div className="paperControlBar">
    <label>Виртуальный начальный банк
     <select value={bankroll} disabled={entries.length>0} onChange={e=>chooseBank(Number(e.target.value))} aria-label="Начальный виртуальный банк">
      <option value="100">100 единиц</option><option value="1000">1 000 единиц</option><option value="10000">10 000 единиц</option>
     </select>
    </label>
    <span>{entries.length?"Банк зафиксирован · ":"Лимит на один тест: "}<strong>{entries.length?fmt(bankroll):"2%"}</strong>{entries.length?" · журнал сохранён":" от начального банка"}</span>
    <button type="button" onClick={exportCsv} disabled={!entries.length}>Экспорт журнала CSV ↗</button>
  </div>
  <div className="paperFinalVerification" role="status">
   <div><strong>Сверка результатов · API-Football FT</strong>
    <p>{verificationNote||"Только однозначные исходы 1X2 / BTTS по сохранённым котировкам. Неподдерживаемые рынки останутся для ручного подтверждения."}</p>
    <small>Подтверждение счёта ≠ подтверждение исполнимости коэффициента или доходности стратегии.</small>
   </div>
   <button type="button" disabled={!loaded||verifying} onClick={()=>void checkCertifiedFinals()}>
    {verifying?"Проверяем…":"Сверить исходы ↗"}
   </button>
  </div>
  <div className="paperPerformance" aria-label="Метрики виртуального журнала с ручными и отдельно помеченными сверенными результатами">
   <article><small>ВИРТУАЛЬНЫЙ КАПИТАЛ</small><strong>{fmt(stats.equity)}</strong><span>Доступно для новых тестов: {fmt(stats.available)}</span></article>
   <article><small>PAPER P&amp;L · СВЕРЕННЫЙ + РУЧНОЙ</small><strong className={stats.net<0?"negative":stats.net>0?"positive":""}>{stats.net>0?"+":""}{fmt(stats.net)}</strong><span>{stats.providerSettled} исходов подтверждено FT · {stats.manualSettled} вручную</span></article>
   <article><small>PAPER YIELD · ВСЕ РЕЗУЛЬТАТЫ</small><strong className={stats.roi<0?"negative":stats.roi>0?"positive":""}>{stats.settled?stats.roi>0?"+":"":""}{stats.settled?stats.roi.toFixed(1)+"%":"—"}</strong><span>Чистый P&amp;L / сумма завершённых виртуальных ставок</span></article>
   <article><small>МАКСИМАЛЬНАЯ ПРОСАДКА</small><strong>{fmt(stats.maxDrawdown)}</strong><span>по сохранённым виртуальным результатам</span></article>
  </div>
  <div className="paperResearchPulse" aria-label="Статистика виртуальных экспериментов">
   <div><small>ЗАПИСЕЙ</small><b>{entries.length}</b></div>
   <div><small>ОЖИДАЮТ РЕЗУЛЬТАТА</small><b>{stats.unsettled}</b></div>
   <div><small>WIN RATE · PAPER</small><b>{stats.wins+stats.losses?stats.hitRate.toFixed(1)+"%":"—"}</b></div>
   <div><small>ДОХОДНОСТЬ НА БАНК · PAPER</small><b>{stats.settled?(stats.bankrollReturnPct>0?"+":"")+stats.bankrollReturnPct.toFixed(1)+"%":"—"}</b></div>
   <div><small>ОТКРЫТАЯ ЭКСПОЗИЦИЯ</small><b>{fmt(stats.exposure)}</b></div>
  </div>
  <div className="paperEquityWrap">
   <header><span>PAPER P&amp;L / MIXED EVIDENCE</span><strong>История виртуального капитала</strong><small>{stats.wins} побед · {stats.losses} поражений · {stats.voids} возвратов</small></header>
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
    <label className="paperResearchInput">Гипотеза / причина эксперимента
      <input type="text" maxLength={300} value={hypothesis} onChange={e=>setHypothesis(e.target.value)}
       placeholder="Например: низкий темп во втором тайме" aria-label="Гипотеза эксперимента"/>
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
    <label className="paperResearchInput">Твоя оценка вероятности, % (необязательно)
      <input type="number" min="0.1" max="99.9" step="0.1" inputMode="decimal"
       value={estimatedProbability} onChange={e=>setEstimatedProbability(e.target.value)}
       placeholder="Например: 60" aria-label="Субъективная вероятность в процентах"/>
    </label>
    <div className="paperTicketMetrics">
     <article><span>В РИСКЕ (ВИРТУАЛЬНО)</span><strong>{valid?fmt(amount):"—"}</strong></article>
     <article><span>ПРИБЫЛЬ ПРИ РУЧНОМ WIN</span><strong>{valid?fmt(amount*(odds-1)):"—"}</strong></article>
     <article><span>ПОРОГ БЕЗУБЫТОЧНОСТИ</span><strong>{valid?(100/odds).toFixed(1)+"%":"—"}</strong></article>
    </div>
    <div className="paperSubjectiveEdge" role="status">
      <div><span>USER ESTIMATE · НЕ ПРОГНОЗ VETO</span>
       <strong>{subjectiveEV===null?"Укажи вероятность для оценки EV":(subjectiveEV>0?"+":"")+fmt(subjectiveEV)+" ед. ожидаемого P&L"}</strong></div>
      <small>{subjectiveEV===null?"Ожидаемая стоимость рассчитывается только по твоей субъективной вероятности. Преимущество не подтверждено.":
       "EV = сумма × (твоя вероятность × коэффициент − 1). Это математическая иллюстрация, не подтверждённое преимущество."}</small>
    </div>
    <div className="paperRiskNotice" role="status">
     <span className={withinRisk?"ok":"warn"} aria-hidden="true">●</span>
     <div><strong>{missingQuote?"Снимок коэффициента больше недоступен":invalidProbability?"Некорректная вероятность":withinRisk?"Виртуальный лимит соблюдён":"Превышен виртуальный риск"}</strong>
       <p>Максимум для новой записи: {fmt(stats.maxNewStake)} ед. · Открытая виртуальная экспозиция: {fmt(stats.exposure)} ед.</p>
     </div>
    </div>
    {candidate?<p className="paperQuoteCaveat">Цена провайдера {candidate.provider} · записана {ruDate(candidate.capturedAt)}. {paperContractFromQuote(event,candidate)?"Исход подходит для сверки после FT.":"Рынок пока можно закрыть только вручную."} Это архивный снимок, не обещание исполнения.</p>:
     <p className="paperQuoteCaveat">Ручная цена — гипотеза, которой нет в подтверждённой букмекерской линии.</p>}
    <button className="paperTicketCommit" type="button" disabled={!loaded||!canRecord} onClick={place}>Зафиксировать paper-эксперимент ↗</button>
    {message&&<p className="paperTicketMessage" role="status">{message}</p>}
   </div>
   <div className="paperTicketHistory">
    <div className="paperTicketHistoryHeading"><span>ЖУРНАЛ ЭКСПЕРИМЕНТОВ</span><b>{currentEntries.length} ИЗ {entries.length}</b></div>
    <div className="paperHistoryFilters" role="group" aria-label="Фильтр виртуального журнала">
      <button type="button" className={historyScope==="EVENT"?"active":""} aria-pressed={historyScope==="EVENT"} onClick={()=>setHistoryScope("EVENT")}>Этот матч</button>
      <button type="button" className={historyScope==="ALL"?"active":""} aria-pressed={historyScope==="ALL"} onClick={()=>setHistoryScope("ALL")}>Все матчи</button>
      <button type="button" className={historyScope==="PENDING"?"active":""} aria-pressed={historyScope==="PENDING"} onClick={()=>setHistoryScope("PENDING")}>Ожидают · {stats.unsettled}</button>
    </div>
    {currentEntries.length?currentEntries.map(e=><article className="paperLedgerEntry" key={e.id}>
      <div><strong>{e.scenario}</strong>
       <span>{historyScope==="EVENT"?"":e.match+" · "}{e.source==="SOURCE_SNAPSHOT"?"СНИМОК КОЭФФИЦИЕНТА · НЕ ИСПОЛНЕН":"РУЧНАЯ ГИПОТЕЗА"}</span>
       {e.hypothesis&&e.hypothesis!==e.scenario?<small>ГИПОТЕЗА: {e.hypothesis}</small>:null}
       {e.estimatedProbability!==undefined?<small>ОЦЕНКА ПОЛЬЗОВАТЕЛЯ: {(e.estimatedProbability*100).toFixed(1)}% · EV {fmt(paperExpectedValue(e.stake,e.odds,e.estimatedProbability)??0)} · НЕ ВЕРИФИЦИРОВАНО</small>:null}
       {e.marketContract&&<small>ЗАФИКСИРОВАННЫЙ РЫНОК: {e.marketContract}</small>}
       {e.verifiedScore&&<small>СЧЁТ FT: {e.verifiedScore.home}:{e.verifiedScore.away} · {e.verifiedProvider} · НЕ ФАКТ ИСПОЛНЕНИЯ</small>}
      </div>
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
        {e.status.startsWith("PROVIDER_")?"PAPER P&L / FT СВЕРЕН":"РУЧНОЙ P&L / НЕ ПРОВЕРЕНО"}: {(paperProfit(e)??0)>0?"+":""}{fmt(paperProfit(e)??0)}
       </strong>}
    </article>):<div className="paperEmpty"><span aria-hidden="true">▱</span><strong>{entries.length?"В выбранном фильтре нет записей":"Виртуальный журнал пуст"}</strong>
      <p>{entries.length?"Переключись на «Все матчи», чтобы увидеть другие исследования.":"Добавь гипотетический тест. Ни банк, ни результат не являются реальными деньгами."}</p></div>}
    <p className="paperJournalCaveat">Локальный исследовательский журнал: данные остаются на устройстве. Исходы MANUAL не подтверждены VETO, результаты PROVIDER подтверждают лишь финальный счёт, а не реальность ставки. Вероятность — только оценка пользователя; не является сигналом к ставке. Перед очисткой браузера экспортируй CSV.{entries.length>=MAX_ENTRIES-10?" Лимит журнала почти достигнут: старые записи могут удаляться при добавлении новых.":""}</p>
   </div>
  </div>
 </section>;
}
