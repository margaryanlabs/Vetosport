import type {LiveEventSummary} from "@/lib/live/types";
/** An event marked "live" by the last stored sample is NOT automatically live now. */
export function getObservedFreshness(event:Pick<LiveEventSummary,"source"|"status"|"lastUpdatedAt">,now=Date.now()){
  const raw=event.lastUpdatedAt;
  const parsed=raw?Date.parse(raw):NaN;
  const known=event.source==="persisted"&&Number.isFinite(parsed)&&parsed<=now;
  const ageSeconds=known?Math.floor((now-parsed)/1000):null;
  // 30-minute free API polling must not be advertised as second-by-second live.
  const freshLive=known&&event.status==="live"&&ageSeconds!==null&&ageSeconds<=120;
  const stale=known&&ageSeconds!==null&&ageSeconds>120;
  return{known,ageSeconds,freshLive,stale,source: event.source,
    label:event.source==="sandbox"?"ДЕМО · НЕ РЕАЛЬНЫЙ МАТЧ":
      !known?"ВРЕМЯ ИСТОЧНИКА НЕИЗВЕСТНО":
      freshLive?"LIVE · ПОСЛЕДНИЕ 2 МИН":
      stale?"АРХИВНЫЙ СНИМОК":"СОХРАНЁННЫЙ СНИМОК"};
}
export function observedFreshnessSelfcheck(){
 const now=Date.parse("2026-10-12T12:00:00Z");
 const event={source:"persisted" as const,status:"live" as const,lastUpdatedAt:"2026-10-12T11:59:00Z"};
 const tests=[
  {name:"Fresh live is marked recent",pass:getObservedFreshness(event,now).freshLive},
  {name:"Old live status is not real-time",pass:!getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T11:30:00Z"},now).freshLive},
  {name:"Missing timestamp is not live",pass:!getObservedFreshness({...event,lastUpdatedAt:undefined},now).freshLive},
  {name:"Future timestamps are not fresh",pass:!getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T12:01:00Z"},now).freshLive},
  {name:"Demo is never real live",pass:!getObservedFreshness({...event,source:"sandbox"},now).freshLive},
  {name:"Finished never labelled live",pass:!getObservedFreshness({...event,status:"finished"},now).freshLive},
  {name:"120 second boundary inclusive",pass:getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T11:58:00Z"},now).freshLive},
  {name:"Older than 120 seconds is stale",pass:getObservedFreshness({...event,lastUpdatedAt:"2026-10-12T11:57:59Z"},now).stale},
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
