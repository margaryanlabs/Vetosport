import type {PersistedEvent, PersistedEventStateRecord} from "@/lib/persistence/contracts";

export interface VerifiedOddsMatch {
 fixtureId:number;
 eventId:string;
 stateAt:string;
 scoreAgeSeconds:number;
}
export interface OddsMatchIndex {
 map:Map<number,VerifiedOddsMatch>;
 ambiguous:number[];
}
/** Exact API-Football fixture ids only. Reject fuzzy team names,
 * ambiguous mappings, missing latest state, and stale or non-live state. */
export function buildVerifiedOddsMatchIndex(input:{
 events:PersistedEvent[];
 states:PersistedEventStateRecord[];
 asOf:string;
 maximumStateAgeMinutes?:number;
}):OddsMatchIndex {
 const limitMs=(input.maximumStateAgeMinutes??75)*60_000;
 const now=Date.parse(input.asOf);
 const events=new Map(input.events.filter(e=>e.event.sport==="football").map(e=>[e.id,e]));
 const latest=new Map<string,PersistedEventStateRecord>();
 for(const row of input.states){
  if(row.sourceProvider!=="api-football"||!events.has(row.eventId))continue;
  const t=Date.parse(row.capturedAt);
  if(!Number.isFinite(t)||t>now||now-t>limitMs)continue;
  const old=latest.get(row.eventId);
  if(!old||Date.parse(old.capturedAt)<t)latest.set(row.eventId,row);
 }
 const matchMap=new Map<number,VerifiedOddsMatch>();
 const conflicted=new Set<number>();
 for(const [eventId,state] of latest){
  if(state.state.status!=="live")continue;
  const id=state.state.providerEventId;
  if(typeof id!=="number"||!Number.isSafeInteger(id)||id<=0)continue;
  if(conflicted.has(id))continue;
  const prior=matchMap.get(id);
  if(prior&&prior.eventId!==eventId){matchMap.delete(id);conflicted.add(id);continue;}
  matchMap.set(id,{fixtureId:id,eventId,stateAt:state.capturedAt,
    scoreAgeSeconds:Math.max(0,Math.floor((now-Date.parse(state.capturedAt))/1000))});
 }
 return{map:matchMap,ambiguous:[...conflicted]};
}
export function oddsMatchIndexSelfcheck(){
 const asOf="2026-10-12T12:00:00Z";
 const game:PersistedEvent={id:"a",canonicalKey:"k",event:{id:"a",sport:"football",competition:"Test",startsAt:"2026-10-12T10:30:00Z",status:"live"}};
 const state:PersistedEventStateRecord={eventId:"a",sourceProvider:"api-football",capturedAt:"2026-10-12T11:59:00Z",state:{providerEventId:77,status:"live",score:{home:1,away:1}}};
 const use=(events:PersistedEvent[],states:PersistedEventStateRecord[])=>buildVerifiedOddsMatchIndex({events,states,asOf});
 const checks=[
  {name:"Exact fixture linked to real state",pass:use([game],[state]).map.get(77)?.eventId==="a"},
  {name:"Different provider rejected",pass:use([game],[{...state,sourceProvider:"other"}]).map.size===0},
  {name:"Missing id rejected",pass:use([game],[{...state,state:{status:"live"}}]).map.size===0},
  {name:"Stale score rejected",pass:use([game],[{...state,capturedAt:"2026-10-12T08:00:00Z"}]).map.size===0},
  {name:"Future score rejected",pass:use([game],[{...state,capturedAt:"2026-10-12T12:05:00Z"}]).map.size===0},
  {name:"Finished match rejected",pass:use([game],[{...state,state:{providerEventId:77,status:"finished"}}]).map.size===0},
  {name:"Ambiguous canonical matches rejected",pass:use([game,{...game,id:"b"}],[state,{...state,eventId:"b"}]).map.size===0},
  {name:"No matching by team names",pass:use([game],[{...state,sourceProvider:"the-odds-api"}]).map.size===0},
  {name:"Newest state governs current status",pass:use([game],[{...state,capturedAt:"2026-10-12T11:58:00Z",state:{providerEventId:77,status:"finished"}},state]).map.get(77)?.eventId==="a"},
 ];
 return{passed:checks.every(t=>t.pass),checks};
}
