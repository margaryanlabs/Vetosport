import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {SCORE_ONLY_MODEL_VERSION} from "@/lib/live/score-only-shadow";
import type {PersistedEventStateRecord,PersistedPredictionSnapshotRecord} from "@/lib/persistence/contracts";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
const MAX_SNAPSHOT_AGE_MS=40*60_000;

/**
 * Real persisted shadow model forecasts, NOT approved VETO betting decisions.
 * Bounded, read-only, zero upstream sportsbook/sports-provider requests.
 * Old / demo / finished / unaudited model snapshots fail closed.
 */
export async function GET(){
 const now=Date.now(),asOf=new Date(now).toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:false,source:"NO_REAL_STORAGE",asOf,rows:[],
   externalProviderCalls:0,decisionAuthority:false},{headers,status:503});
 try{
  const store=getPersistence();
  const events=(await store.listRecentEvents({
   from:new Date(now-4*3600_000).toISOString(),
   to:new Date(now+15*60_000).toISOString(),
   statuses:["live"],limit:100,
  })).filter(event=>event.event.sport==="football"&&event.event.status==="live"&&
   !isSelfcheckEvent(event)&&Date.parse(event.event.startsAt)<=now)
   .sort((a,b)=>Date.parse(b.event.startsAt)-Date.parse(a.event.startsAt))
   .slice(0,16);
  if(!events.length)return NextResponse.json({ok:true,source:"PERSISTED_ONLY",asOf,rows:[],
   eventsScanned:0,externalProviderCalls:0,decisionAuthority:false},{headers});
  const ids=events.map(event=>event.id);
  const [states,predictions]=await Promise.all([
   store.listRecentEventStates({eventIds:ids,limit:650}),
   store.listRecentPredictionsForEvents({eventIds:ids,limit:1200}),
  ]);
  // Do not infer a "current" live signal from a day-old model snapshot.
  const recentStates=new Map<string,PersistedEventStateRecord>();
  for(const state of states){
   const at=Date.parse(state.capturedAt);
   if(state.sourceProvider!=="api-football"||state.state.status!=="live"||
    !Number.isFinite(at)||at>now||now-at>MAX_SNAPSHOT_AGE_MS)continue;
   const earlier=recentStates.get(state.eventId);
   if(!earlier||Date.parse(earlier.capturedAt)<at)recentStates.set(state.eventId,state);
  }
  const validPrediction=(prediction:PersistedPredictionSnapshotRecord)=>{
   const at=Date.parse(prediction.capturedAt),state=recentStates.get(prediction.eventId);
   if(!state||!Number.isFinite(at)||at>now||now-at>MAX_SNAPSHOT_AGE_MS||
    at!==Date.parse(state.capturedAt)||
    !Number.isFinite(prediction.fairProbability)||
    prediction.fairProbability<=0||prediction.fairProbability>=1||
    !Number.isFinite(prediction.fairOdds)||prediction.fairOdds<=1)return false;
   return Array.isArray(prediction.modelSignals)&&prediction.modelSignals.some(value=>{
    if(!value||typeof value!=="object"||Array.isArray(value))return false;
    const signal=value as Record<string,unknown>;
    return signal.mode==="SHADOW"&&typeof signal.version==="string"&&
     signal.version.length>0&&signal.version.length<100;
   });
  };
  const eventMap=new Map(events.map(event=>[event.id,event]));
  const dedup=new Map<string,PersistedPredictionSnapshotRecord>();
  for(const p of predictions.filter(validPrediction).sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt))){
   const version=p.modelSignals.find(x=>x&&typeof x==="object"&&!Array.isArray(x)&&
    (x as {mode?:unknown}).mode==="SHADOW") as {version?:string}|undefined;
   const key=p.eventId+"|"+version?.version+"|"+p.marketKey+"|"+p.selectionKey;
   if(!dedup.has(key))dedup.set(key,p);
  }
  // Visible preview is one coherent 1X2 trio per fixture, not 14
  // selections from the same heavily sampled football match.
  const perFixture=new Map<string,number>();
  const selected=[...dedup.values()].filter(p=>{
   if(p.marketKey!=="football.1x2"||
    !["home","draw","away"].includes(p.selectionKey))return false;
   const n=perFixture.get(p.eventId)??0;
   if(n>=3)return false;
   perFixture.set(p.eventId,n+1);
   return true;
  });
  const rows=selected.slice(0,45).flatMap(p=>{
   const event=eventMap.get(p.eventId),state=recentStates.get(p.eventId);
   if(!event||!state)return[];
   const model=p.modelSignals.find(s=>s&&typeof s==="object"&&!Array.isArray(s)&&
    (s as {mode?:unknown}).mode==="SHADOW") as {version?:string}|undefined;
   return [{
    id:p.id,eventId:event.id,competition:event.event.competition,
    match:(event.event.home?.name||"Хозяева")+" — "+(event.event.away?.name||"Гости"),
    marketKey:p.marketKey,selectionKey:p.selectionKey,
    modelProbability:p.fairProbability,modelFairOdds:p.fairOdds,
    modelVersion:model?.version??"SHADOW",
    modelBasis:model?.version===SCORE_ONLY_MODEL_VERSION?
     "FIXED_UNCALIBRATED_GOAL_PRIORS":"SOURCE_ALIGNED_QUOTE_RESEARCH",
    bookmakerQuoteRequired:model?.version!==SCORE_ONLY_MODEL_VERSION,
    independentCalibrationVerified:false,
    predictionAt:p.capturedAt,stateAt:state.capturedAt,
    kickoffAt:event.event.startsAt,
    modelAgreement:p.modelAgreement,uncertainty:p.uncertainty,
    stage:"UNVALIDATED_SHADOW_FORECAST" as const,
    executableBookmakerPriceVerified:false,betPlaced:false,
   }];
  });
  return NextResponse.json({ok:true,source:"PERSISTED_ONLY",asOf,rows,
   eventsScanned:events.length,externalProviderCalls:0,decisionAuthority:false,
   note:"Research-only forward model snapshots from real observed game states. Score-only branch uses FIXED, uncalibrated 1.35/1.15 goal assumptions: not actual team strengths or proven betting value."},{headers});
 }catch{
  return NextResponse.json({ok:false,source:"READ_ERROR",asOf,rows:[],
   externalProviderCalls:0,decisionAuthority:false},{headers,status:503});
 }
}
