"use client";
import {useState} from "react";
import type {CrosscheckReport,CrosscheckAssessment} from "@/lib/research/result-corroboration";
import type {OpenLeague} from "@/lib/providers/openligadb-results";

type PublicLabel={id:number;league:OpenLeague;home:string;away:string;score:string};
const captions:Record<CrosscheckAssessment,string>={
 OBSERVATION_COMPATIBLE:"ХОД МАТЧА НЕ ПРОТИВОРЕЧИТ ИТОГУ",
 REVIEW_SCORE_CORRECTION:"ТРЕБУЕТ ПРОВЕРКИ ИСПРАВЛЕНИЯ СЧЁТА",
 MATCHED_NO_LIVE_SCORE:"НАЙДЕН МАТЧ, НЕТ СОХРАНЁННОГО СЧЁТА",
};
export function SourceCrosscheck({matches}:{matches:PublicLabel[]}){
 const [feed,setFeed]=useState<CrosscheckReport|null>(null);
 const [loading,setLoading]=useState(false);
 const [failed,setFailed]=useState(false);
 const labels=new Map(matches.map(m=>[m.league+":"+m.id,m]));
 async function run(){
  if(loading)return;
  setLoading(true);setFailed(false);setFeed(null);
  try{
   const result=await fetch("/api/intelligence/research/results/crosscheck",{cache:"no-store"});
   if(!result.ok)throw new Error("Unconfirmed source");
   const payload=await result.json() as CrosscheckReport;
   if(payload.source!=="VETO_OBSERVATIONS_VS_OPENLIGADB"||
    payload.crossSourceComparisonIsNotSettlement!==true)throw Error("Untrusted audit");
   setFeed(payload);
  }catch{setFailed(true);}
  finally{setLoading(false);}
 }
 return <section className="vrsCross" aria-labelledby="vrs-cross-title">
  <header className="vrsCrossIntro">
   <div><span className="vrsEyebrow">DATA INTEGRITY / SOURCE-TO-SOURCE CHECK</span>
    <h2 id="vrs-cross-title">Один матч. Два источника.<br/><em>Без ложного подтверждения.</em></h2>
    <p>Сравним общедоступные результаты OpenLigaDB с уже сохранёнными живыми наблюдениями VETO. Проверяем команды, турнир, время начала и возможные исправления счёта. Это не проверка прибыльности прогнозов.</p>
   </div>
   <button onClick={()=>void run()} type="button" disabled={loading} aria-busy={loading}>
    {loading?"Сопоставляем источники…":feed?"Повторить проверку ↻":"Сопоставить с историей VETO ↗"}
   </button>
  </header>
  <div className="vrsCrossSteps">
   <div><b>01</b><span>ОДИН ТУРНИР</span></div>
   <div><b>02</b><span>ТЕ ЖЕ КОМАНДЫ</span></div>
   <div><b>03</b><span>ТОЧНОЕ ВРЕМЯ</span></div>
   <div><b>04</b><span>ИСТОРИЯ СЧЁТА</span></div>
  </div>
  {failed&&<p role="status" className="vrsCrossEmpty">Сравнение сейчас недоступно. Часть источников не ответила — мы не подставляем предполагаемые совпадения.</p>}
  {loading&&<p role="status" className="vrsCrossEmpty">Сопоставляем сохранённые матчи за 7 дней. Платных обращений к спортивным API нет.</p>}
  {feed&&<div aria-live="polite">
   <div className="vrsCrossMetrics">
    <article><small>ВНЕШНИХ FT В ОКНЕ 7 ДНЕЙ</small><strong>{feed.openResultsShown}</strong></article>
    <article><small>СОПОСТАВЛЕННЫХ СОБЫТИЙ</small><strong>{feed.matchedFixtures}</strong></article>
    <article><small>С ИСТОРИЕЙ СЧЁТА VETO</small><strong>{feed.withLiveScore}</strong></article>
    <article><small>РАСХОЖДЕНИЙ НА ПРОВЕРКУ</small><strong>{feed.needsScoreReview}</strong></article>
   </div>
   {feed.rows.length>0?<div className="vrsCrossRows">
    {feed.rows.map(row=>{
     const match=labels.get(row.league+":"+row.publicMatchId);
     return <article key={row.league+":"+row.publicMatchId} className="vrsCrossRow">
      <div className="vrsCrossRowHeader"><span>{row.league==="bl1"?"BUNDESLIGA":"2. BUNDESLIGA"}</span>
       <b className={row.state==="REVIEW_SCORE_CORRECTION"?"needs-review":""}>{captions[row.state]}</b></div>
      <h3>{match?match.home+" — "+match.away:"Матч из проверенного внешнего источника"}</h3>
      <div className="vrsCrossScores">
       <div><small>СНИМОК VETO · LIVE</small><strong>{row.lastObservedScore?row.lastObservedScore.home+" : "+row.lastObservedScore.away:"— : —"}</strong>
        <span>{row.lastObservedAt?new Date(row.lastObservedAt).toLocaleString("ru-RU"):"Время наблюдения не найдено"}</span></div>
       <span className="vrsCrossArrow">→</span>
       <div><small>OPENLIGADB · 90′</small><strong>{match?.score??"— : —"}</strong><span>Внешний результат, не удостоверенный VETO</span></div>
      </div>
     </article>;
    })}
   </div>:<p className="vrsCrossEmpty">В выбранных лигах пока нет совпадений с сохранёнными наблюдениями VETO. Это отсутствие связи, а не ноль ошибок и не подтверждение модели.</p>}
   {feed.limitedByStorage&&<p className="vrsCrossAlert">История считана частично: достигнут лимит части временных окон. Числа нельзя считать полным охватом.</p>}
   {feed.ambiguousRejected>0&&<p className="vrsCrossAlert">Неоднозначных сопоставлений отклонено: {feed.ambiguousRejected}. Их результаты не присоединены автоматически.</p>}
   <p className="vrsCrossFoot">Только чтение · ODbL 1.0 · 0 записанных FT в исследовательскую базу · 0 проверенных денежных преимуществ · Срез {new Date(feed.generatedAt).toLocaleString("ru-RU")}</p>
  </div>}
 </section>;
}
