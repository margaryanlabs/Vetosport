import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {validateForwardShadowForecasts} from "@/lib/research/forecast-validation";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import type {PersistedEventStateRecord,PersistedPredictionSnapshotRecord} from "@/lib/persistence/contracts";
export const dynamic="force-dynamic";
export const maxDuration=60;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Observational forecast validation only: bounded history, no provider calls or bets. */
export async function GET(){
 const now=Date.now(),asOf=new Date(now).toISOString();
 if(!persistenceConfiguration().supabaseConfigured){
  return NextResponse.json({ok:false,source:"NO_REAL_STORAGE",asOf,
   reason:"SPORT_PERSISTENCE_DISABLED",externalProviderCalls:0,
   profitableStrategyVerified:false},{status:503,headers});
 }
 try{
  const store=getPersistence(),DAY=86400_000,windowDays=7;
  const windows=await Promise.all(Array.from({length:windowDays},(_,i)=>
   store.listRecentEvents({
    from:new Date(now-(i+1)*DAY).toISOString(),
    to:new Date(now-i*DAY).toISOString(),
    statuses:["finished"],limit:100})));
  const dedup=[...new Map(windows.flat().filter(e=>e.event.sport==="football"&&
   !isSelfcheckEvent(e)).map(e=>[e.id,e])).values()]
   .sort((a,b)=>Date.parse(b.event.startsAt)-Date.parse(a.event.startsAt));
  const maxEvents=120,events=dedup.slice(0,maxEvents);
  let states:PersistedEventStateRecord[]=[],predictions:PersistedPredictionSnapshotRecord[]=[];
  let sampleMayBeCapped=false;
  const chunks=Array.from({length:Math.ceil(events.length/12)},(_,i)=>
   events.slice(i*12,(i+1)*12).map(e=>e.id));
  // Limit concurrent storage-bridge traffic; preserve errors instead of silent
  // empty 'validations'. One history read cannot spend sportsbook API quota.
  for(let i=0;i<chunks.length;i+=3){
   const batch=await Promise.all(chunks.slice(i,i+3).map(async eventIds=>{
    const [s,p]=await Promise.all([
     store.listRecentEventStates({eventIds,limit:900}),
     store.listRecentPredictionsForEvents({eventIds,limit:1200}),
    ]);
    return{s,p};
   }));
   for(const part of batch){
    states.push(...part.s);predictions.push(...part.p);
    if(part.s.length>=900||part.p.length>=1200)sampleMayBeCapped=true;
   }
  }
  const scanMayBeCapped=dedup.length>maxEvents||windows.some(w=>w.length>=100);
  const validation=validateForwardShadowForecasts({events,states,predictions,
   asOf,lookbackDays:windowDays,scanMayBeCapped,sampleMayBeCapped});
  return NextResponse.json({...validation,ok:true,externalProviderCalls:0,
   realMoneyBets:0,automaticBettingEnabled:false,
   readOnly:true,modelEvaluation:{sampleSelection:"EARLIEST_ELIGIBLE_SNAPSHOT_PER_FIXTURE_AND_MODEL_VERSION",
    partition:"CHRONOLOGICAL_70_30",holdoutIsOutOfSample:true,
    validatedPredictiveEdge:false,profitabilityVerified:false}}, {headers});
 }catch{
  return NextResponse.json({ok:false,source:"READ_ERROR",asOf,
   reason:"FORECAST_HISTORY_UNAVAILABLE",externalProviderCalls:0,
   profitableStrategyVerified:false},{headers,status:503});
 }
}
