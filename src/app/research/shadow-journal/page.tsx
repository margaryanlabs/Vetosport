"use client";
import { useEffect, useMemo, useState } from "react";
import { evaluateLateTail, type LateTailInput } from "@/lib/research/late-tail/engine";
import "../late-tail/late-tail.css";

type Outcome = "PENDING" | "WIN_REPORTED" | "LOSS_REPORTED";
type Entry = {
 id:string; observedAt:string; match:string; source:string;
 input:LateTailInput; modeledChance:number; outcome:Outcome;
};
const KEY="veto-zero-s-paper-journal-v1";
const defaults:LateTailInput={
 elapsedMinutes:80,scoreHome:1,scoreAway:1,underLine:3.5,
 decimalOdds:1.05,hypotheticalStake:200,baselineGoalRatePerMinute:0.025,
};
const fields: Array<{key:keyof LateTailInput;label:string;step:number}>=[
 {key:"elapsedMinutes",label:"Минута",step:1},
 {key:"scoreHome",label:"Голы хозяев",step:1},
 {key:"scoreAway",label:"Голы гостей",step:1},
 {key:"underLine",label:"Тотал меньше",step:.5},
 {key:"decimalOdds",label:"Коэффициент",step:.01},
 {key:"hypotheticalStake",label:"Условная сумма ($)",step:1},
 {key:"baselineGoalRatePerMinute",label:"Условных голов в минуту",step:.001},
];
const paperPnl=(r:Entry)=>r.outcome==="WIN_REPORTED"?
 r.input.hypotheticalStake*(r.input.decimalOdds-1):
 r.outcome==="LOSS_REPORTED"?-r.input.hypotheticalStake:0;
const escapeCsv=(s:unknown)=>'"'+String(s??"").replace(/"/g,'""')+'"';
function exportEntries(rows:Entry[]){
 const cols=["id","created_at","match","source","minute","score_home","score_away","under_line","odds","paper_stake","model_probability","outcome_reported","paper_pnl"];
 const data=[cols.join(","),...rows.map(r=>[
  r.id,r.observedAt,r.match,r.source,r.input.elapsedMinutes,r.input.scoreHome,
  r.input.scoreAway,r.input.underLine,r.input.decimalOdds,r.input.hypotheticalStake,
  r.modeledChance,r.outcome,paperPnl(r)
 ].map(escapeCsv).join(","))].join("\r\n");
 const blob=new Blob(["\uFEFF"+data],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");
 link.href=url;link.download="veto-zero-s-paper-journal.csv";link.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),3000);
}
export default function ShadowJournal(){
 const [ready,setReady]=useState(false);
 const [entries,setEntries]=useState<Entry[]>([]);
 const [match,setMatch]=useState("");
 const [source,setSource]=useState("");
 const [input,setInput]=useState<LateTailInput>(defaults);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  try{
   const raw=localStorage.getItem(KEY);
   if(raw){
    const decoded:unknown=JSON.parse(raw);
    if(Array.isArray(decoded))setEntries(decoded.filter(r=>r&&typeof r.id==="string"&&typeof r.match==="string"&&r.input&&typeof r.input.decimalOdds==="number").slice(0,5000));
   }
  }catch{setMessage("Предыдущий локальный журнал не прочитан. Возможно, данные браузера повреждены.");}
  setReady(true);
 },[]);
 useEffect(()=>{
  if(!ready)return;
  try{localStorage.setItem(KEY,JSON.stringify(entries));}
  catch{setMessage("Хранилище заполнено, экспортируйте данные в CSV.");}
 },[entries,ready]);
 const scenario=useMemo(()=>{
  try{return{value:evaluateLateTail(input),error:""};}
  catch(e){return{value:null,error:e instanceof Error?e.message:"Проверьте поля"};}
 },[input]);
 const settled=entries.filter(e=>e.outcome!=="PENDING");
 const pnl=settled.reduce((sum,row)=>sum+paperPnl(row),0);
 function add(){
  if(!ready||!scenario.value)return;
  if(!match.trim()||!source.trim()){
    setMessage("Нужно заполнить матч и источник коэффициента (можно «ручной ввод»).");return;
  }
  const item:Entry={
   id:crypto.randomUUID(),observedAt:new Date().toISOString(),
   match:match.trim().slice(0,160),source:source.trim().slice(0,120),
   input:{...input},modeledChance:scenario.value.probabilityUnder,outcome:"PENDING",
  };
  setEntries(old=>[item,...old]);setMatch("");setMessage("PAPER-наблюдение записано, реальная ставка не создавалась.");
 }
 function settle(id:string,outcome:Outcome){
  setEntries(old=>old.map(row=>row.id===id?{...row,outcome}:row));
 }
 return <main className="zeroS">
  <header className="zeroS-nav">
   <a className="zeroS-logo" href="/">VETO <span>/ SPORT</span></a>
   <span>ZERO-S / LAB 003 · PERSONAL PAPER JOURNAL</span>
   <a href="/research/late-tail">← Late Tail</a>
  </header>
  <section className="zeroS-intro">
   <div className="zeroS-label">PAPER JOURNAL <b>NOT VERIFIED · NO REAL BETS</b></div>
   <h1>Записывай всё.<br/><em>Даже ошибки.</em></h1>
   <p>Локальный журнал виртуальных наблюдений. Никакого автоматического букмекерского исполнения, никаких гарантий. Результаты вводятся вручную и не могут служить независимым доказательством доходности.</p>
  </section>
  <div className="zeroS-grid">
   <section className="zeroS-card">
    <div className="zeroS-heading"><small>01 / INPUT</small><h2>Новое виртуальное наблюдение</h2></div>
    <div className="zeroS-fields">
     <label style={{gridColumn:"1/-1"}}><span>Матч, дата, лига</span><input type="text" maxLength={160} value={match} onChange={e=>setMatch(e.target.value)} placeholder="Команда A — Команда B"/></label>
     <label style={{gridColumn:"1/-1"}}><span>Источник коэффициента</span><input type="text" maxLength={120} value={source} onChange={e=>setSource(e.target.value)} placeholder="Введено вручную"/></label>
     {fields.map(f=><label key={f.key}><span>{f.label}</span><input type="number" step={f.step} value={input[f.key]??""} onChange={e=>setInput(o=>({...o,[f.key]:Number(e.target.value)}))}/></label>)}
    </div>
    <p className="zeroS-warning">Все вероятности в этом журнале основаны на неоткалиброванных демонстрационных предположениях. PASS_RESEARCH_ONLY.</p>
    <p className="zeroS-muted">{scenario.value?"Условная вероятность: "+(scenario.value.probabilityUnder*100).toFixed(2)+"%":scenario.error}</p>
    <button style={{background:"#bed3df",color:"#0c151a",padding:13,border:0,cursor:"pointer"}} disabled={!scenario.value} type="button" onClick={add}>Добавить в виртуальный журнал</button>
    {message&&<p role="status" className="zeroS-muted">{message}</p>}
   </section>
   <section className="zeroS-card">
    <div className="zeroS-heading"><small>02 / OBSERVATIONS</small><h2>История без прикрас</h2></div>
    <div className="zeroS-stats">
     <div><span>Всего</span><b>{entries.length}</b></div>
     <div><span>С ручным результатом</span><b>{settled.length}</b></div>
     <div><span>Условный paper P&amp;L</span><b>{pnl.toFixed(2)}</b></div>
     <div><span>Независимо проверено</span><b>0</b></div>
    </div>
    <button type="button" disabled={!entries.length} onClick={()=>exportEntries(entries)} style={{margin:"20px 0",padding:12,background:"#1b303d",color:"#c7dce8",border:"1px solid #334e60",cursor:"pointer"}}>Экспортировать CSV</button>
    {!entries.length?<p className="zeroS-muted">История пока пуста. Записывай ВСЕ случаи до исхода матча, включая ситуации отказа.</p>:
     <div style={{maxHeight:690,overflowY:"auto"}}>
      {entries.map(e=><article key={e.id} style={{borderTop:"1px solid #293945",padding:"16px 0"}}>
       <strong style={{fontSize:13}}>{e.match}</strong>
       <p className="zeroS-muted">{e.observedAt} · {e.input.elapsedMinutes}′ · {e.input.scoreHome}:{e.input.scoreAway} · Under {e.input.underLine} · {e.input.decimalOdds.toFixed(2)}</p>
       <p className="zeroS-muted">{e.source} · условная вероятность {(e.modeledChance*100).toFixed(2)}%</p>
       <label style={{display:"flex",flexDirection:"column",gap:8,fontSize:11,color:"#9cb5c3"}}>
        Результат, введённый пользователем
        <select value={e.outcome} onChange={x=>settle(e.id,x.target.value as Outcome)} style={{padding:11,background:"#101a23",color:"#e4f0f6",border:"1px solid #304452"}}>
         <option value="PENDING">Ещё неизвестен</option>
         <option value="WIN_REPORTED">Under выиграл</option>
         <option value="LOSS_REPORTED">Under проиграл</option>
        </select>
       </label>
      </article>)}
     </div>}
    <p className="zeroS-muted">Данные сохраняются в localStorage этого устройства, могут быть удалены или изменены. Экспортируй перед переездом или сменой браузера. Это не защищённый реестр.</p>
   </section>
  </div>
  <footer className="zeroS-foot">ZERO–S · PAPER ONLY · NEVER AUTO-WAGER</footer>
 </main>;
}
