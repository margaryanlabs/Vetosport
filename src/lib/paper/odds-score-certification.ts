/** Exact event-ID certification from The Odds API scores endpoint.
 * Score payloads are not odds and never establish executable historical prices.
 * Only standard EPL 90-minute full-time results are admissible to this lane.
 */
import type {PersistedEvent,PersistedEventStateRecord} from "@/lib/persistence/contracts";
export type OddsScoreCandidate={externalId:string;startsAt:string;
 home:string;away:string;score:{home:number;away:number};
 observedAt:string;source:"the-odds-api.scores";regulationTimeOnly:true};
const norm=(x:string)=>x.trim().replace(/\s+/g," ").toLowerCase();
const score=(x:unknown):number|null=>{
 if(typeof x!=="string"||!/^(0|[1-9][0-9]?)$/.test(x))return null;
 const n=Number(x);return Number.isInteger(n)&&n>=0&&n<=40?n:null;
};
export function parseOddsApiScore(value:unknown,asOf:string):OddsScoreCandidate|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const r=value as Record<string,unknown>,now=Date.parse(asOf);
 if(r.sport_key!=="soccer_epl"||r.completed!==true||
  typeof r.id!=="string"||!/^[a-f0-9]{32}$/i.test(r.id)||
  typeof r.commence_time!=="string"||!Number.isFinite(Date.parse(r.commence_time))||
  typeof r.home_team!=="string"||typeof r.away_team!=="string"||
  !r.home_team.trim()||!r.away_team.trim()||norm(r.home_team)===norm(r.away_team)||
  !Array.isArray(r.scores)||r.scores.length!==2||!Number.isFinite(now)||
  Date.parse(r.commence_time)>now-60*60_000)return null;
 const rows=r.scores as unknown[];
 if(!rows.every(x=>x!==null&&typeof x==="object"&&!Array.isArray(x)))return null;
 const a=rows as Array<{name?:unknown;score?:unknown}>;
 const home=a.filter(x=>x.name===r.home_team),away=a.filter(x=>x.name===r.away_team);
 if(home.length!==1||away.length!==1)return null;
 const h=score(home[0].score),v=score(away[0].score);
 if(h===null||v===null)return null;
 return{externalId:r.id,startsAt:r.commence_time,home:r.home_team,away:r.away_team,
  score:{home:h,away:v},observedAt:asOf,
  source:"the-odds-api.scores",regulationTimeOnly:true};
}
export function matchOddsApiScore(e:PersistedEvent,score:OddsScoreCandidate):boolean{
 if(e.event.sport!=="football"||e.event.status==="finished"||
  !e.canonicalKey.startsWith("football::epl::")||
  e.providerRefs?.["the-odds-api"]!==score.externalId||
  Date.parse(e.event.startsAt)!==Date.parse(score.startsAt)||
  !e.event.home?.name||!e.event.away?.name)return false;
 // The original odds and the final are from the SAME provider fixture id.
 // Team names are an additional integrity check, never a fuzzy join.
 return norm(e.event.home.name)===norm(score.home)&&
  norm(e.event.away.name)===norm(score.away);
}
export function certifyPersistedOddsScore(e:PersistedEvent|null,
 states:PersistedEventStateRecord[],asOf:string):{
 score:{home:number;away:number};capturedAt:string;provider:"the-odds-api"}|null{
 if(!e||e.event.sport!=="football"||e.event.status!=="finished"||
  !e.canonicalKey.startsWith("football::epl::"))return null;
 const owner=e.providerRefs?.["the-odds-api"],kickoff=Date.parse(e.event.startsAt),now=Date.parse(asOf);
 if(!owner||!Number.isFinite(kickoff)||!Number.isFinite(now)||kickoff>now-60*60_000)return null;
 const ft=states.filter(r=>r.eventId===e.id&&r.sourceProvider==="the-odds-api"&&
  r.state.source==="the-odds-api.scores"&&r.state.status==="finished"&&
  r.state.regulationTimeOnly===true&&r.state.providerEventId===owner&&
  Date.parse(r.capturedAt)>=kickoff+60*60_000&&Date.parse(r.capturedAt)<=now&&
  typeof (r.state.score as {home?:unknown}|undefined)?.home==="number"&&
  typeof (r.state.score as {away?:unknown}|undefined)?.away==="number");
 if(!ft.length)return null;
 const scores=new Set(ft.map(x=>JSON.stringify(x.state.score)));
 if(scores.size!==1)return null;
 const latest=[...ft].sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt))[0];
 const s=latest.state.score as {home:number;away:number};
 if(![s.home,s.away].every(v=>Number.isInteger(v)&&v>=0&&v<=40))return null;
 return{score:{home:s.home,away:s.away},capturedAt:latest.capturedAt,provider:"the-odds-api"};
}
export function oddsScoresSelfcheck(){
 const at="2026-10-16T21:00:00Z",id="a".repeat(32);
 const payload={id,sport_key:"soccer_epl",completed:true,
  commence_time:"2026-10-16T18:00:00Z",home_team:"A",away_team:"B",
  scores:[{name:"A",score:"2"},{name:"B",score:"1"}]};
 const good=parseOddsApiScore(payload,at)!;
 const event:PersistedEvent={id:"local",canonicalKey:"football::epl::example",
  providerRefs:{"the-odds-api":id},event:{id:"local",sport:"football",competition:"EPL",
   startsAt:payload.commence_time,status:"scheduled",home:{id:"a",name:"A"},away:{id:"b",name:"B"}}};
 const record:PersistedEventStateRecord={eventId:"local",sourceProvider:"the-odds-api",
  capturedAt:at,state:{source:"the-odds-api.scores",status:"finished",score:good.score,
   regulationTimeOnly:true,providerEventId:id}};
 const settled={...event,event:{...event.event,status:"finished" as const}};
 const checks=[
  {name:"Completed same-provider EPL result permits 90-minute certification",pass:!!good&&matchOddsApiScore(event,good)},
  {name:"False completed status rejected",pass:parseOddsApiScore({...payload,completed:false},at)===null},
  {name:"One team score missing rejected",pass:parseOddsApiScore({...payload,scores:[payload.scores[0]]},at)===null},
  {name:"Unrelated exact provider ID rejected",pass:!matchOddsApiScore({...event,providerRefs:{"the-odds-api":"b".repeat(32)}},good)},
  {name:"Future/unfinished match rejected",pass:parseOddsApiScore({...payload,commence_time:"2026-10-17T22:00:00Z"},at)===null},
  {name:"Different source proof rejected",pass:certifyPersistedOddsScore(settled,[{...record,sourceProvider:"api-football"}],at)===null},
  {name:"Provider-certified EPL FT resolved",pass:certifyPersistedOddsScore(settled,[record],at)?.score.home===2},
  {name:"Conflicting source scores blocked",pass:certifyPersistedOddsScore(settled,[record,{...record,state:{...record.state,score:{home:3,away:1}}}],at)===null},
 ];
 return{passed:checks.every(x=>x.pass),checks};
}
