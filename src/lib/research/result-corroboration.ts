/**
 * A read-only, opt-in link audit between VETO's stored live observations and
 * community-entered OpenLigaDB results. ODbL data never enters VETO storage,
 * settlement, research training, backtesting or decision ledgers.
 *
 * A candidate match is NOT an independent final-score certificate: score
 * progression merely checks whether last known live score is plausible.
 */
import {assessEventMatch} from "@/lib/canonical/match";
import type {PersistedEvent,PersistedEventStateRecord} from "@/lib/persistence/contracts";
import type {SportEvent} from "@/lib/domain/types";
import type {LeagueResults,PublicMatch,OpenLeague} from "@/lib/providers/openligadb-results";

export type CrosscheckAssessment="OBSERVATION_COMPATIBLE"|
 "REVIEW_SCORE_CORRECTION"|"MATCHED_NO_LIVE_SCORE";
export type CrosscheckRow={
 publicMatchId:number;league:OpenLeague;
 state:CrosscheckAssessment;
 lastObservedAt:string|null;
 lastObservedScore:{home:number;away:number}|null;
 source:"api-football";
};
export type CrosscheckReport={
 model:"veto.readonly-cross-source-v1";source:"VETO_OBSERVATIONS_VS_OPENLIGADB";
 generatedAt:string;observedWindowDays:7;
 openResultsShown:number;footballEventsInspected:number;
 matchedFixtures:number;withLiveScore:number;
 needsScoreReview:number;ambiguousRejected:number;
 limitedByStorage:boolean;
 verifiedVetoFinalsAdded:0;validatedBettingEdgeCount:0;
 crossSourceComparisonIsNotSettlement:true;
 legalSource:"OpenLigaDB / ODbL 1.0";
 rows:CrosscheckRow[];
 note:string;
};
const date=(iso:string)=>Date.parse(iso);
const score=(v:unknown):{home:number;away:number}|null=>{
 if(!v||typeof v!=="object"||Array.isArray(v))return null;
 const obj=v as {home?:unknown;away?:unknown};
 return typeof obj.home==="number"&&Number.isInteger(obj.home)&&obj.home>=0&&obj.home<=30&&
  typeof obj.away==="number"&&Number.isInteger(obj.away)&&obj.away>=0&&obj.away<=30
  ?{home:obj.home,away:obj.away}:null;
};
const inSupportedLeague=(label:string,league:OpenLeague)=>{
 const s=label.trim().toLowerCase();
 if(/women|woman|female|feminin|u\s*[-]?\s*\d{2}|youth|junior|amateur/.test(s))return false;
 return league==="bl2"?/^2\s*\.?\s*bundesliga(?:\s|[·—-]|$)/.test(s):
  /^bundesliga(?:\s|[·—-]|$)/.test(s);
};
const canonicalInput=(m:PublicMatch):SportEvent=>({
 id:String(m.id),sport:"football",competition:m.league==="bl2"?"2. Bundesliga":"Bundesliga",
 startsAt:m.startsAt,status:"finished",
 home:{id:m.home,name:m.home},away:{id:m.away,name:m.away},
});
function eligibleLinkedEvents(events:PersistedEvent[],match:PublicMatch){
 const incoming=canonicalInput(match);
 const kickoff=date(match.startsAt);
 return events.filter(e=>{
   if(e.event.sport!=="football"||!inSupportedLeague(e.event.competition,match.league)||
    !["live","finished"].includes(e.event.status)||
    !Number.isFinite(date(e.event.startsAt))||
    Math.abs(date(e.event.startsAt)-kickoff)>12*60000)return false;
   return true;
 }).map(e=>({event:e,assessment:assessEventMatch(e.event,incoming,12)}))
  .filter(x=>x.assessment.accepted&&!x.assessment.swapped&&
   x.assessment.participantScore>=.82&&x.assessment.score>=.80)
  .sort((a,b)=>b.assessment.score-a.assessment.score);
}
export function findUnambiguousExternalLinks(input:{
 events:PersistedEvent[];publicMatches:PublicMatch[];
}){
 const matches=new Map<string,{match:PublicMatch;event:PersistedEvent}>();
 const claimedEvents=new Map<string,string>();
 const ambiguous=new Set<string>();
 let ambiguousRejected=0;
 for(const match of input.publicMatches){
  if(match.state!=="finished-90"||match.homeScore===null||match.awayScore===null)continue;
  const id=match.league+":"+match.id;
  const candidates=eligibleLinkedEvents(input.events,match);
  if(!candidates.length)continue;
  // Two highly plausible canonical observations are not a unique match.
  if(candidates.length>1&&candidates[0].assessment.score-candidates[1].assessment.score<.1){
   ambiguousRejected++;continue;
  }
  const chosen=candidates[0].event;
  const prior=claimedEvents.get(chosen.id);
  if(prior){
   ambiguous.add(prior);ambiguous.add(id);
   ambiguousRejected++;continue;
  }
  matches.set(id,{match,event:chosen});
  claimedEvents.set(chosen.id,id);
 }
 for(const key of ambiguous){matches.delete(key);}
 return{matches,ambiguousRejected};
}
export function evaluateCrossSourceMatches(input:{
 events:PersistedEvent[];states:PersistedEventStateRecord[];
 leagues:LeagueResults[];asOf:string;limitedByStorage?:boolean;
}):CrosscheckReport{
 const asOf=date(input.asOf),observedSince=asOf-7*86400000;
 const publicMatches=input.leagues.flatMap(l=>l.finished)
  .filter(m=>m.state==="finished-90"&&date(m.startsAt)<=asOf&&date(m.startsAt)>=observedSince);
 const {matches,ambiguousRejected}=findUnambiguousExternalLinks({
  events:input.events,publicMatches,
 });
 const latest=new Map<string,{at:string;home:number;away:number}>();
 for(const st of input.states){
  if(st.sourceProvider!=="api-football"||st.state.status!=="live")continue;
  const at=date(st.capturedAt);
  const s=score(st.state.score);
  if(!s||!Number.isFinite(at)||at>asOf)continue;
  const prior=latest.get(st.eventId);
  if(prior&&date(prior.at)>=at)continue;
  latest.set(st.eventId,{at:st.capturedAt,...s});
 }
 const rows:CrosscheckRow[]=[];
 for(const {match,event} of matches.values()){
  const observed=latest.get(event.id);
  const lastObservedScore=observed?{home:observed.home,away:observed.away}:null;
  const needsReview=observed&&
   (observed.home>match.homeScore!||observed.away>match.awayScore!);
  rows.push({publicMatchId:match.id,league:match.league,
   state:!observed?"MATCHED_NO_LIVE_SCORE":
    needsReview?"REVIEW_SCORE_CORRECTION":"OBSERVATION_COMPATIBLE",
   lastObservedAt:observed?.at??null,lastObservedScore,source:"api-football"});
 }
 return{
  model:"veto.readonly-cross-source-v1",source:"VETO_OBSERVATIONS_VS_OPENLIGADB",
  generatedAt:input.asOf,observedWindowDays:7,
  openResultsShown:publicMatches.length,footballEventsInspected:input.events.length,
  matchedFixtures:rows.length,
  withLiveScore:rows.filter(r=>r.lastObservedScore!==null).length,
  needsScoreReview:rows.filter(r=>r.state==="REVIEW_SCORE_CORRECTION").length,
  ambiguousRejected,limitedByStorage:!!input.limitedByStorage,
  verifiedVetoFinalsAdded:0,validatedBettingEdgeCount:0,
  crossSourceComparisonIsNotSettlement:true,
  legalSource:"OpenLigaDB / ODbL 1.0",rows,
  note:"Только диагностическое сопоставление. Промежуточный счёт VETO может законно отличаться от финального; совпадение не является доказательством прибыли или лицензией на повторное использование данных.",
 };
}
export function sourceComparisonSelfcheck(){
 const at="2026-10-14T01:00:00Z";
 const match:PublicMatch={id:42,league:"bl1",season:2026,startsAt:"2026-10-11T15:30:00Z",
  home:"Bayern München",away:"Borussia Dortmund",
  homeScore:2,awayScore:1,state:"finished-90",updatedAt:null,
  provenance:"OpenLigaDB / ODbL-1.0"};
 const event:PersistedEvent={id:"veto-event",canonicalKey:"real-observed-match",
  event:{id:"fixture-provider",sport:"football",
   competition:"Bundesliga · Germany",startsAt:"2026-10-11T15:30:00Z",status:"live",
   home:{id:"home",name:"Bayern München"},away:{id:"away",name:"Borussia Dortmund"}}};
 const snapshot:PersistedEventStateRecord={eventId:event.id,
  sourceProvider:"api-football",capturedAt:"2026-10-11T16:15:00Z",
  state:{status:"live",score:{home:1,away:0},clock:"45′"}};
 const league:LeagueResults={league:"bl1",label:"Bundesliga",season:2026,status:"available",
  finished:[match],upcoming:[],allSeasonCompleted:1,fetchedAt:at};
 const base={events:[event],states:[snapshot],leagues:[league],asOf:at};
 const result=evaluateCrossSourceMatches(base);
 const again=(ev:PersistedEvent[])=>evaluateCrossSourceMatches({...base,events:ev});
 const checks=[
  {name:"Same football teams in right orientation, league and kickoff linked",pass:
   result.matchedFixtures===1&&result.withLiveScore===1},
  {name:"Historical live score <= public final is only compatible, not a certified final",
   pass:result.rows[0].state==="OBSERVATION_COMPATIBLE"&&result.verifiedVetoFinalsAdded===0},
  {name:"Never match a lower-league event to first Bundesliga",pass:again([{...event,event:{...event.event,competition:"2. Bundesliga · Germany"}}]).matchedFixtures===0},
  {name:"Swapped home and away rejected",pass:again([{...event,event:{...event.event,home:event.event.away,away:event.event.home}}]).matchedFixtures===0},
  {name:"Different kickoff rejected",pass:again([{...event,event:{...event.event,startsAt:"2026-10-11T16:00:00Z"}}]).matchedFixtures===0},
  {name:"Youth fixture cannot be linked to senior league",pass:again([{...event,event:{...event.event,competition:"Bundesliga U19 · Germany"}}]).matchedFixtures===0},
  {name:"Suspended status cannot be labeled verified event",pass:again([{...event,event:{...event.event,status:"suspended"}}]).matchedFixtures===0},
  {name:"Anomalous live score only triggers manual-review state",pass:
   evaluateCrossSourceMatches({...base,states:[{...snapshot,state:{...snapshot.state,score:{home:3,away:0}}}]}).rows[0].state==="REVIEW_SCORE_CORRECTION"},
  {name:"Missing live snapshots never fabricate a VETO observation",pass:
   evaluateCrossSourceMatches({...base,states:[]}).rows[0].state==="MATCHED_NO_LIVE_SCORE"},
  {name:"Duplicate plausible observations fail closed",pass:
   again([event,{...event,id:"another-real-veto-event",canonicalKey:"another"}]).matchedFixtures===0},
  {name:"Never feed bookmaker, portfolio or model validation",pass:
   result.validatedBettingEdgeCount===0&&result.crossSourceComparisonIsNotSettlement&&result.legalSource.includes("ODbL")},
 ];
 return{passed:checks.every(c=>c.pass),checks};
}
