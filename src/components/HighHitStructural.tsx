"use client";
import { useMemo,useState } from "react";
import {
 structuralResearchCase,
 tennisGameWinProbability,
 volleyballSetWinProbability,
} from "@/lib/research/high-hit/structural";

const pct=(n:number)=>(100*n).toFixed(2).replace(".",",")+"%";
export function HighHitStructural(){
 const [pTennis,setPTennis]=useState(.5);
 const [pVolley,setPVolley]=useState(.5);
 const [tennisOdds,setTennisOdds]=useState(1.05);
 const [volleyOdds,setVolleyOdds]=useState(1.01);
 const tennis=useMemo(()=>{
  try{return structuralResearchCase({market:"tennis-game",firstScore:3,secondScore:0,assumedPointWinProbability:pTennis,assumedDecimalOdds:tennisOdds});}
  catch{return null;}
 },[pTennis,tennisOdds]);
 const volleyball=useMemo(()=>{
  try{return structuralResearchCase({market:"volleyball-set",firstScore:24,secondScore:18,assumedPointWinProbability:pVolley,assumedDecimalOdds:volleyOdds});}
  catch{return null;}
 },[pVolley,volleyOdds]);
 const stress=[.35,.4,.45,.5,.55,.6];
 return <section className="hitStructural">
  <div className="hitSectionTitle"><small>03 / SCORE–STATE MATH</small><h2>Точные правила. Условные вероятности.</h2><span>Теннис + волейбол · не фактическая статистика</span></div>
  <p className="hitMuted">В отличие от исторических частот выше, эти два калькулятора рассчитывают вероятность по официальной механике набора очков, <strong>предполагая независимые розыгрыши с постоянной неизвестной вероятностью p.</strong> Ни один из расчётов не является измеренной проходимостью на реальных матчах.</p>
  <div className="hitStructuralGrid">
   <article className="hitStructuralCard">
    <div className="hitStructuralTop"><small>TENNIS / STANDARD ADVANTAGE GAME</small><h3>40:0 · выигрыш текущего гейма</h3></div>
    <p>При счёте 40:0 игроку нужен один выигранный розыгрыш; но соперник может отыграться до 40:40, затем выиграть гейм. Математика учитывает бесконечные возвраты к «ровно».</p>
    <div className="hitStructuralControls">
     <label><span>Допущение: шанс выиграть каждый розыгрыш p</span><input type="number" min=".01" max=".99" step=".05" value={pTennis} onChange={e=>setPTennis(Number(e.target.value))}/></label>
     <label><span>Условный коэффициент, не live</span><input type="number" min="1.01" step=".01" value={tennisOdds} onChange={e=>setTennisOdds(Number(e.target.value))}/></label>
    </div>
    <div className="hitStructuralResult"><small>Шанс выигрыша по УСЛОВНОЙ модели</small><strong>{tennis?pct(tennis.modelConditionalWinProbability):"НЕВЕРНОЕ p"}</strong><span>{tennis?"Безубыточность условной цены: "+pct(tennis.breakEvenProbability):"Проверьте ввод"}</span></div>
    <p className="hitMuted">Теннис 40:0 при p=0,50 даёт строго 93,75%. При цене 1,05 порог безубыточности 95,24% — высокой проходимости недостаточно. Исключены no-ad, травмы и правила отказа.</p>
   </article>
   <article className="hitStructuralCard">
    <div className="hitStructuralTop"><small>VOLLEYBALL / FIRST FOUR SETS</small><h3>24:18 · победа в сете</h3></div>
    <p>По стандартным правилам победителю нужно 25 очков и минимум 2 очка преимущества. При 24:24 математическая модель учитывает игру до любого счёта с разницей два.</p>
    <div className="hitStructuralControls">
     <label><span>Допущение: шанс выиграть каждый розыгрыш p</span><input type="number" min=".01" max=".99" step=".05" value={pVolley} onChange={e=>setPVolley(Number(e.target.value))}/></label>
     <label><span>Условный коэффициент, не live</span><input type="number" min="1.01" step=".01" value={volleyOdds} onChange={e=>setVolleyOdds(Number(e.target.value))}/></label>
    </div>
    <div className="hitStructuralResult"><small>Шанс выигрыша по УСЛОВНОЙ модели</small><strong>{volleyball?pct(volleyball.modelConditionalWinProbability):"НЕВЕРНОЕ p"}</strong><span>{volleyball?"Безубыточность условной цены: "+pct(volleyball.breakEvenProbability):"Проверьте ввод"}</span></div>
    <p className="hitMuted">При p=0,50 вероятность 99,21875%. Если p упадёт до 0,35, риск поражения заметно увеличится. Без статистики подачи, ротации и силы команд это лишь сценарное вычисление.</p>
   </article>
  </div>
  <div className="hitStructuralStress">
   <h3>Что произойдёт, если допущение p неверно?</h3>
   <div className="hitStressGrid">
    {stress.map(p=><div key={p}><small>p = {p.toFixed(2)}</small><span>Теннис 40:0</span><b>{pct(tennisGameWinProbability(3,0,p))}</b><span>Волейбол 24:18</span><b>{pct(volleyballSetWinProbability(24,18,p))}</b></div>)}
   </div>
   <p className="hitMuted">Все шесть значений p выбраны как стресс-сценарии, а не получены из игры. Формулы требуют сверки с реальными событиями и отложенным тестом. До проверки сигнал всегда PASS_RESEARCH_ONLY.</p>
  </div>
 </section>;
}
