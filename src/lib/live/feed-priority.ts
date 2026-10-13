import type {PersistedEvent} from "@/lib/persistence/contracts";
import type {LiveEventSummary} from "@/lib/live/types";
import {getObservedFreshness} from "@/lib/live/freshness";
export const LIVE_FEED_OUTPUT_LIMIT=40;
export const LIVE_FEED_SCAN_LIMIT=90;

export type FeedWindow={from:string;to:string;label:string;limit:100|40};
export function liveFeedWindows(now:number):FeedWindow[]{
 const hr=3600000;
 const range=(start:number,end:number,label:string,limit:100|40)=>
  ({from:new Date(now+start*hr).toISOString(),to:new Date(now+end*hr).toISOString(),label,limit});
 return [
  range(-12,-4,"earlier-observations",40),
  range(-4,-1,"recent-observations",100),
  range(-1,3,"current-and-next",100),
  range(3,36,"upcoming",100),
 ];
}
const finiteKickoff=(event:PersistedEvent|LiveEventSummary)=>{
 const x="event" in event?event.event.startsAt:event.startsAt;
 const m=x?Date.parse(x):NaN;
 return Number.isFinite(m)?m:NaN;
};
function feedTier(event:PersistedEvent|LiveEventSummary,now:number){
 const at=finiteKickoff(event),status="event" in event?event.event.status:event.status;
 if(!Number.isFinite(at))return 7;
 const ageHours=(now-at)/3600000;
 if(status==="live"&&ageHours>=-0.33&&ageHours<=3.5)return 0;
 if(status==="scheduled"&&ageHours>=-1&&ageHours<=0.5)return 1;
 if(status==="scheduled"&&ageHours<0.5)return 2;
 if(status==="live"&&ageHours>3.5)return 5; // not a confirmed final
 if(status==="finished")return 6;
 return 4;
}
function feedSort(a:PersistedEvent|LiveEventSummary,b:PersistedEvent|LiveEventSummary,now:number){
 const tier=feedTier(a,now)-feedTier(b,now);
 if(tier)return tier;
 // Last two hours of actual kickoffs outrank fixtures from twelve hours ago.
 const atA=finiteKickoff(a),atB=finiteKickoff(b);
 const dA=Math.abs(now-atA-45*60000),dB=Math.abs(now-atB-45*60000);
 if(dA!==dB)return dA-dB;
 return a.id.localeCompare(b.id);
}
export function selectFeedCandidates(rows:PersistedEvent[],now:number,limit=LIVE_FEED_SCAN_LIMIT){
 const distinct=[...new Map(rows.map(e=>[e.id,e])).values()];
 return distinct.filter(e=>Number.isFinite(finiteKickoff(e)))
  .sort((a,b)=>feedSort(a,b,now))
  .slice(0,Math.min(90,Math.max(1,limit)));
}
export function prioritizeLiveFeed(summaries:LiveEventSummary[],now:number,limit=LIVE_FEED_OUTPUT_LIMIT){
 const liveScore=(event:LiveEventSummary)=>{
  const state=getObservedFreshness(event,now);
  return state.freshLive?0:state.known&&!state.stale?1:2;
 };
 return [...summaries].sort((a,b)=>{
  const tier=feedTier(a,now)-feedTier(b,now);
  if(tier)return tier;
  const fresh=liveScore(a)-liveScore(b);
  return fresh||feedSort(a,b,now);
 }).slice(0,Math.min(40,Math.max(1,limit)));
}
export function liveFeedPrioritySelfcheck(){
 const now=Date.parse("2026-10-14T12:00:00Z");
 const ev=(id:string,startsAt:string,status:"live"|"scheduled"|"finished"):PersistedEvent=>({
  id,canonicalKey:id,event:{id,sport:"football",competition:"Test",startsAt,status}
 });
 const stale=ev("stale","2026-10-14T01:00:00Z","live");
 const previous=ev("previous","2026-10-14T09:30:00Z","live");
 const current=ev("current","2026-10-14T11:20:00Z","live");
 const upcoming=ev("upcoming","2026-10-14T13:30:00Z","scheduled");
 const selected=selectFeedCandidates([stale,previous,upcoming,current],now,3);
 const summary=(e:PersistedEvent,lastUpdatedAt?:string):LiveEventSummary=>({
  id:e.id,source:"persisted",sport:"football",sportLabel:"FOOTBALL",competition:"Test",
  status:e.event.status,startsAt:e.event.startsAt,clock:"—",period:"—",
  homeCode:"H",awayCode:"A",homeName:"Home",awayName:"Away",homeScore:"—",awayScore:"—",
  pulse:"quiet",markets:0,repriced:0,intelligenceReady:false,lastUpdatedAt,
 });
 const order=prioritizeLiveFeed([summary(stale,"2026-10-14T01:10:00Z"),
  summary(upcoming),summary(previous,"2026-10-14T09:36:00Z"),
  summary(current,"2026-10-14T11:59:40Z")],now);
 const checks=[
  {name:"Never let 11-hour-old unfinished matches monopolize the live home feed",passed:!selected.some(x=>x.id==="stale")},
  {name:"Current kickoff takes priority over old unverified status",passed:selected[0].id==="current"},
  {name:"Verified recent 20-second score update surfaces before older live snapshots",passed:order[0].id==="current"},
  {name:"Upcoming game outranks unverified 11-hour-old LIVE status",passed:order.findIndex(x=>x.id==="upcoming")<order.findIndex(x=>x.id==="stale")},
  {name:"Duplicate storage records are not counted as different matches",passed:selectFeedCandidates([current,current],now).length===1},
  {name:"Capped visible selection never exceeds 40",passed:prioritizeLiveFeed(Array.from({length:75},(_,i)=>summary(ev(String(i),"2026-10-14T11:15:00Z","live"))),now).length===40},
  {name:"All windows cover recent kickoff plus next day",passed:liveFeedWindows(now).length===4&&liveFeedWindows(now)[3].label==="upcoming"},
 ];
 return{passed:checks.every(c=>c.passed),checks};
}
