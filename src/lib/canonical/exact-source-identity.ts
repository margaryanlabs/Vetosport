import {assessEventMatch} from "@/lib/canonical/match";
import type {SportEvent} from "@/lib/domain/types";
import type {PersistedEvent} from "@/lib/persistence/contracts";

/** Conservative one-to-one source identity for persistence/settlement.
 * Generic fuzzy event matching can display observations, but never attach a
 * score-provider ID without same-orientation, nearly identical names and
 * exact kickoff time. Never modify bookmaker ID for an already linked fixture.
 */
export function exactOddsProviderLink(input:{
 candidates:PersistedEvent[];incoming:SportEvent;externalId:string;
}):PersistedEvent|null{
 const {candidates,incoming,externalId}=input;
 if(!/^[a-f0-9]{32}$/i.test(externalId)||incoming.sport!=="football")return null;
 const kickoff=Date.parse(incoming.startsAt);
 if(!Number.isFinite(kickoff)||!incoming.home?.name||!incoming.away?.name)return null;
 const compatible=candidates.filter(row=>{
  const existing=row.providerRefs?.["the-odds-api"];
  if(existing&&existing!==externalId)return false;
  const t=Date.parse(row.event.startsAt);
  if(!Number.isFinite(t)||Math.abs(t-kickoff)>1000)return false;
  const assessment=assessEventMatch(row.event,incoming,25);
  return assessment.accepted&&!assessment.swapped&&assessment.participantScore>=.999;
 });
 // Two plausible canonicals are ambiguous even if one ranked slightly higher.
 return compatible.length===1?compatible[0]:null;
}
export function exactOddsProviderLinkSelfcheck(){
 const id="a".repeat(32),incoming:SportEvent={id:"a",sport:"football",competition:"EPL",
  status:"scheduled",startsAt:"2026-10-18T16:00:00Z",
  home:{id:"h",name:"Arsenal"},away:{id:"v",name:"Chelsea"}};
 const existing:PersistedEvent={id:"canonical",canonicalKey:"football::premier-league-england::abc",
  providerRefs:{"api-football":"101"},event:{...incoming,id:"101",competition:"Premier League · England",status:"live"}};
 const run=(candidates:PersistedEvent[],incomingFixture=incoming,externalId=id)=>
  exactOddsProviderLink({candidates,incoming:incomingFixture,externalId});
 const checks=[
  {name:"Same kickoff same oriented teams can attach exact ID without changing live fixture",
   passed:run([existing])?.id==="canonical"},
  {name:"Swapped orientation never attaches the wrong final",passed:run([existing],
   {...incoming,home:incoming.away,away:incoming.home})===null},
  {name:"Clock drift over one second never links score providers",
   passed:run([existing],{...incoming,startsAt:"2026-10-18T16:01:00Z"})===null},
  {name:"Different teams even same match time never link",
   passed:run([existing],{...incoming,away:{id:"b",name:"Liverpool"}})===null},
  {name:"Ambiguous duplicate canonical events fail closed",passed:run([existing,{...existing,id:"other"}])===null},
  {name:"Existing provider id cannot be overwritten by a different fixture",
   passed:run([{...existing,providerRefs:{"the-odds-api":"b".repeat(32)}}])===null},
  {name:"Malformed provider id is never persisted as truth",passed:run([existing],incoming,"not-a-provider-id")===null},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
