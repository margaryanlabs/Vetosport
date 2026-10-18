import type {PersistedEvent} from "@/lib/persistence/contracts";

/** EPL identity is backed by the *exact* The Odds API soccer_epl ID.
 * An API-Football canonical event typically has "Premier League · England"
 * instead of the odds feed's "EPL"; both are legitimate competition labels.
 * This predicate alone NEVER links fixtures or certifies scores. */
export function isExactEplFixture(event:PersistedEvent):boolean{
 if(event.event.sport!=="football")return false;
 const id=event.providerRefs?.["the-odds-api"];
 if(typeof id!=="string"||!/^[a-f0-9]{32}$/i.test(id))return false;
 const competition=event.event.competition.trim().toLowerCase().replace(/\s+/g," ");
 return (event.canonicalKey.startsWith("football::epl::")&&
  ["epl","premier league","english premier league"].includes(competition))||
  (event.canonicalKey.startsWith("football::premier-league-england::")&&
   (competition==="premier league · england"||
    competition==="premier league - england"));
}
export function exactEplIdentitySelfcheck(){
 const fixture:PersistedEvent={
  id:"1",canonicalKey:"football::premier-league-england::abc",
  providerRefs:{"the-odds-api":"a".repeat(32)},
  event:{id:"1",sport:"football",competition:"Premier League · England",
   startsAt:"2026-10-18T11:00:00Z",status:"live"}};
 const checks=[
  {name:"API-Football England EPL alias accepts exact The Odds API external id",passed:isExactEplFixture(fixture)},
  {name:"Odds-derived EPL canonical key accepts exact id",
   passed:isExactEplFixture({...fixture,canonicalKey:"football::epl::abc",
    event:{...fixture.event,competition:"EPL"}})},
  {name:"Indonesian Premier League not confused with EPL",
   passed:!isExactEplFixture({...fixture,event:{...fixture.event,competition:"Premier League · Indonesia"}})},
  {name:"Unknown league key never qualifies",
   passed:!isExactEplFixture({...fixture,canonicalKey:"football::laliga::abc"})},
  {name:"No exact ID never qualifies",
   passed:!isExactEplFixture({...fixture,providerRefs:{"the-odds-api":"fuzzy"}})},
 ];
 return{passed:checks.every(c=>c.passed),checks};
}
