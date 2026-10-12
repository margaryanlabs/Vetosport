"use client";
import type {LiveQuotePreview} from "@/lib/live/types";
type Point={at:string,odds:number};
export function ObservedOddsMovement({quotes}:{quotes:LiveQuotePreview[]}){
 const series=new Map<string,{title:string;points:Point[]}>();
 for(const q of quotes){
  if(q.suspended||!Number.isFinite(q.decimalOdds)||q.decimalOdds<=1||!Number.isFinite(Date.parse(q.capturedAt)))continue;
  const key=[q.provider,q.bookmaker,q.marketKey,q.selectionKey].join("|");
  const row=series.get(key)??{title:q.selectionLabel+" · "+q.bookmaker,points:[]};
  row.points.push({at:q.capturedAt,odds:q.decimalOdds});series.set(key,row);
 }
 const best=[...series.values()].map(s=>({...s,points:[...new Map(s.points.map(p=>[p.at,p])).values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))})).sort((a,b)=>b.points.length-a.points.length)[0];
 const points=best?.points.slice(-20)??[];
 const low=Math.min(...points.map(p=>p.odds),0),high=Math.max(...points.map(p=>p.odds),1);
 const min=low>1?Math.max(1,low-(high-low)*.14):low;
 const max=high+(high-min||1)*.1;
 const firstT=Date.parse(points[0]?.at??""),lastT=Date.parse(points.at(-1)?.at??"");
 const x=(p:Point,i:number)=>lastT>firstT?48+(Date.parse(p.at)-firstT)/(lastT-firstT)*534:48+i*534/Math.max(1,points.length-1);
 const y=(p:Point)=>195-(p.odds-min)/(max-min)*154;
 const path=points.map((p,i)=>(i?"L":"M")+x(p,i).toFixed(1)+" "+y(p).toFixed(1)).join(" ");
 return <section className="observedMovement" aria-label="История реально наблюдавшихся букмекерских котировок">
  <header><div><span>ODDS / TIME SERIES</span><strong>Как двигался коэффициент</strong><small>{best?.title??"Ожидаем реальные исторические котировки"}</small></div><b>{points.length} СНИМКОВ</b></header>
  {points.length>=2?<div className="observedMovementChart">
    <svg viewBox="0 0 630 240" preserveAspectRatio="none" role="img" aria-label="Линия реальных сохранённых коэффициентов во времени, не прогноз">
      {[0,1,2,3,4].map(n=><line key={n} x1="48" x2="583" y1={42+n*38} y2={42+n*38} stroke="#a6c5b1" strokeOpacity=".16" strokeDasharray="5 7"/>)}
      <path d={path} fill="none" stroke="#b1e2be" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {points.map((p,i)=><circle key={p.at} cx={x(p,i)} cy={y(p)} r="3.3" fill="#e6f6e9" stroke="#17402b" strokeWidth="1.2"/>)}
      <text x="12" y="44" fill="#aecab4" fontSize="11">{max.toFixed(2)}</text>
      <text x="12" y="197" fill="#aecab4" fontSize="11">{min.toFixed(2)}</text>
      <text x="48" y="228" fill="#aecab4" fontSize="11">{new Date(points[0].at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</text>
      <text x="583" y="228" textAnchor="end" fill="#aecab4" fontSize="11">{new Date(points.at(-1)!.at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</text>
    </svg>
    <p>Начальная цена <strong>{points[0].odds.toFixed(2)}</strong> → последняя <strong>{points.at(-1)!.odds.toFixed(2)}</strong>. Это только одна конкретная линия из сохранённых снимков; не прогноз и не доказательство преимущества.</p>
  </div>:<div className="observedMovementEmpty"><span aria-hidden="true">⌁</span><div><strong>Ждём второй подтверждённый снимок одной и той же линии</strong><p>VETO не рисует красивый, но вымышленный график. Когда появятся как минимум две реальные цены с разными отметками времени, покажем изменение.</p></div></div>}
 </section>;
}
