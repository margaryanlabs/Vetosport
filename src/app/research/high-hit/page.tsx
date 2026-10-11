"use client";
import { useMemo,useState } from "react";
import { HIGH_HIT_CATALOG, type HighHitSport } from "@/lib/research/high-hit/catalog";
import { analyzeHighHitEvidence } from "@/lib/research/high-hit/engine";
import { HighHitStructural } from "@/components/HighHitStructural";
import "./high-hit.css";

type Filter="all"|HighHitSport;
const sports:Array<{id:Filter,label:string}>=[
 {id:"all",label:"ВСЕ"},{id:"football",label:"ФУТБОЛ"},
 {id:"baseball",label:"БЕЙСБОЛ"},{id:"basketball",label:"БАСКЕТБОЛ"},
 {id:"tennis",label:"ТЕННИС"},{id:"hockey",label:"ХОККЕЙ"},
 {id:"volleyball",label:"ВОЛЕЙБОЛ"},
];
const pct=(v:number)=>(100*v).toFixed(2).replace(".",",")+"%";
const money=(v:number)=>(v>0?"+":v<0?"−":"")+"$"+Math.abs(v).toFixed(2);
const hitLabel=(v:string)=>v==="HISTORICAL_MATCH_LEVEL"?"ИСТОРИЧЕСКАЯ ЧАСТОТА":v==="OFFICIAL_AGGREGATE"?"ОФИЦИАЛЬНЫЙ ПРИМЕР":"ТОЛЬКО ГИПОТЕЗА";
export default function HighHitScout(){
 const [filter,setFilter]=useState<Filter>("all");
 const [selected,setSelected]=useState(HIGH_HIT_CATALOG[1].id);
 const [odds,setOdds]=useState(1.05);
 const [notional,setNotional]=useState(200);
 const [counts,setCounts]=useState({wins:1023,losses:8,voids:0});
 const [manual,setManual]=useState(false);
 const [copyStatus,setCopyStatus]=useState("");
 const item=HIGH_HIT_CATALOG.find(x=>x.id===selected)??HIGH_HIT_CATALOG[1];
 const results=useMemo(()=>{
  try{return{value:analyzeHighHitEvidence({...counts,decimalOdds:odds,hypotheticalStake:notional}),error:""};}
  catch(error){return{value:null,error:error instanceof Error?error.message:"Некорректный ввод"};}
 },[counts,odds,notional]);
 const result=results.value;
 const choose=(id:string)=>{
  const v=HIGH_HIT_CATALOG.find(x=>x.id===id);
  if(!v)return;
  setSelected(id);setCounts({wins:v.observed?.wins??0,losses:v.observed?.losses??0,voids:0});
  setManual(false);setCopyStatus("");
 };
 const isHistoricalSource=!manual&&!!item.observed;
 const caseText=[
  "VETO SPORT / ZERO-S CROSS-SPORT RESEARCH",
  "Вид спорта: "+item.sportLabel,
  "Исследуемый рынок: "+item.selection,
  "Сценарий: "+item.state,
  "Условный коэффициент (НЕ ПРОВЕРЕН): "+odds,
  "Условная сумма (PAPER ONLY): $"+notional,
  "Риск: "+item.risk,
  "Условия расчёта: "+item.marketSemantics,
  "Качество данных: "+(manual?"Ручной ввод, неподтверждён":hitLabel(item.evidence)),
  "Исторические исходы: "+(item.observed&&!manual?item.observed.wins+"/"+(item.observed.wins+item.observed.losses)+" ("+item.observed.period+")":"не подтверждены"),
  "Нижняя граница Wilson: "+(result?pct(result.wilson95.low):"нет"),
  "Входящий запрос: проверить источники, официальные правила, наличие live-рынка, актуальную цену, независимую калибровку и условия возврата. Никаких советов о гарантированной ставке.",
  "Режим: PASS_RESEARCH_ONLY. Никакого реального исполнения или доказанной прибыльности."
 ].join("\n");
 const copy=async()=>{
  try{await navigator.clipboard.writeText(caseText);setCopyStatus("Кейс скопирован — вставь его в наш чат.");}
  catch{setCopyStatus("Автокопирование недоступно. Выдели текст вручную.");}
 };
 return <main className="hitScout">
  <header className="hitTop">
    <a href="/" className="hitBrand">VETO <span>/ SPORT</span></a>
    <div>PROJECT ZERO–S <span>/ CROSS–SPORT RESEARCH</span></div>
    <a href="/research/late-tail">← LABS</a>
  </header>
  <section className="hitHero">
   <div className="hitOverline">LAB 004 · LOW-FREQUENCY FAILURE RESEARCH <b>НЕ ПРИЗЫВ К СТАВКАМ</b></div>
   <h1>90% — это<br/><em>ещё не безопасность.</em></h1>
   <p>Исследование рынков с высокой исторической частотой исхода: футбол, бейсбол, баскетбол, теннис, хоккей и волейбол. <strong>Наша цель — отделить высокую проходимость от реальной ценности коэффициента.</strong> Непроверенные идеи остаются гипотезами.</p>
  </section>
  <div className="hitSectionTitle"><small>01 / SPORT RADAR</small><h2>Каталог исследовательских гипотез</h2><span>{HIGH_HIT_CATALOG.length} сценариев · 6 видов спорта</span></div>
  <div className="hitFilters">{sports.map(s=><button type="button" aria-pressed={filter===s.id} className={filter===s.id?"active":""} key={s.id} onClick={()=>setFilter(s.id)}>{s.label}</button>)}</div>
  <section className="hitCards" aria-label="Каталог кандидатов">
  {HIGH_HIT_CATALOG.filter(x=>filter==="all"||x.sport===filter).map(x=>{
   const p=x.observed?x.observed.wins/(x.observed.wins+x.observed.losses):x.referenceRate??null;
   return <button type="button" key={x.id} onClick={()=>choose(x.id)} aria-pressed={selected===x.id} className={"hitCandidate "+(selected===x.id?"selected":"")}>
    <div className="hitCardLine"><span>{x.sportLabel}</span><span className={x.evidence==="HYPOTHESIS_NO_RATE"?"hitTag unknown":"hitTag"}>{hitLabel(x.evidence)}</span></div>
    <strong>{x.selection}</strong>
    <p>{x.state}</p>
    <div className="hitCardFooter"><div><small>ПРОШЛЫЕ ДАННЫЕ</small><b>{p===null?"НЕТ ДАННЫХ":pct(p)}</b></div><span>РАССМОТРЕТЬ ↗</span></div>
   </button>;
  })}</section>
  <div className="hitSectionTitle" style={{marginTop:34}}><small>02 / EVIDENCE GATE</small><h2>Проверка выбранного рынка</h2><span>Порог: от 90% · без гарантии</span></div>
  <div className="hitWorkspace">
   <section className="hitPanel">
    <div className="hitSelected"><small>RESEARCH SUBJECT</small><h3>{item.sportLabel} / {item.selection}</h3><p>{item.state}</p></div>
    <div className="hitWarning"><b>ОСНОВНОЙ РИСК</b><p>{item.risk}</p></div>
    <p className="hitMuted"><b>Расчёт рынка:</b> {item.marketSemantics}</p>
    <p className="hitMuted"><b>Источник:</b> {item.observed?item.observed.source:(item.source??"Данные пока не получены")}. {item.observed?item.observed.period:""}.</p>
    <div className="hitInputs">
     <label><span>Условный коэффициент (не live)</span><input type="number" min="1.01" max="1000" step=".01" value={odds} onChange={e=>setOdds(Number(e.target.value))}/></label>
     <label><span>Условная сумма ($)</span><input type="number" min="0" step="10" value={notional} onChange={e=>setNotional(Number(e.target.value))}/></label>
    </div>
    <div className="hitInputs">
     <label><span>Выигрышей в выборке</span><input type="number" min="0" step="1" value={counts.wins} onChange={e=>{setCounts(o=>({...o,wins:Number(e.target.value)}));setManual(true);}}/></label>
     <label><span>Проигрышей</span><input type="number" min="0" step="1" value={counts.losses} onChange={e=>{setCounts(o=>({...o,losses:Number(e.target.value)}));setManual(true);}}/></label>
     <label><span>Возвратов/void</span><input type="number" min="0" step="1" value={counts.voids} onChange={e=>{setCounts(o=>({...o,voids:Number(e.target.value)}));setManual(true);}}/></label>
    </div>
    {manual&&<p className="hitManual">Результаты изменены вручную: исходная атрибуция исторического источника отключена.</p>}
    {!item.observed&& !manual&&<p className="hitManual">Для этого спорта пока нет подтверждённого размера выборки. Нельзя утверждать, что вероятность выше 90%.</p>}
   </section>
   <section className="hitPanel">
    <div className="hitVerdict"><span>MODEL DECISION</span><strong>PASS / RESEARCH ONLY</strong><small>Не проверено на актуальных доступных котировках</small></div>
    {result?<>
     <div className="hitPrimary"><span>Историческая/введённая частота выигрыша</span><strong>{pct(result.observedSuccess)}</strong><small>{result.n} исходов · {result.voids} возвратов · {manual?"НЕПОДТВЕРЖДЁННЫЙ ВВОД":"ИСТОРИЧЕСКИЕ ДАННЫЕ"}</small></div>
     <div className="hitBars"><div><span>Нижняя граница Wilson 95%</span><b>{pct(result.wilson95.low)}</b></div><div className="hitTrack"><i style={{width:(result.wilson95.low*100).toFixed(2)+"%"}}/></div><div><span>Порог безубыточности при условной цене</span><b>{pct(result.breakEvenProbability)}</b></div><div className="hitTrack"><i className="threshold" style={{width:(100*Math.min(1,result.breakEvenProbability)).toFixed(2)+"%"}}/></div></div>
     <div className="hitNumbers">
      <div><span>При выигрыше</span><strong>{money(result.hypotheticalWinProfit)}</strong></div>
      <div><span>При проигрыше</span><strong>{money(result.hypotheticalSingleLoss)}</strong></div>
      <div><span>Условный EV на наблюдение</span><strong>{money(result.hypotheticalEVIncludingVoids)}</strong></div>
      <div><span>EV по нижней границе</span><strong>{money(result.hypotheticalLowerBoundEVIncludingVoids)}</strong></div>
      <div><span>Выигрышей перекрывают один проигрыш</span><strong>{result.winsToOffsetOneLoss.toFixed(1)}</strong></div>
      <div><span>Оценка 90%+ с поправкой на выборку</span><strong>{result.atLeast90Lower95?"ДА, ПО СТАРЫМ ДАННЫМ":"НЕ ПОДТВЕРЖДЕНО"}</strong></div>
     </div>
     <p className="hitMuted">Нижняя граница 95% характеризует лишь статистическую неопределённость данной выборки. Она не учитывает смену эпохи, недоступные коэффициенты, выборочный отбор или другие риски.</p>
    </>:<p className="hitError">{results.error}</p>}
   </section>
  </div>
  <HighHitStructural />
  <section className="hitChat">
   <div><small>04 / CHATGPT BRIDGE</small><h2>Исследуем через этот чат</h2><p>Система собирает условия рынка и предупреждения в копируемый кейс. Без OpenAI API обмен ручной, автономного мониторинга нет.</p></div>
   <div><textarea readOnly value={caseText} aria-label="Промпт для ChatGPT"/><button type="button" onClick={copy}>Скопировать исследовательский кейс ↗</button>{copyStatus&&<p role="status">{copyStatus}</p>}</div>
  </section>
  <footer className="hitFooter">ZERO–S · NO VERIFIED BETTING EDGE · NO AUTO-WAGER · ALL QUOTES ARE ILLUSTRATIVE</footer>
 </main>;
}
