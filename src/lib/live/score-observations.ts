import type {PersistedEventStateRecord} from "@/lib/persistence/contracts";

export interface ObservedScorePoint {
  capturedAt:string;
  home:number;
  away:number;
  sourceProvider:string;
}
/** Observed score samples. These timestamps are provider sample capture times,
 * NOT the actual moment of a goal. Never fabricate scoring events between samples. */
export function extractObservedScoreHistory(rows:PersistedEventStateRecord[]):ObservedScorePoint[]{
 const points:ObservedScorePoint[]=[];
 for(const row of rows){
  const s=row.state;
  const score=s?.score;
  if(!score||typeof score!=="object"||Array.isArray(score))continue;
  const pair=score as Record<string,unknown>;
  const t=Date.parse(row.capturedAt);
  if(!Number.isFinite(t)||t>Date.now()+60_000)continue;
  if(typeof pair.home!=="number"||!Number.isInteger(pair.home)||pair.home<0||pair.home>99)continue;
  if(typeof pair.away!=="number"||!Number.isInteger(pair.away)||pair.away<0||pair.away>99)continue;
  points.push({capturedAt:new Date(t).toISOString(),home:pair.home,away:pair.away,sourceProvider:row.sourceProvider});
 }
 points.sort((a,b)=>Date.parse(a.capturedAt)-Date.parse(b.capturedAt));
 // Keep one observation per timestamp; equal timestamps do not create fictitious changes.
 const unique=new Map<string,ObservedScorePoint>();
 for(const point of points)unique.set(point.capturedAt,point);
 return [...unique.values()].slice(-24);
}
export function observedScoreHistorySelfcheck(){
 const now=new Date(Date.now()-120000);
 const base={eventId:"test",sourceProvider:"api-football",capturedAt:now.toISOString(),state:{score:{home:1,away:0}}};
 const a=(seconds:number,home:number,away:number):PersistedEventStateRecord=>({
  ...base,capturedAt:new Date(now.getTime()+seconds*1000).toISOString(),state:{score:{home,away}},
 });
 const r=extractObservedScoreHistory([a(30,1,1),a(0,1,0),a(30,1,1)]);
 const checks=[
  {name:"Stable chronological points",pass:r.length===2&&r[0].home===1&&r[0].away===0&&r[1].away===1},
  {name:"Duplicate timestamp does not fabricate a goal",pass:r.length===2},
  {name:"Missing upstream score excluded",pass:extractObservedScoreHistory([{...base,state:{}}]).length===0},
  {name:"Invalid negative score excluded",pass:extractObservedScoreHistory([a(0,-1,0)]).length===0},
  {name:"Invalid fractional score excluded",pass:extractObservedScoreHistory([a(0,1.5,0)]).length===0},
  {name:"Score state not inferred from clock",pass:extractObservedScoreHistory([{...base,state:{clock:"90′"}}]).length===0},
  {name:"Source captured, not goal event time",pass:r[0].sourceProvider==="api-football"},
  {name:"Limited to 24 real observations",pass:extractObservedScoreHistory(Array.from({length:31},(_,i)=>a(i,1,0))).length===24},
 ];
 return{passed:checks.every(c=>c.pass),checks};
}
