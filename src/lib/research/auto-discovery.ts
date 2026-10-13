import {certifiedRegulationFinal} from "@/lib/research/evidence-coverage";
import type {PersistedEvent, PersistedEventStateRecord} from "@/lib/persistence/contracts";

export type PatternStatus = "NEEDS_FINAL_RESULTS"|"EXPLORATORY"|"HOLDOUT_PENDING";
export interface DiscoveredPattern {
  id:string;
  label:string;
  question:string;
  sport:"football";
  family:string;
  observations:number;
  settled:number;
  wins:number;
  hitRate:number|null;
  lower95:number|null;
  holdoutCount:number;
  holdoutWins:number;
  holdoutHitRate:number|null;
  status:PatternStatus;
  verifiedOddsCount:0;
  validatedEdge:false;
}
export interface PatternDiscoveryResult {
  model:"veto.pattern-discovery.observed-v1";
  source:"PERSISTED_ONLY";
  generatedAt:string;
  lookbackHours:number;
  eventsScanned:number;
  usableLiveObservations:number;
  verifiedFinals:number;
  hypothesesScreened:number;
  validatedEdgeCount:0;
  note:string;
  patterns:DiscoveredPattern[];
}
type Score={home:number;away:number};
type Point={eventId:string;at:string;minute:number;score:Score;source:string};
type Market={id:string;label:string;win:(s:Score)=>boolean;possible:(s:Score)=>boolean};
const markets:Market[]=[
  ...[2.5,3.5,4.5,5.5].map(line=>({
    id:"under-"+line, label:"ТМ "+line,
    win:(s:Score)=>s.home+s.away<line,
    possible:(s:Score)=>s.home+s.away<line,
  })),
  {id:"btts-yes",label:"Обе забьют — да",win:s=>s.home>0&&s.away>0,possible:s=>s.home===0||s.away===0},
  {id:"btts-no",label:"Обе забьют — нет",win:s=>s.home===0||s.away===0,possible:s=>s.home===0||s.away===0},
  {id:"home-not-lose",label:"1X",win:s=>s.home>=s.away,possible:()=>true},
  {id:"away-not-lose",label:"X2",win:s=>s.away>=s.home,possible:()=>true},
];
const dateMs=(x:string)=>Date.parse(x);
const validScore=(v:unknown):Score|null=>{
  if(!v||typeof v!=="object"||Array.isArray(v))return null;
  const s=v as Record<string,unknown>;
  return typeof s.home==="number"&&typeof s.away==="number"&&
    Number.isInteger(s.home)&&Number.isInteger(s.away)&&s.home>=0&&s.away>=0&&
    s.home<=30&&s.away<=30?{home:s.home,away:s.away}:null;
};
const readMinute=(s:Record<string,unknown>):number|null=>{
  const n=typeof s.elapsedSeconds==="number"?s.elapsedSeconds/60:NaN;
  if(Number.isInteger(n)&&n>=0&&n<=130)return n;
  const raw=typeof s.clock==="string"?s.clock:"";
  const m=raw.match(/^\s*(\d{1,3})(?:\s*\+\s*(\d{1,2}))?(?:['′’]|:|\s|$)/);
  if(!m)return null;
  const minute=Number(m[1])+Number(m[2]||0);
  return minute>=0&&minute<=130?minute:null;
};
const timeBucket=(m:number):{id:string;label:string}=>{
  if(m<25)return {id:"opening",label:"до 25′"};
  if(m<55)return {id:"middle",label:"25–54′"};
  if(m<75)return {id:"closing",label:"55–74′"};
  if(m<90)return {id:"late",label:"75–89′"};
  return {id:"added",label:"90′+"};
};
const scoreBucket=(s:Score):{id:string;label:string}=>{
  const exact=["0:0","1:0","0:1","1:1","2:1","1:2","2:2"].find(x=>x===s.home+":"+s.away);
  if(exact)return {id:"score-"+exact.replace(":","-"),label:"счёт "+exact};
  if(Math.abs(s.home-s.away)>=2)return {id:"lead2",label:"разница ≥2 гола"};
  if(s.home===s.away)return {id:"draw-other",label:"ничья с голами"};
  return {id:"one-goal-other",label:"разница 1 гол"};
};
const wilsonLower=(wins:number,n:number)=>{
  if(n===0)return null;
  const z=1.96,p=wins/n,z2=z*z,den=1+z2/n;
  return Math.max(0,(p+z2/(2*n)-z*Math.sqrt(p*(1-p)/n+z2/(4*n*n)))/den);
};
interface PatternBucket {
  id:string;label:string;family:string;market:Market;
  points:Map<string,Point>;
}
export function discoverObservedPatterns(input:{
  events:PersistedEvent[];states:PersistedEventStateRecord[];asOf:string;lookbackHours?:number;maxPatterns?:number;
}):PatternDiscoveryResult{
  const now=dateMs(input.asOf),hours=input.lookbackHours??48;
  const safeNow=Number.isFinite(now)?now:Date.now();
  const eligible=new Map(input.events.filter(e=>e.event.sport==="football"&&
    e.canonicalKey!=="veto-sport-storage-selfcheck"&&e.event.competition!=="VETO Storage Selfcheck").map(e=>[e.id,e]));
  const byEvent=new Map<string,PersistedEventStateRecord[]>();
  for(const row of input.states){
    if(!eligible.has(row.eventId))continue;
    const t=dateMs(row.capturedAt);
    if(!Number.isFinite(t)||t>safeNow||t<safeNow-hours*3600000)continue;
    const old=byEvent.get(row.eventId)||[];old.push(row);byEvent.set(row.eventId,old);
  }
  const samples:Point[]=[];
  const finalScores=new Map<string,{score:Score;at:string}>();
  for(const [id,rows] of byEvent){
    rows.sort((a,b)=>dateMs(a.capturedAt)-dateMs(b.capturedAt));
    const event=eligible.get(id);
    for(const row of rows){
      const score=validScore(row.state.score);
      if(!score)continue;
      if(event&&certifiedRegulationFinal(row,event)){
        finalScores.set(id,{score,at:row.capturedAt});
      }
      if(row.state.status!=="live")continue;
      const minute=readMinute(row.state);
      if(minute===null||minute>105)continue;
      samples.push({eventId:id,at:row.capturedAt,minute,score,source:row.sourceProvider});
    }
  }
  const discovered=new Map<string,PatternBucket>();
  for(const p of samples){
    const time=timeBucket(p.minute),shape=scoreBucket(p.score);
    for(const market of markets){
      if(!market.possible(p.score))continue;
      // Disjoint time band / score shape families, explored across *all* observed games.
      // One observation per event per rule avoids counting repeated polling as independent samples.
      const id=time.id+"__"+shape.id+"__"+market.id;
      let bucket=discovered.get(id);
      if(!bucket){
        bucket={id,label:time.label+" · "+shape.label+" → "+market.label,
          family:market.id,market,points:new Map()};
        discovered.set(id,bucket);
      }
      if(!bucket.points.has(p.eventId))bucket.points.set(p.eventId,p);
    }
  }
  const patterns:DiscoveredPattern[]=[];
  for(const bucket of discovered.values()){
    const ordered=[...bucket.points.values()].sort((a,b)=>dateMs(eligible.get(a.eventId)?.event.startsAt||a.at)-dateMs(eligible.get(b.eventId)?.event.startsAt||b.at)||dateMs(a.at)-dateMs(b.at));
    const settled=ordered.filter(p=>{
      const f=finalScores.get(p.eventId);
      return f&&dateMs(f.at)>dateMs(p.at);
    });
    const trainCount=Math.floor(settled.length*.7);
    const wins=settled.filter(p=>bucket.market.win(finalScores.get(p.eventId)!.score)).length;
    const holdout=settled.slice(trainCount);
    const holdoutWins=holdout.filter(p=>bucket.market.win(finalScores.get(p.eventId)!.score)).length;
    patterns.push({
      id:bucket.id,label:bucket.label,sport:"football",family:bucket.family,
      question:"Сохраняется ли частота исхода вне обучающего периода при доступных рыночных ценах?",
      observations:ordered.length,settled:settled.length,wins,
      hitRate:settled.length?wins/settled.length:null,
      lower95:wilsonLower(wins,settled.length),
      holdoutCount:holdout.length,holdoutWins,
      holdoutHitRate:holdout.length?holdoutWins/holdout.length:null,
      status:settled.length===0?"NEEDS_FINAL_RESULTS":settled.length<60||holdout.length<18?"HOLDOUT_PENDING":"EXPLORATORY",
      verifiedOddsCount:0,validatedEdge:false,
    });
  }
  patterns.sort((a,b)=>b.settled-a.settled||b.observations-a.observations||a.id.localeCompare(b.id));
  return{
    model:"veto.pattern-discovery.observed-v1",source:"PERSISTED_ONLY",generatedAt:input.asOf,
    lookbackHours:hours,eventsScanned:eligible.size,usableLiveObservations:samples.length,
    verifiedFinals:finalScores.size,hypothesesScreened:patterns.length,validatedEdgeCount:0,
    note:"Автоматический перебор ситуаций; это гипотезы, не ставки. Завершения матчей должны иметь отдельный проверенный снимок. Частота исхода и Wilson-граница не доказывают EV. Множество сравнений, доступные коэффициенты, holdout и исполнение ещё требуют проверки.",
    patterns:patterns.slice(0,Math.min(24,Math.max(1,input.maxPatterns??16))),
  };
}
export function observedPatternDiscoverySelfcheck(){
  const at="2026-10-13T12:00:00Z",ev=(id:string,status:"live"|"finished"):PersistedEvent=>({
    id,canonicalKey:id,event:{id,sport:"football",competition:"Test source",startsAt:"2026-10-13T08:00:00Z",status}
  });
  const st=(eventId:string,atTime:string,status:string,home:number,away:number,clock:string):PersistedEventStateRecord=>({
    eventId,sourceProvider:"api-football",capturedAt:atTime,state:{status,score:{home,away},clock,...(status==="finished"?{source:"api-football.fixtures.results",providerEventId:10,regulationTimeOnly:true}:{})}
  });
  const base={events:[ev("a","finished"),ev("b","live")],
    states:[st("a","2026-10-13T09:30:00Z","live",1,0,"80′"),
      st("a","2026-10-13T09:31:00Z","live",1,0,"81′"),
      st("a","2026-10-13T10:00:00Z","finished",1,0,"FT"),
      st("b","2026-10-13T09:30:00Z","live",0,0,"81′")],asOf:at};
  const r=discoverObservedPatterns(base);
  const under=r.patterns.find(x=>x.id==="late__score-1-0__under-2.5");
  const rules=discoverObservedPatterns({...base,states:base.states.filter(s=>s.eventId==="b")});
  const future=discoverObservedPatterns({...base,states:[st("a","2026-10-13T13:00:00Z","finished",1,0,"FT")]});
  const historicalInput={...base,events:[ev("archive","finished")],states:[
    st("archive","2026-10-07T09:30:00Z","live",1,0,"80′"),
    st("archive","2026-10-08T10:00:00Z","finished",1,0,"FT")],
  };
  const retainedSevenDays=discoverObservedPatterns({...historicalInput,lookbackHours:168});
  const lostAfterTwoDays=discoverObservedPatterns({...historicalInput,lookbackHours:48});
  const olderThanWindow=discoverObservedPatterns({...historicalInput,states:[
    st("archive","2026-10-04T09:30:00Z","live",1,0,"80′"),
    st("archive","2026-10-04T10:00:00Z","finished",1,0,"FT"),
  ],lookbackHours:168});
  const checks=[
    {name:"No real-money validated edge ever minted",passed:r.validatedEdgeCount===0&&r.patterns.every(x=>!x.validatedEdge)},
    {name:"Deduplicate same event within pattern",passed:under?.observations===1},
    {name:"Results require a later verified finished snapshot",passed:under?.settled===1&&under.wins===1},
    {name:"Live-only fixture has unknown outcome",passed:rules.patterns.every(x=>x.settled===0)},
    {name:"Future outcome excluded",passed:future.verifiedFinals===0},
    {name:"No price/ROI/claimed availability invented",passed:r.patterns.every(x=>x.verifiedOddsCount===0)},
    {name:"Temporal holdout cannot fabricate ROI",passed:under?.holdoutCount===1&&under.status==="HOLDOUT_PENDING"},
    {name:"Multiple scoreline/time rules generated",passed:r.hypothesesScreened>=8},
    {name:"Unknown clocks excluded",passed:discoverObservedPatterns({...base,states:[st("a","2026-10-13T09:30:00Z","live",1,0,"UNKNOWN")]}).usableLiveObservations===0},
    {name:"No demo/selfcheck events",passed:discoverObservedPatterns({...base,events:[{...ev("a","finished"),canonicalKey:"veto-sport-storage-selfcheck"}]}).eventsScanned===0},
    {name:"A status-only or forged FT row is never certified",passed:discoverObservedPatterns({...base,states:base.states.map(row=>row.state.status==="finished"?{...row,state:{...row.state,source:"unknown"}}:row)}).verifiedFinals===0},
    {name:"Certified 6-day-old historical result is retained in 7-day study",passed:retainedSevenDays.verifiedFinals===1&&retainedSevenDays.patterns.some(x=>x.settled===1)},
    {name:"48-hour-only study would omit the same historical outcome",passed:lostAfterTwoDays.verifiedFinals===0},
    {name:"Observations older than the seven-day boundary are excluded",passed:olderThanWindow.verifiedFinals===0&&olderThanWindow.usableLiveObservations===0},

  ];
  return{passed:checks.every(x=>x.passed),checks};
}
