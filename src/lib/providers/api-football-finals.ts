import type {ApiFootballFixture} from "@/lib/providers/api-football";
import type {PersistedEvent, PersistedEventStateRecord, ProviderHealthSample} from "@/lib/persistence/contracts";

export interface FinishedFixture {
  providerEventId:number;
  startsAt:string;
  score:{home:number;away:number};
}
/** FT = regulation time; AET/PEN excluded to avoid mis-settling 90-min totals. */
export function normalizeFinishedFixture(row:ApiFootballFixture):FinishedFixture|null{
  if(row.fixture?.status?.short!=="FT")return null;
  const id=row.fixture.id,date=row.fixture.date;
  const home=row.goals?.home,away=row.goals?.away;
  if(typeof id!=="number"||!Number.isSafeInteger(id)||id<=0||
    !date||!Number.isFinite(Date.parse(date))||
    typeof home!=="number"||typeof away!=="number"||
    !Number.isInteger(home)||!Number.isInteger(away)||home<0||away<0||home>40||away>40)return null;
  return{providerEventId:id,startsAt:new Date(date).toISOString(),score:{home,away}};
}
export function exactStoredFixtureIndex(events:PersistedEvent[],states:PersistedEventStateRecord[]){
  const eligible=new Map(events.filter(e=>e.event.sport==="football").map(e=>[e.id,e]));
  const index=new Map<number,PersistedEvent>();
  const ambiguous=new Set<number>();
  for(const s of states){
    if(s.sourceProvider!=="api-football")continue;
    const event=eligible.get(s.eventId);
    if(!event)continue;
    const raw=s.state?.providerEventId;
    const id=typeof raw==="number"?raw:typeof raw==="string"&&/^\d+$/.test(raw)?Number(raw):NaN;
    if(!Number.isSafeInteger(id)||id<=0)continue;
    const current=index.get(id);
    if(current&&current.id!==event.id){ambiguous.add(id);index.delete(id);}
    else if(!ambiguous.has(id))index.set(id,event);
  }
  for(const id of ambiguous)index.delete(id);
  return{index,ambiguous:[...ambiguous]};
}

export interface FinalReconciliationTarget{
  event:PersistedEvent;
  providerEventId:number;
  kickoffAgeMinutes:number;
}
/**
 * Reconcile only *previously observed* exact API-Football fixture IDs.
 * API-Football supports up to 20 IDs in one request. We rotate over candidates
 * to avoid permanently starving matches that are beyond the first batch.
 *
 * No team-name fuzzy match, no provider call from this pure function.
 */
export function selectFinalReconciliationTargets(input:{
  events:PersistedEvent[];
  states:PersistedEventStateRecord[];
  asOf:string;
  rotationIndex:number;
  limit?:number;
  minimumKickoffAgeMinutes?:number;
}){
  const now=Date.parse(input.asOf);
  const {index,ambiguous}=exactStoredFixtureIndex(input.events,input.states);
  const minimum=input.minimumKickoffAgeMinutes??100;
  const count=Math.max(1,Math.min(20,Math.floor(input.limit??20)));
  const candidates:FinalReconciliationTarget[]=[];
  if(Number.isFinite(now)){
    for(const [id,event] of index){
      const kickoff=Date.parse(event.event.startsAt);
      if(!Number.isFinite(kickoff)||event.event.status!=="live")continue;
      const age=(now-kickoff)/60000;
      if(age<minimum||age>72*60)continue;
      candidates.push({event,providerEventId:id,kickoffAgeMinutes:Math.floor(age)});
    }
  }
  candidates.sort((a,b)=>a.providerEventId-b.providerEventId);
  const rotation=Math.max(0,Math.floor(input.rotationIndex));
  const offset=candidates.length?(rotation*count)%candidates.length:0;
  const ordered=[...candidates.slice(offset),...candidates.slice(0,offset)];
  return{
    targets:ordered.slice(0,count),
    eligibleCandidates:candidates.length,
    ambiguousFixtureIds:ambiguous.length,
    rotationOffset:offset,
    maximumIdsPerRequest:20,
  };
}

/** API-Football commonly sends application-level failures as HTTP 200
 * with an errors object. Never log or persist error values: they may contain
 * provider-sensitive details. Classify keys only, strictly allowlisted. */
export type FixtureProviderFailure=
 "UPSTREAM_DAILY_QUOTA"|"UPSTREAM_MINUTE_QUOTA"|
 "UPSTREAM_SUBSCRIPTION"|"UPSTREAM_AUTH"|
 "UPSTREAM_INVALID_PARAMETERS"|"UPSTREAM_UNCLASSIFIED";
export function classifyFixtureProviderFailure(errors:unknown):FixtureProviderFailure|null {
 if(errors===null||errors===undefined)return null;
 if(Array.isArray(errors))return errors.length?"UPSTREAM_UNCLASSIFIED":null;
 if(typeof errors!=="object")return errors?"UPSTREAM_UNCLASSIFIED":null;
 const names=Object.keys(errors).map(x=>x.toLowerCase().replace(/[^a-z]/g,""));
 if(!names.length)return null;
 if(names.some(k=>/requests|requestlimit|dailyquota|dailylimit|quota/.test(k)))
  return "UPSTREAM_DAILY_QUOTA";
 if(names.some(k=>/ratelimit|toomany|minutelimit|throttl/.test(k)))
  return "UPSTREAM_MINUTE_QUOTA";
 if(names.some(k=>/plan|subscription|access|season/.test(k)))
  return "UPSTREAM_SUBSCRIPTION";
 if(names.some(k=>/token|auth|key|credential/.test(k)))
  return "UPSTREAM_AUTH";
 if(names.some(k=>/parameter|fixture|ids|invalid|format/.test(k)))
  return "UPSTREAM_INVALID_PARAMETERS";
 return "UPSTREAM_UNCLASSIFIED";
}

/**
 * Avoid wasting requests on a plan that already rejected the same operation.
 * One scheduled probe per 24 hours still detects an account upgrade.
 */
export function subscriptionPollGate(input:{last:ProviderHealthSample|null;asOf:string}):
 {allowed:boolean;reason:"RETRY"|"SUBSCRIPTION_COOLDOWN";nextProbeAt:string|null}{
 const row=input.last,now=Date.parse(input.asOf);
 const failure=row?.metadata?.failureCode;
 const lastAt=row?Date.parse(row.checkedAt):NaN;
 if(row?.providerId!=="api-football-finals"||row.status!=="degraded"||
  failure!=="UPSTREAM_SUBSCRIPTION"||!Number.isFinite(now)||
  !Number.isFinite(lastAt)||lastAt>now){
  return{allowed:true,reason:"RETRY",nextProbeAt:null};
 }
 const next=lastAt+24*3600000;
 return now<next?{allowed:false,reason:"SUBSCRIPTION_COOLDOWN",
  nextProbeAt:new Date(next).toISOString()}:{allowed:true,reason:"RETRY",nextProbeAt:null};
}

export function finalResultBackfillSelfcheck(){
  const fixture:ApiFootballFixture={fixture:{id:10,date:"2026-10-13T09:00:00Z",status:{short:"FT"}},
    goals:{home:2,away:1}};
  const event:PersistedEvent={id:"id",canonicalKey:"stable",event:{id:"id",sport:"football",competition:"Test",startsAt:"2026-10-13T09:00:00Z",status:"live"}};
  const state:PersistedEventStateRecord={eventId:"id",sourceProvider:"api-football",capturedAt:"2026-10-13T10:00:00Z",
    state:{providerEventId:10,status:"live",score:{home:1,away:1},clock:"80′"}};
  const valid=normalizeFinishedFixture(fixture);
  const selectionTime="2026-10-13T14:30:00Z";
  const sel=(events:PersistedEvent[],states:PersistedEventStateRecord[],rotationIndex=0)=>
    selectFinalReconciliationTargets({events,states,asOf:selectionTime,rotationIndex});
  const many=Array.from({length:30},(_,i)=>({...event,id:"ev-"+i,canonicalKey:"k-"+i,
    event:{...event.event,id:"ev-"+i,startsAt:"2026-10-13T09:00:00Z"}}));
  const manyStates=many.map((e,i)=>({...state,eventId:e.id,state:{...state.state,providerEventId:i+100}}));
  const first=sel(many,manyStates,0);
  const second=sel(many,manyStates,1);
  const authError:ProviderHealthSample={providerId:"api-football-finals",status:"degraded",
   checkedAt:"2026-10-13T22:00:00Z",metadata:{failureCode:"UPSTREAM_SUBSCRIPTION"}};
  const cooldown=subscriptionPollGate({last:authError,asOf:"2026-10-14T01:00:00Z"});
  const retry=subscriptionPollGate({last:authError,asOf:"2026-10-14T22:00:00Z"});
  const checks=[
    {name:"Denied plan is not polled repeatedly each 4h",passed:
     !cooldown.allowed&&cooldown.reason==="SUBSCRIPTION_COOLDOWN"&&cooldown.nextProbeAt==="2026-10-14T22:00:00.000Z"},
    {name:"After cooldown source rechecks whether subscription changed",passed:retry.allowed},
    {name:"Healthy or missing provider status never blocks source polling",
     passed:subscriptionPollGate({last:{...authError,status:"healthy"},asOf:"2026-10-14T01:00:00Z"}).allowed&&
      subscriptionPollGate({last:null,asOf:"2026-10-14T01:00:00Z"}).allowed},

    {name:"HTTP-200 daily quota is not interpreted as a successful empty fixture list",
      passed:classifyFixtureProviderFailure({requests:"Sensitive provider body"})==="UPSTREAM_DAILY_QUOTA"},
    {name:"Subscription restrictions are classified without extracting content",
      passed:classifyFixtureProviderFailure({plan:"Private subscription value"})==="UPSTREAM_SUBSCRIPTION"},
    {name:"Invalid IDs are distinguished from quota restrictions",
      passed:classifyFixtureProviderFailure({parameters:"Sensitive parameter list"})==="UPSTREAM_INVALID_PARAMETERS"},
    {name:"Empty upstream error objects are accepted",
      passed:classifyFixtureProviderFailure({})===null&&classifyFixtureProviderFailure([])===null},
    {name:"Provider authentication classified without exposing token",
      passed:classifyFixtureProviderFailure({token:"PRIVATE_TOKEN"})==="UPSTREAM_AUTH"},
    {name:"Unknown error response fails closed",
      passed:classifyFixtureProviderFailure({unexpected:"SECRET"})==="UPSTREAM_UNCLASSIFIED"},

    {name:"FT returns real final score",passed:valid?.score.home===2&&valid?.score.away===1},
    {name:"Never treat AET as regulation-time score",passed:normalizeFinishedFixture({...fixture,fixture:{...fixture.fixture,status:{short:"AET"}}})===null},
    {name:"Never treat live as final",passed:normalizeFinishedFixture({...fixture,fixture:{...fixture.fixture,status:{short:"2H"}}})===null},
    {name:"Missing goals excluded",passed:normalizeFinishedFixture({...fixture,goals:{home:2,away:null}})===null},
    {name:"Exact provider fixture ID only",passed:exactStoredFixtureIndex([event],[state]).index.get(10)?.id==="id"},
    {name:"Reject different-provider ID collision",passed:exactStoredFixtureIndex([event],[{...state,sourceProvider:"sportmonks"}]).index.size===0},
    {name:"Duplicate provider IDs on different canonical events rejected",passed:exactStoredFixtureIndex([event,{...event,id:"other",canonicalKey:"other"}],[state,{...state,eventId:"other"}]).index.size===0},
    {name:"Targeted lookup takes only observed IDs",passed:sel([event],[state]).targets[0]?.providerEventId===10},
    {name:"Do not spend quota on a match before realistic final whistle",passed:sel([{...event,event:{...event.event,startsAt:"2026-10-13T14:00:00Z"}}],[state]).targets.length===0},
    {name:"Exclude already settled matches",passed:sel([{...event,event:{...event.event,status:"finished"}}],[state]).targets.length===0},
    {name:"Never query more than 20 fixture ids",passed:first.targets.length===20&&first.maximumIdsPerRequest===20},
    {name:"Rotate targets fairly for unverified historic fixtures",passed:second.targets.length===20&&first.targets[0].providerEventId!==second.targets[0].providerEventId&&new Set([...first.targets,...second.targets].map(t=>t.providerEventId)).size===30},
    {name:"Unknown or ambiguous exact fixture ids are rejected",passed:sel([event,{...event,id:"other"}],[state,{...state,eventId:"other"}]).targets.length===0},

  ];
  return{passed:checks.every(x=>x.passed),checks};
}
