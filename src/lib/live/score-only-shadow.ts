/**
 * VETO score-only forward SHADOW model.
 *
 * A bookmaker quote is NOT a prerequisite for a model forecast: the model
 * reads only observed API-Football score/clock + an EXPLICIT, versioned,
 * UNCALIBRATED prior, then persists the result before full time.
 *
 * 1.35 / 1.15 goal priors are generic assumptions, not team-level facts;
 * never describe this lane as independent team-strength evidence or +EV.
 * This engine never consults quote-derived probabilities, approves a
 * decision, submits a bet or spends a sports provider request.
 */
import type {PersistedEvent,PersistedEventStateRecord} from "@/lib/persistence/contracts";
import type {FootballLiveInputs} from "@/lib/models/football/types";
import {buildFootballProbabilitySurface} from "@/lib/models/football/surface";
import {observedFootballState} from "@/lib/research/auto-discovery";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {getPersistence} from "@/lib/persistence/factory";

export const SCORE_ONLY_FEATURE_VERSION="football.score-clock-prior-input.v1";
export const SCORE_ONLY_MODEL_VERSION="football.score-clock-prior.v1";
export const SPORTMONKS_SCORE_MODEL_VERSION="football.score-clock-prior.sportmonks.v1";
export const SPORTMONKS_SCORE_FEATURE_VERSION="football.score-clock-prior-input.sportmonks.v1";
export const SCORE_ONLY_PRIOR={home:1.35,away:1.15} as const;
const MAX_STATE_AGE_MS=38*60_000;
const MAX_KICKOFF_AGE_MS=125*60_000;
const fixedTargets=new Set([
 "football.1x2::home","football.1x2::draw","football.1x2::away",
 "football.total_goals::under-2.5","football.total_goals::under-3.5",
 "football.total_goals::over-2.5","football.btts::yes",
]);

export type ScoreOnlyBlock="NO_SOURCE_STATE"|"STALE_SOURCE_STATE"|
 "UNTRUSTED_FIXTURE_ID"|"FIXTURE_NOT_LIVE"|"SCORE_CLOCK_INVALID"|
 "KICKOFF_OUT_OF_WINDOW"|"NONREGULATION_PERIOD"|"PROVIDER_STATE_MISMATCH";
export interface ScoreOnlyPlan{
 eventId:string;capturedAt:string;featureVersion:typeof SCORE_ONLY_FEATURE_VERSION|typeof SPORTMONKS_SCORE_FEATURE_VERSION;
 modelVersion:typeof SCORE_ONLY_MODEL_VERSION|typeof SPORTMONKS_SCORE_MODEL_VERSION;
 assumption:"FIXED_GOAL_PRIORS_NOT_TEAM_CALIBRATED";
 featureInputs:Record<string,unknown>;
 selections:Array<{marketKey:string;selectionKey:string;probability:number;fairOdds:number}>;
 bookmakerPriceVerified:false;sourceEmissionTimeVerified:false;
 forwardResearchOnly:true;independentCalibrationVerified:false;decisionWrites:0;
}
const timestamp=(value:string|undefined)=>Date.parse(value??"");
function relevantObservedState(event:PersistedEvent,state:PersistedEventStateRecord|undefined,asOf:string):
 {input:FootballLiveInputs;observedAt:string;sourceId:string}|ScoreOnlyBlock {
 if(!state)return "NO_SOURCE_STATE";
 const now=timestamp(asOf),observed=timestamp(state.capturedAt);
 const kickoff=timestamp(event.event.startsAt);
 if(!Number.isFinite(now)||!Number.isFinite(kickoff)||
   kickoff>now||now-kickoff>MAX_KICKOFF_AGE_MS)return "KICKOFF_OUT_OF_WINDOW";
 if(event.event.sport!=="football"||event.event.status!=="live"||isSelfcheckEvent(event))
  return "FIXTURE_NOT_LIVE";
 const sourceIsKnown=state.sourceProvider==="api-football"?
   state.state.source==="api-football.fixtures.live":
   state.sourceProvider==="sportmonks-football"?
   state.state.source==="sportmonks.livescores":false;
 if(state.eventId!==event.id||!sourceIsKnown||state.state.status!=="live")
  return "PROVIDER_STATE_MISMATCH";
 if(!Number.isFinite(observed)||observed>now||now-observed>MAX_STATE_AGE_MS||
  observed<kickoff)return "STALE_SOURCE_STATE";
 const providerRef=event.providerRefs?.[state.sourceProvider],stateId=state.state.providerEventId;
 if(typeof providerRef!=="string"||!/^[1-9]\d{0,11}$/.test(providerRef)||
  (typeof stateId!=="string"&&typeof stateId!=="number")||
  String(stateId)!==providerRef)return "UNTRUSTED_FIXTURE_ID";
 const period=state.state.period;
 if(period!=="1H"&&period!=="HT"&&period!=="2H")return "NONREGULATION_PERIOD";
 const observedScore=observedFootballState(state.state);
 if(!observedScore||!Number.isInteger(observedScore.minute)||
  observedScore.minute<0||observedScore.minute>89||
  observedScore.score.home>12||observedScore.score.away>12)return "SCORE_CLOCK_INVALID";
 // Strict validation rather than deriving "real" player or team xG data
 // from an undocumented endpoint. The existing model's fallback prior is
 // exposed as an explicit assumption and versioned for later calibration.
 return {
  input:{scoreHome:observedScore.score.home,scoreAway:observedScore.score.away,
   elapsedMinutes:observedScore.minute,
   prematchExpectedHomeGoals:SCORE_ONLY_PRIOR.home,
   prematchExpectedAwayGoals:SCORE_ONLY_PRIOR.away},
  observedAt:state.capturedAt,sourceId:providerRef,
 };
}
export function buildScoreOnlyShadowPlan(input:{
 event:PersistedEvent;state:PersistedEventStateRecord|undefined;asOf:string;
}):{ok:true;plan:ScoreOnlyPlan}|{ok:false;reason:ScoreOnlyBlock}{
 const observed=relevantObservedState(input.event,input.state,input.asOf);
 if(typeof observed==="string")return {ok:false,reason:observed};
 const surface=buildFootballProbabilitySurface(observed.input);
 const selections=surface.markets.filter(m=>
  fixedTargets.has(m.marketId+"::"+m.selectionId)&&
  Number.isFinite(m.probability)&&m.probability>0&&m.probability<1&&
  Number.isFinite(m.fairOdds)&&m.fairOdds>1
 ).map(m=>({marketKey:m.marketId,selectionKey:m.selectionId,
   probability:m.probability,fairOdds:m.fairOdds}));
 // Three 1X2 branches form a complete, properly normalized event space.
 const trio=selections.filter(m=>m.marketKey==="football.1x2");
 const sum=trio.reduce((n,m)=>n+m.probability,0);
 if(trio.length!==3||Math.abs(sum-1)>0.00001)
   return{ok:false,reason:"SCORE_CLOCK_INVALID"};
 const {event,state}=input;
 return {ok:true,plan:{
  eventId:event.id,capturedAt:observed.observedAt,
  featureVersion:state?.sourceProvider==="sportmonks-football"?
   SPORTMONKS_SCORE_FEATURE_VERSION:SCORE_ONLY_FEATURE_VERSION,
  modelVersion:state?.sourceProvider==="sportmonks-football"?
   SPORTMONKS_SCORE_MODEL_VERSION:SCORE_ONLY_MODEL_VERSION,
  assumption:"FIXED_GOAL_PRIORS_NOT_TEAM_CALIBRATED",
  featureInputs:{
   scoreHome:observed.input.scoreHome,scoreAway:observed.input.scoreAway,
   elapsedSeconds:observed.input.elapsedMinutes*60,
   prematchExpectedHomeGoals:SCORE_ONLY_PRIOR.home,
   prematchExpectedAwayGoals:SCORE_ONLY_PRIOR.away,
   goalPriorBasis:"UNVALIDATED_FIXED_HEURISTIC",
   quoteFeaturesUsed:false,teamStrengthFeaturesUsed:false,
   stateSource:state?.sourceProvider??"UNRECOGNIZED",
   stateKind:state?.state.source??"UNRECOGNIZED",
   providerEventId:observed.sourceId,
   sourceCapturedAt:observed.observedAt,sourceEmissionTimeVerified:false,
   sourceFingerprint:state?.fingerprint??null,
  },
  selections,bookmakerPriceVerified:false,sourceEmissionTimeVerified:false,
  forwardResearchOnly:true,independentCalibrationVerified:false,decisionWrites:0,
 }};
}
export async function runScoreOnlyShadowPrediction(eventId:string,at=new Date().toISOString()){
 const store=getPersistence();
 const event=await store.getEventById(eventId);
 if(!event)return{ok:true,skipped:true,reason:"EVENT_NOT_FOUND",eventId};
 const states=await store.listRecentEventStates({eventIds:[eventId],limit:80});
 const state=states.filter(s=>
   s.sourceProvider==="api-football"&&s.state.source==="api-football.fixtures.live"||
   s.sourceProvider==="sportmonks-football"&&s.state.source==="sportmonks.livescores")
   .filter(s=>s.state.status==="live")
   .sort((a,b)=>timestamp(b.capturedAt)-timestamp(a.capturedAt))[0];
 // A late independently recorded final disqualifies any new forward snapshot.
 if(states.some(s=>s.state.status==="finished"&&
  timestamp(s.capturedAt)<=timestamp(at)))
  return{ok:true,skipped:true,reason:"FINISHED_CERTIFICATE_PRESENT",eventId};
 const result=buildScoreOnlyShadowPlan({event,state,asOf:at});
 if(!result.ok)return{ok:true,skipped:true,reason:result.reason,eventId};
 const plan=result.plan;
 const existing=await store.findFeatureSnapshot({eventId,
  version:plan.featureVersion,capturedAt:plan.capturedAt});
 if(existing)return{ok:true,skipped:true,reason:"SNAPSHOT_ALREADY_WRITTEN",eventId};
 const featureSnapshotId=await store.appendFeatureSnapshot({
  eventId,version:plan.featureVersion,features:plan.featureInputs,
  capturedAt:plan.capturedAt,
 });
 let predictionsPersisted=0;
 for(const pick of plan.selections){
  await store.appendPrediction({eventId,featureSnapshotId,
   marketKey:pick.marketKey,selectionKey:pick.selectionKey,
   fairProbability:pick.probability,fairOdds:pick.fairOdds,
   modelAgreement:0,uncertainty:1,capturedAt:plan.capturedAt,
   modelSignals:[{
    modelId:plan.modelVersion===SPORTMONKS_SCORE_MODEL_VERSION?
     "football.score-clock-prior.sportmonks":"football.score-clock-prior",
    version:plan.modelVersion,
    generatedAt:plan.capturedAt,mode:"SHADOW",
    probability:pick.probability,weight:1,confidence:0,
    basis:"FIXED_GOAL_PRIORS_NOT_TEAM_CALIBRATED",
    bookmakerPriceVerified:false,
    note:"Uncalibrated score+clock research heuristic, 1.35/1.15 assumed goal priors. Not a betting signal.",
   }],
  });
  predictionsPersisted++;
 }
 return{ok:true,skipped:false,eventId,predictionsPersisted,
  modelVersion:plan.modelVersion,bookmakerPriceVerified:false,
  calibrated:false,decisionWrites:0};
}
/** Deterministic pure checks: no network/provider or persistence writes. */
export function scoreOnlyShadowSelfcheck(){
 const at="2026-10-18T15:00:00Z";
 const event:PersistedEvent={id:"fixture",canonicalKey:"football::epl::fixture",
  providerRefs:{"api-football":"123456"},event:{
   id:"123456",sport:"football",competition:"EPL",status:"live",
   startsAt:"2026-10-18T14:00:00Z",
   home:{id:"home",name:"Home"},away:{id:"away",name:"Away"}}};
 const state:PersistedEventStateRecord={eventId:"fixture",
  sourceProvider:"api-football",capturedAt:"2026-10-18T14:59:00Z",
  state:{status:"live",period:"2H",source:"api-football.fixtures.live",
   providerEventId:123456,score:{home:1,away:0},clock:"59′",
   elapsedSeconds:59*60,providerSnapshotTimeUnknown:true}};
 const good=buildScoreOnlyShadowPlan({event,state,asOf:at});
 const run=(s=state,e=event,t=at)=>buildScoreOnlyShadowPlan({event:e,state:s,asOf:t});
 const checks=[
  {name:"Real observed score/clock yields forward-only uncalibrated football probabilities, no odds",
   pass:good.ok&&good.plan.selections.length>=3&&
    good.plan.selections.filter(s=>s.marketKey==="football.1x2")
     .reduce((a,s)=>a+s.probability,0)>.999&&good.plan.bookmakerPriceVerified===false},
  {name:"No stored bookmaker prices or invented team strength needed",
   pass:good.ok&&good.plan.featureInputs.quoteFeaturesUsed===false&&
    good.plan.featureInputs.goalPriorBasis==="UNVALIDATED_FIXED_HEURISTIC"},
  {name:"Stale live score cannot masquerade as a forward prediction",
   pass:run({...state,capturedAt:"2026-10-18T14:00:01Z"}).ok===false},
  {name:"Future or cross-provider state does not produce probabilities",
   pass:run({...state,capturedAt:"2026-10-18T15:00:05Z"}).ok===false&&
    run({...state,sourceProvider:"the-odds-api"}).ok===false},
  {name:"No exact source ID means no trusted source-only forecast",
   pass:run(state,{...event,providerRefs:undefined}).ok===false},
  {name:"Wrong fixture ID cannot authorize same score",
   pass:run({...state,state:{...state.state,providerEventId:999}}).ok===false},
  {name:"Finished fixture cannot be a new live research target",
   pass:run(state,{...event,event:{...event.event,status:"finished"}}).ok===false},
  {name:"No football regulation clock means no model score",
   pass:run({...state,state:{...state.state,period:"PEN"}}).ok===false},
  {name:"No real observed score means no fake model state",
   pass:run({...state,state:{...state.state,score:undefined}}).ok===false},
  {name:"Late lingering LIVE label after two hours cannot authorize a fresh forecast",
   pass:run({...state,capturedAt:"2026-10-18T16:13:00Z"},event,"2026-10-18T16:14:00Z").ok===false},
  {name:"Sportmonks exact-ID genuine period/score accepts second source, separate immutable model version",
   pass:(()=>{
     const ev={...event,providerRefs:{"sportmonks-football":"123456"}};
     const s={...state,sourceProvider:"sportmonks-football",
      state:{...state.state,source:"sportmonks.livescores"}};
     const x=run(s,ev);
     return x.ok&&x.plan.modelVersion===SPORTMONKS_SCORE_MODEL_VERSION&&
      x.plan.featureInputs.stateSource==="sportmonks-football";
   })()},
  {name:"No fuzzy cross-source fixture ID permitted for Sportmonks observations",
   pass:(()=>{
     const s={...state,sourceProvider:"sportmonks-football",
      state:{...state.state,source:"sportmonks.livescores"}};
     return run(s,event).ok===false;
   })()},
  {name:"Source timestamp unverified explicitly and no betting decision writes",
   pass:good.ok&&good.plan.sourceEmissionTimeVerified===false&&good.plan.decisionWrites===0},
 ];
 return{passed:checks.every(x=>x.pass),checks};
}
