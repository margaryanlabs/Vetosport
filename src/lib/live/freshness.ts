import type {LiveEventSummary} from "@/lib/live/types";

/** A persisted LIVE flag means "last observed as live", not an active game. */
export function getObservedFreshness(event:Pick<LiveEventSummary,"source"|"status"|"lastUpdatedAt"|"startsAt">,now=Date.now()){
 const parsed=event.lastUpdatedAt?Date.parse(event.lastUpdatedAt):NaN;
 const kickoff=event.startsAt?Date.parse(event.startsAt):NaN;
 const known=event.source==="persisted"&&Number.isFinite(parsed)&&parsed<=now;
 const ageSeconds=known?Math.floor((now-parsed)/1000):null;
 const sinceKickoffHours=Number.isFinite(kickoff)?(now-kickoff)/3600000:null;
 const oldKickoff=event.status==="live"&&sinceKickoffHours!==null&&sinceKickoffHours>4;
 const freshLive=known&&event.status==="live"&&!oldKickoff&&
  ageSeconds!==null&&ageSeconds<=120;
 const delayedLive=known&&event.status==="live"&&!oldKickoff&&
  ageSeconds!==null&&ageSeconds>120&&ageSeconds<=45*60;
 const unverifiedArchive=known&&event.status==="live"&&(oldKickoff||
  (ageSeconds!==null&&ageSeconds>45*60));
 const stale=known&&ageSeconds!==null&&ageSeconds>120;
 const label=event.source==="sandbox"?"ДЕМО · НЕ РЕАЛЬНЫЙ МАТЧ":
   !known?event.status==="scheduled"?"РАСПИСАНИЕ · БЕЗ LIVE-СЧЁТА":"ВРЕМЯ ИСТОЧНИКА НЕИЗВЕСТНО":
   unverifiedArchive?"АРХИВ · ФИНАЛ НЕ ПОДТВЕРЖДЁН":
   freshLive?"LIVE · СВЕЖИЙ СНИМОК":
   delayedLive?"СНИМОК С ЗАДЕРЖКОЙ · НЕ ПРЯМОЙ ЭФИР":
   stale?"АРХИВНЫЙ СНИМОК":"СОХРАНЁННЫЙ СНИМОК";
 return{known,ageSeconds,freshLive,delayedLive,unverifiedArchive,stale,
  source:event.source,label};
}
export function observedFreshnessSelfcheck(){
 const now=Date.parse("2026-10-12T12:00:00Z");
 const event={source:"persisted" as const,status:"live" as const,
   startsAt:"2026-10-12T11:20:00Z",lastUpdatedAt:"2026-10-12T11:59:00Z"};
 const tests=[
  {name:"Fresh live is marked recent",pass:getObservedFreshness(event,now).freshLive},
  {name:"Old live status is not real-time",pass:!getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T11:30:00Z"},now).freshLive},
  {name:"Missing timestamp is not live",pass:!getObservedFreshness({...event,lastUpdatedAt:undefined},now).freshLive},
  {name:"Future timestamps are not fresh",pass:!getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T12:01:00Z"},now).freshLive},
  {name:"Demo is never real live",pass:!getObservedFreshness({...event,source:"sandbox"},now).freshLive},
  {name:"Finished never labelled live",pass:!getObservedFreshness({...event,status:"finished"},now).freshLive},
  {name:"120 second boundary inclusive",pass:getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T11:58:00Z"},now).freshLive},
  {name:"Older than 120 seconds is stale",pass:getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T11:57:59Z"},now).stale},
  {name:"30-minute polling delay is labeled, not called archive or real-time",
   pass:getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T11:38:00Z"},now).delayedLive},
  {name:"Old kickoff despite recent snapshot is never called a live game",
   pass:getObservedFreshness({...event,startsAt:"2026-10-12T06:00:00Z"},now).unverifiedArchive&&
    !getObservedFreshness({...event,startsAt:"2026-10-12T06:00:00Z"},now).freshLive},
  {name:"Old live status has explicitly unverified final",pass:getObservedFreshness({...event,
   startsAt:"2026-10-12T05:00:00Z"},now).label.includes("ФИНАЛ НЕ ПОДТВЕРЖДЁН")},
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
