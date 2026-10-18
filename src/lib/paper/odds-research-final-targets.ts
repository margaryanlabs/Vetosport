import type {PersistedEvent} from "@/lib/persistence/contracts";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

/** Research-only EPL FT target selection for an already scheduled, quota-gated
 * The Odds API scores call. Selection relies on EXACT provider event IDs.
 * No fuzzy matching or extra provider calls. */
export function selectOddsResearchFinalTargets(input:{
 events:PersistedEvent[];asOf:string;maxResults?:number;
}):PersistedEvent[]{
 const now=Date.parse(input.asOf);
 if(!Number.isFinite(now))return[];
 const allowed=input.events.filter(e=>{
  const start=Date.parse(e.event.startsAt);
  return e.event.sport==="football"&&!isSelfcheckEvent(e)&&
   e.event.status!=="finished"&&
   (e.event.status==="scheduled"||e.event.status==="live")&&
   e.canonicalKey.startsWith("football::epl::")&&
   /^[a-f0-9]{32}$/i.test(e.providerRefs?.["the-odds-api"]??"")&&
   Number.isFinite(start)&&now-start>=100*60_000&&now-start<=3*86400_000&&
   !!e.event.home?.name&&!!e.event.away?.name&&
   e.event.home.name.trim().toLowerCase()!==e.event.away.name.trim().toLowerCase();
 });
 // Reject conflicting canonical ownership globally rather than promoting the
 // first matching provider ID and accidentally certifying the wrong match.
 const owners=new Map<string,number>();
 for(const e of allowed){
  const id=e.providerRefs!["the-odds-api"];
  owners.set(id,(owners.get(id)??0)+1);
 }
 const unique=allowed.filter(e=>owners.get(e.providerRefs!["the-odds-api"])===1);
 unique.sort((a,b)=>Date.parse(a.event.startsAt)-Date.parse(b.event.startsAt)||
  a.id.localeCompare(b.id));
 return unique.slice(0,Math.max(1,Math.min(60,input.maxResults??30)));
}
export function oddsResearchFinalTargetsSelfcheck(){
 const asOf="2026-10-18T12:00:00Z",id="a".repeat(32);
 const fixture:PersistedEvent={id:"fixture",canonicalKey:"football::epl::123",
  providerRefs:{"the-odds-api":id},event:{
   id,sport:"football",competition:"EPL",status:"scheduled",startsAt:"2026-10-18T09:00:00Z",
   home:{id:"h",name:"Home"},away:{id:"a",name:"Away"}}};
 const run=(items:PersistedEvent[])=>selectOddsResearchFinalTargets({events:items,asOf});
 const checks=[
  {name:"Exact-ID independent research event qualifies without a paper ticket",passed:run([fixture]).length===1},
  {name:"Two distinct canonicals sharing one external ID are both rejected",
   passed:run([fixture,{...fixture,id:"other"}]).length===0},
  {name:"Mismatched league key cannot masquerade as EPL",
   passed:run([{...fixture,canonicalKey:"football::laliga::xyz"}]).length===0},
  {name:"Fixture must be at least 100 minutes past kickoff",
   passed:run([{...fixture,event:{...fixture.event,startsAt:"2026-10-18T11:00:00Z"}}]).length===0},
  {name:"Older than three days cannot be fetched",
   passed:run([{...fixture,event:{...fixture.event,startsAt:"2026-10-10T10:00:00Z"}}]).length===0},
  {name:"Already finished event cannot trigger a paid result query",
   passed:run([{...fixture,event:{...fixture.event,status:"finished"}}]).length===0},
  {name:"No valid The Odds API provider ID means no fetch",
   passed:run([{...fixture,providerRefs:{"the-odds-api":"invalid"}}]).length===0},
  {name:"Source selector caps and chronologically prioritizes due research",
   passed:selectOddsResearchFinalTargets({events:Array.from({length:40},(_,i)=>({
    ...fixture,id:"e"+i,providerRefs:{"the-odds-api":i.toString(16).padStart(32,"0")},
   })),asOf,maxResults:20}).length===20},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
