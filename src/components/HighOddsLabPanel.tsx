"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import type {HighOddsAccount,HighOddsSlip,HighOddsProposal} from "@/lib/paper/high-odds-research";

type Payload={ok:true;generatedAt:string;account:HighOddsAccount;
 observer:{lastHeartbeat:string|null;recent:boolean;coverageNote:string};
 methodology:{simulatedOnly:true;executableSportsbookComboPriceVerified:false;
  dailyTicketCap:number;fixtureDailyMaxExposure:number;
  sameEventParlayPriced:false;scientificEdgeProven:false};
 realBetsPlaced:0};
type CandidateReply={ok:true;source:"PERSISTED_ONLY";mode:"UNCOMMITTED_RESEARCH_PREVIEW";
 generatedAt:string;scanned:number;usableLegs:number;virtualBankAvailable:number;
 excluded:{sourceErrors:number;incompleteQuotes:number;noSuitableBook:number};
 proposals:HighOddsProposal[];warning:string[];committed:0};
const usd=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",
 maximumFractionDigits:2,minimumFractionDigits:2}).format(v);
const date=(s:string)=>new Date(s).toLocaleString("ru-RU",
 {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const tier=(x:HighOddsSlip["band"])=>({
 X10_20:"10–20×",X20_50:"20–50×",X50_PLUS:"50× И ВЫШЕ",
}[x]);
const result=(row:HighOddsSlip,slipSettlement:HighOddsAccount["tickets"][number]["settlement"])=>{
 if(!slipSettlement)return "ОЖИДАЕТ ВСЕХ FT";
 return slipSettlement.result==="WIN"?"ВСЕ СОБЫТИЯ СОШЛИСЬ":"КОМБИНАЦИЯ ПРОИГРАЛА";
};
export function HighOddsLabPanel(){
 const [payload,setPayload]=useState<Payload|null>(null);
 const [busy,setBusy]=useState(true);
 const [fault,setFault]=useState("");
 const [candidates,setCandidates]=useState<CandidateReply|null>(null);
 const [candidateBusy,setCandidateBusy]=useState(false);
 const [candidateError,setCandidateError]=useState("");
 const refresh=useCallback(async()=>{
  setBusy(true);
  try{
   const r=await fetch("/api/intelligence/paper-journal/high-odds",{cache:"no-store"});
   if(!r.ok)throw Error("NOT_READY");
   const obj:Payload=await r.json();
   if(!obj.ok||obj.account.source!=="SERVER_PERSISTED"||!obj.account.paperOnly)throw Error("UNVERIFIED");
   setPayload(obj);setFault("");
  }catch{
   setFault("Архив высоких коэффициентов пока недоступен. Не создаём демонстрационные выигрыши.");
  }finally{setBusy(false);}
 },[]);
 useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),60_000);
  return()=>clearInterval(id);},[refresh]);
 const preview=useCallback(async()=>{
  if(candidateBusy)return;
  setCandidateBusy(true);setCandidateError("");
  try{
   const resp=await fetch("/api/intelligence/paper-journal/high-odds/candidates",
    {cache:"no-store"});
   if(!resp.ok)throw Error("SOURCE_NOT_READY");
   const result:CandidateReply=await resp.json();
   if(!result.ok||result.mode!=="UNCOMMITTED_RESEARCH_PREVIEW"||
    result.source!=="PERSISTED_ONLY"||!Array.isArray(result.proposals))
    throw Error("BAD_EVIDENCE");
   setCandidates(result);
  }catch{
   setCandidateError("Нет полного доступа к сохранённым котировкам. Не создаём вымышленные предложения.");
  }finally{setCandidateBusy(false);}
 },[candidateBusy]);
 const bank=payload?.account;
 const linked=useMemo(()=>{
  const map=new Map<string,{name:string;slips:Set<string>;bookmakers:Set<string>}>();
  for(const ticket of bank?.tickets??[])for(const leg of ticket.legs){
   const item=map.get(leg.eventId)??{name:leg.home+" — "+leg.away,
    slips:new Set<string>(),bookmakers:new Set<string>()};
   item.slips.add(ticket.id);item.bookmakers.add(leg.bookmaker);map.set(leg.eventId,item);
  }
  return [...map.values()].filter(x=>x.slips.size>=2).sort((a,b)=>
   b.slips.size-a.slips.size).slice(0,8);
 },[bank]);
 return <section className="hoResearch" aria-labelledby="ho-title">
  <header className="hoHero">
   <div><span className="hoKicker">VETO SCIENCE / HIGH ODDS SHADOW LAB</span>
    <h2 id="ho-title">Longshot<br/><em>Experiments.</em></h2>
    <p>Отдельная лаборатория виртуальных комбинаций с коэффициентами от 10× до 50× и выше. Несколько разных билетов могут включать один и тот же матч. Каждый исход фиксируется до игры, каждый результат требует подтверждённого FT.</p>
   </div>
   <aside><small>НЕЗАВИСИМЫЙ ВИРТУАЛЬНЫЙ СЧЁТ</small>
    <strong>{bank?usd(bank.balance):"$200.00"}</strong>
    <span>Ставка $1 · до 3 разных комбинаций/сутки · максимум $2 на один матч в сутки</span>
    <b>REAL WAGERS: 0</b>
   </aside>
  </header>
  <div className="hoDisclaimer"><b>СИНТЕТИЧЕСКИЙ ЦЕНОВОЙ ЭКСПЕРИМЕНТ</b>
   <span>Коэффициент 10× / 20× / 50×+ — произведение сохранённых одиночных цен по РАЗНЫМ матчам. Букмекер не подтверждал такой экспресс и его исполнимость. Это не прогноз VETO и не доказанная положительная доходность.</span>
  </div>
  <div className="hoStatus">
   <span className={payload?.observer.recent?"ok":""}>● {payload?.observer.recent?
    "АВТОМАТИЗАЦИЯ ОБНАРУЖЕНА":"ЗАПУСК АВТОМАТИЗАЦИИ НЕ ПОДТВЕРЖДЁН"}</span>
   <span>Последняя запись: {payload?.observer.lastHeartbeat?
    date(payload.observer.lastHeartbeat):"ещё не было"}</span>
   <button type="button" onClick={()=>void refresh()} disabled={busy}>{busy?"Проверка…":"Обновить ↻"}</button>
  </div>
  {fault&&<div role="alert" className="hoFault">{fault}</div>}
  {bank&&<>
   <div className="hoKPIs">
    <div><small>ВИРТУАЛЬНЫЙ БАЛАНС</small><strong>{usd(bank.balance)}</strong><span>Старт {usd(bank.nominalInitialBank)}</span></div>
    <div><small>PAPER P&L</small><strong>{bank.net>0?"+":""}{usd(bank.net)}</strong>
     <span>Математическая прибыль, не реальный доход</span></div>
    <div><small>ОТКРЫТЫЕ КОМБИНАЦИИ</small><strong>{bank.open}</strong>
     <span>Резерв {usd(bank.reserved)}</span></div>
    <div><small>ЗАКРЫТЫЕ СЕРТИФИЦИРОВАННЫЕ</small><strong>{bank.settled}</strong>
     <span>{bank.wins} побед / {bank.losses} поражений</span></div>
   </div>
   <div className="hoTracks">
    {(["X10_20","X20_50","X50_PLUS"] as const).map(band=>{
     const rows=bank.tickets.filter(x=>x.band===band);
     const verified=rows.filter(x=>x.settlement);
     const wins=verified.filter(x=>x.settlement?.result==="WIN").length;
     return <article key={band}><span>HYPOTHESIS CLASS / {band}</span>
      <strong>{tier(band)}</strong><div><span>Записано</span><b>{rows.length}</b></div>
      <div><span>Все FT подтверждены</span><b>{verified.length}</b></div>
      <div><span>Все исходы угаданы</span><b>{wins}</b></div>
      <small>Маловероятные комбинации имеют высокую дисперсию. Нельзя интерпретировать несколько побед как преимущество.</small>
     </article>;
    })}
   </div>
   <section className="hoCandidateDesk">
    <header><div><span>REAL SOURCE SCAN / ZERO BOOKMAKER API REQUESTS</span>
     <h3>Кандидаты сейчас</h3>
     <p>Посмотреть, какие теоретические комбинации допускают реальные сохранённые EPL-котировки. Это предпросмотр, а не зарегистрированные ставки. Для попадания в банк $200 необходим отдельный автоматический снимок до матча.</p></div>
     <button type="button" disabled={candidateBusy} onClick={()=>void preview()}>
      {candidateBusy?"Изучаем источник…":"Исследовать текущие коэффициенты ↗"}</button>
    </header>
    {candidateError&&<div className="hoFault" role="alert">{candidateError}</div>}
    {candidates&&<div className="hoCandidates">
     <div className="hoCandidateCounts"><span>Источников матчей: <strong>{candidates.scanned}</strong></span>
      <span>Сопоставленных кандидатов на исход: <strong>{candidates.usableLegs}</strong></span>
      <span>Не было подходящей цены: <strong>{candidates.excluded.noSuitableBook}</strong></span>
      <span>Записано в банк: <strong>0 из этого просмотра</strong></span></div>
     {candidates.proposals.length?candidates.proposals.map((x,i)=><article key={x.band+"-"+i}>
      <header><strong>{tier(x.band)} · {x.syntheticDecimalOdds.toFixed(2)}×</strong>
       <span>ТОЛЬКО ИССЛЕДОВАНИЕ / {x.legs.length} МАТЧА · НЕ БУКМЕКЕРСКАЯ ЦЕНА</span>
      </header>
      {x.legs.map(leg=><div key={leg.eventId}>
       <span>{leg.home} — {leg.away}</span>
       <b>{leg.selectionLabel} · {leg.decimalOdds.toFixed(2)}×</b>
       <small>{leg.bookmaker} · {date(leg.quoteAt)}</small>
      </div>)}
     </article>):<p className="hoEmpty">В текущем архиве нет комбинаций, удовлетворяющих установленным условиям. Алгоритм не добавляет фиктивные матчи.</p>}
     <footer>Источник: только сохранённые котировки The Odds API. Совокупные коэффициенты получены математическим умножением цен на разные события. Положительная ожидаемая доходность не доказана. Кандидаты не считаются размещёнными или исполненными.</footer>
    </div>}
   </section>
   <div className="hoGrid">
    <section className="hoLedger"><header><span>01 / MULTI-EVENT EXPERIMENTS</span>
     <h3>Экспресс-лаборатория</h3></header>
     {bank.tickets.length===0?<div className="hoEmpty">
      Нет подтверждённо записанных бумажных комбинаций. Это нормально, если недостаточно матчей, одновременных котировок или результатов FT. Случайные экспрессы не подставляем.</div>:
      bank.tickets.slice(0,28).map(ticket=><article key={ticket.id} className="hoTicket">
       <header><div><span>{tier(ticket.band)} · {date(ticket.capturedAt)}</span>
        <h4>{ticket.legs.length} разных матча · {ticket.syntheticDecimalOdds.toFixed(2)}× <sup>МОДЕЛЬНО</sup></h4></div>
        <div><b>{result(ticket,ticket.settlement)}</b><small>Paper stake {usd(ticket.stake)}</small></div></header>
       <div className="hoLegs">{ticket.legs.map(leg=>{
        const proof=ticket.settlement?.provenOutcomes.find(x=>x.eventId===leg.eventId);
        return <div key={leg.eventId}><span>{leg.home} — {leg.away}</span>
         <strong>{leg.selectionLabel} · {leg.decimalOdds.toFixed(2)}×</strong>
         <small>{leg.bookmaker} · {proof?
          `FT ${proof.score.home}:${proof.score.away} · ${proof.won?"OK":"LOSS"}`:
          `Цена записана ${date(leg.quoteAt)}`}</small></div>;
       })}</div>
       <footer><span>МАТЕМАТИЧЕСКИЙ P&L</span><b>{!ticket.settlement?
        "Не рассчитан до всех FT":
        (ticket.settlement.result==="WIN"?"+":"")+
        usd(ticket.settlement.result==="WIN"?ticket.stake*(ticket.syntheticDecimalOdds-1):-ticket.stake)}</b>
       </footer>
      </article>)}
    </section>
    <aside className="hoSameEvent">
     <span>02 / SAME EVENT · CORRELATION DESK</span>
     <h3>Несколько экспрессов на один матч</h3>
     <p>Один матч может входить в разные <strong>межматчевые</strong> комбинации. Но делать из нескольких исходов одного матча «готовый экспресс» с произведением коэффициентов нельзя: победа и тотал зависимы, а победа и ничья вообще несовместимы.</p>
     {linked.length?linked.map(row=><div key={row.name} className="hoCluster">
      <b>{row.name}</b><span>Участвует в {row.slips.size} отдельных математических билетах</span>
     </div>):<div className="hoEmpty">Появится карта пересекающихся матчей, когда их будут использовать два или более бумажных билета.</div>}
     <div className="hoUnquoted"><strong>TRUE SAME-GAME PARLAY</strong>
      <p>Для «победа + тотал + обе забьют» потребуется настоящий коэффициент комбинированного рынка (или проверенная совместная модель вероятностей). Пока нет подтверждённой цены, такой комбинированный билет не влияет на $200 и не показывает выдуманный P&L.</p>
     </div>
    </aside>
   </div>
   <footer className="hoFooter"><b>VETO · FORWARD ONLY / RESEARCH NOT GAMBLING EXECUTION</b>
    <span>Отдельные виртуальные $200, без реального депозита. Математическое умножение коэффициентов разных матчей не означает, что один букмекер принял бы такой билет. Нет гарантированных результатов и ставки не размещаются.</span>
   </footer>
  </>}
 </section>;
}
