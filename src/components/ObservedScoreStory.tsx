"use client";
import type {ObservedScorePoint} from "@/lib/live/score-observations";

const fmt=(s:string)=>new Date(s).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
const clockAge=(s:string,now:number)=>{
 const age=(now-Date.parse(s))/60000;
 return age>=0&&Number.isFinite(age)?age<1?"только что":`${Math.floor(age)} мин назад`:"нет времени";
};
export function ObservedScoreStory({points,home,away}:{
 points:ObservedScorePoint[];home:string;away:string;
}){
 const now=Date.now();
 const last=points.at(-1);
 const max=Math.max(2,...points.map(p=>Math.max(p.home,p.away)));
 const left=34,right=588,top=22,bottom=183;
 const t0=Date.parse(points[0]?.capturedAt??"");
 const t1=Date.parse(last?.capturedAt??"");
 const x=(point:ObservedScorePoint,index:number)=>t1>t0?left+(Date.parse(point.capturedAt)-t0)/(t1-t0)*(right-left):left+(index/Math.max(1,points.length-1))*(right-left);
 const y=(score:number)=>bottom-score/max*(bottom-top);
 const pointsToLine=(which:"home"|"away")=>points.map((p,i)=>`${x(p,i).toFixed(1)},${y(p[which]).toFixed(1)}`).join(" ");
 return <section className="observedScoreStory" id="veto-score-story" aria-label="История реально сохранённых снимков счёта">
   <header className="observedStudioSectionHead">
     <div><span>01 / SCORE OBSERVATORY</span><h3>Как менялся счёт</h3><p>Линии построены по сохранённым снимкам, а не по предполагаемому времени голов.</p></div>
     <span className="observedStudioCount">{points.length} СНИМКОВ</span>
   </header>
   {points.length>=2?<>
    <div className="observedChartLegend"><span className="home"><i/>{home}</span><span className="away"><i/>{away}</span></div>
    <div className="observedChartFrame">
     <svg viewBox="0 0 620 215" role="img" aria-label="График накопленного счёта для каждой команды по времени сохранённых наблюдений" preserveAspectRatio="none">
       {[0,1,2,3,4].map(i=><line key={i} x1={left} y1={top+i*(bottom-top)/4} x2={right} y2={top+i*(bottom-top)/4} stroke="#cde2d6" strokeOpacity=".14" strokeDasharray="3 7"/>)}
       <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#d5e9dd" strokeOpacity=".36"/>
       <polyline points={pointsToLine("home")} fill="none" stroke="#f35e62" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
       <polyline points={pointsToLine("away")} fill="none" stroke="#9cdabc" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
       {points.map((p,i)=><g key={p.capturedAt}><circle cx={x(p,i)} cy={y(p.home)} r="3.7" fill="#f35e62" stroke="#111a17" strokeWidth="1.4"/><circle cx={x(p,i)} cy={y(p.away)} r="3.7" fill="#9cdabc" stroke="#111a17" strokeWidth="1.4"/></g>)}
       <text x={left} y="208" fill="#aabdb2" fontSize="11">{fmt(points[0].capturedAt)}</text>
       <text x={right} y="208" fill="#aabdb2" fontSize="11" textAnchor="end">{fmt(last!.capturedAt)}</text>
       <text x="15" y={top+4} fill="#9fbaab" fontSize="11" textAnchor="middle">{max}</text>
       <text x="15" y={bottom+4} fill="#9fbaab" fontSize="11" textAnchor="middle">0</text>
     </svg>
    </div>
    <div className="observedChartFacts">
      <div><span>ПЕРВЫЙ СНИМОК</span><strong>{fmt(points[0].capturedAt)}</strong></div>
      <div><span>ПОСЛЕДНИЙ СНИМОК</span><strong>{fmt(last!.capturedAt)}</strong></div>
      <div><span>СОХРАНЁННЫЙ СЧЁТ</span><strong>{last!.home} : {last!.away}</strong></div>
      <div><span>АКТУАЛЬНОСТЬ</span><strong>{clockAge(last!.capturedAt,now)}</strong></div>
    </div>
   </>:<div className="observedChartEmpty">
      <span className="observedChartEmptyGlyph" aria-hidden="true">◷</span>
      <div><strong>{points.length===1?"Первый реальный снимок получен":"История наблюдений пока пустая"}</strong>
      <p>{points.length===1?`Счёт ${last!.home} : ${last!.away} сохранён в ${fmt(last!.capturedAt)}. График появится после следующего снимка с отдельным временем.`:"Как только провайдер передаст подтверждённые состояния матча, здесь появится график без выдуманных точек."}</p></div>
   </div>}
   <footer>Время на графике — момент получения данных VETO. Точное время каждого гола без событий провайдера неизвестно.</footer>
 </section>;
}
