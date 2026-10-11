import Link from "next/link";
import {
  DATASET_META, HISTORICAL_BY_MINUTE, describeCohort,
  evaluateCascadeHypothesis,
} from "@/lib/research/goal-cascade/evidence";
import "./cascade.css";

const percent = (n: number) => (n*100).toFixed(2).replace(".", ",") + "%";
export const metadata = {
  title: "Goal Cascade / Project ZERO-S — VETO Sport",
  description: "Историческая научная проверка гипотезы о каскадных голах. Исследование, не прогноз.",
};
export default function GoalCascadeEvidencePage() {
 const rows = HISTORICAL_BY_MINUTE.map(describeCohort);
 const test = evaluateCascadeHypothesis();
 return <main className="vetoCascade">
   <header className="cascadeNav">
     <Link href="/" className="cascadeLogo">VETO <span>/ SPORT</span></Link>
     <span>RESEARCH / PROJECT ZERO–S</span>
     <Link href="/research/late-tail">← Late Tail Lab</Link>
   </header>
   <section className="cascadeHero">
     <small>02 / GOAL CASCADE INTELLIGENCE · HISTORICAL EVIDENCE</small>
     <h1>Сильная гипотеза.<br/><em>Неприятный результат.</em></h1>
     <p>Мы проверили идею, что гол перед 80-й минутой вызывает опасный каскад новых голов. Проверка старой исторической выборки пока не подтверждает эту интуицию. Именно так должна работать честная исследовательская лаборатория.</p>
     <strong className="cascadeResearch">RESEARCH ONLY · NOT A LIVE PREDICTION</strong>
   </section>
   <section className="cascadeGrid">
     <article className="cascadeCard">
       <small>DATASET / 2012–2015</small><h2>Проверенная выборка</h2>
       <div className="cascadeNumber">{DATASET_META.validFixtures.toLocaleString("ru-RU")}</div>
       <p>Матчей прошли проверку согласованности голов с итоговыми счетами; ещё {DATASET_META.rejectedFixtures} исключены.</p>
       <p className="cascadeMuted">Исходные данные: <a href={DATASET_META.source} target="_blank" rel="noreferrer">Football Goal Time Analysis</a>. Данные не содержат точного времени дополнительного периода или подтверждённых коэффициентов.</p>
     </article>
     <article className="cascadeCard">
       <small>TEST / SCORE 1:1 AT MINUTE 80</small><h2>Сравнение двух состояний</h2>
       <div className="cascadeMetrics">
         <div><span>Последний гол 76–80</span><strong>{percent(test.recent.observedTwoPlus)}</strong><small>6 / 131</small></div>
         <div><span>Последний гол ≤75</span><strong>{percent(test.older.observedTwoPlus)}</strong><small>61 / 900</small></div>
       </div>
       <p>Разница исторических частот: <b>{(test.empiricalDifference*100).toFixed(2)} процентного пункта</b>. Двусторонний точный тест Фишера: p ≈ {test.fisherExactTwoSidedP.toFixed(3)}.</p>
       <p className="cascadeMuted">Это не доказательство отсутствия эффекта: данных мало, контекст матча не контролируется, а гипотеза пока исследовательская.</p>
     </article>
   </section>
   <section className="cascadeCard cascadeTimeline">
     <small>FREQUENCY / 1:1, LATE TWO+ GOALS</small><h2>Риск двух последующих голов по минутам</h2>
     {rows.map((row,i) => <div className="cascadeRow" key={i}>
       <span>{row.label}</span>
       <div className="cascadeTrack"><i style={{width:(row.observedTwoPlus*100/12)+"%"}} /></div>
       <b>{percent(row.observedTwoPlus)}</b>
       <small>n={row.matches}</small>
     </div>)}
     <p className="cascadeMuted">Шкала диаграммы: 0–12%. Каждая строка — условная историческая частота, не персонализированный прогноз. Матчи между строками пересекаются.</p>
   </section>
   <section className="cascadeCard cascadeVerdict">
     <div><small>VERDICT / HYPOTHESIS UNDER TEST</small><h2>Не подтверждено</h2></div>
     <p>Гипотеза «недавний гол автоматически повышает шанс ещё двух голов» <strong>не получила поддержки</strong> в этой исторической выборке. Результат нельзя продавать как найденное преимущество над рынком. Современные правила учёта компенсированного времени существенно отличаются.</p>
   </section>
   <footer className="cascadeFooter">VETO SPORT · MARGARYAN LABS · EVIDENCE FIRST · NO AUTOMATED WAGERING</footer>
 </main>;
}
