import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {fetchBundesligaSeason,OPENLIGADB_MODEL} from "@/lib/providers/openligadb";
import {buildBundesligaPrematchForecasts} from "@/lib/research/bundesliga-prematch";
import {canonicalEventKey} from "@/lib/canonical/id";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
export const dynamic="force-dynamic";
export const maxDuration=60;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
export async function GET(req:Request){
 if(!process.env.CRON_SECRET||req.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET)
  return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 const asOf=new Date().toISOString(),year=new Date(asOf).getUTCFullYear(),
  season=new Date(asOf).getUTCMonth()>=6?year:year-1;
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:false,reason:"PERSISTENCE_UNAVAILABLE",
   externalBookmakerCalls:0},{status:503,headers});
 const store=getPersistence();
 try{
  // Two COMMUNITY data reads, twice daily; no sportsbook credits or API key.
  // Prior year + current year supply real team history for promoted/established
  // German Bundesliga teams. This is NOT an in-play clock/feed.
  const [prior,current]=await Promise.all([
   fetchBundesligaSeason(season-1),fetchBundesligaSeason(season)]);
  const proposed=buildBundesligaPrematchForecasts({prior,current,asOf,maxResults:20});
  const digest=createHash("sha256").update(JSON.stringify(
   [...prior,...current].map(x=>[x.id,x.season,x.startsAt,x.final]))).digest("hex");
  let stored=0,skipped=0;
  const reasons:Record<string,number>={};
  const note=(key:string)=>{reasons[key]=(reasons[key]??0)+1;skipped++};
  for(const f of proposed){
   try{
    const kickoff=Date.parse(f.startsAt);
    const now=Date.now();
    if(!Number.isFinite(kickoff)||now>=kickoff-30*60000){
      note("NOT_PROSPECTIVE");continue;
    }
    const event={
     id:String(f.id),sport:"football" as const,
     competition:"Bundesliga · Germany",startsAt:f.startsAt,
     status:"scheduled" as const,
     home:{id:String(f.homeId),name:f.home},
     away:{id:String(f.awayId),name:f.away},
    };
    const key=canonicalEventKey({sport:event.sport,competition:event.competition,
     startsAt:event.startsAt,home:event.home.name,away:event.away.name});
    const saved=await store.upsertEvent(event,key,{
     provider:"openligadb-community",id:String(f.id)});
    const predictions=await store.listRecentPredictionsForEvents({
     eventIds:[saved.id],limit:150});
    if(predictions.length>=150){note("PREDICTION_HISTORY_CAPPED");continue;}
    const already=predictions.some(p=>
     p.modelSignals.some(s=>s&&typeof s==="object"&&!Array.isArray(s)&&
      (s as {version?:string}).version===OPENLIGADB_MODEL)&&
     Date.parse(p.capturedAt)>=now-20*3600_000);
    if(already){note("ALREADY_RECORDED_TODAY");continue;}
    const capturedAt=new Date().toISOString();
    const existing=await store.findFeatureSnapshot({
     eventId:saved.id,version:f.featureVersion,capturedAt});
    if(existing){note("ALREADY_SNAPSHOT");continue;}
    const featureSnapshotId=await store.appendFeatureSnapshot({
     eventId:saved.id,version:f.featureVersion,capturedAt,
     features:{modelVersion:f.modelVersion,historyChecksumSha256:digest,
      training:f.training,teamSamples:f.teamSamples,
      estimatedGoals:f.estimatedGoals,homeProviderTeamId:f.homeId,
      awayProviderTeamId:f.awayId,source:"openligadb-community",
      exactProviderMatchId:f.id,teamNamesSource:"OpenLigaDB",
      gameClockPresent:false,bookmakerInputUsed:false,
      bookmakerPriceVerified:false,independentFtCertification:false,
      dataLicense:"ODbL",originalSource:"https://www.openligadb.de/",
      trainingSeasons:[season-1,season]},
    });
    for(const selection of ["home","draw","away"] as const){
     const p=f.probabilities[selection];
     await store.appendPrediction({
      eventId:saved.id,featureSnapshotId,
      marketKey:"football.1x2",selectionKey:selection,
      fairProbability:p,fairOdds:1/p,modelAgreement:0,
      uncertainty:1,capturedAt,
      modelSignals:[{modelId:"football.bundesliga.team-poisson",
       version:OPENLIGADB_MODEL,mode:"SHADOW_PREMATCH",
       generatedAt:capturedAt,probability:p,
       weight:1,confidence:0,source:"OPENLIGADB_COMMUNITY",
       trainSamples:f.training.fixtures,
       trainingChecksumSha256:digest,
       calibrated:false,bookmakerPriceVerified:false,
       quoteUsed:false,bettable:false}],
     });stored++;
    }
   }catch{note("SOURCE_OR_STORAGE_WRITE_FAILED")}
  }
  await store.appendProviderHealth({
   providerId:"openligadb-community",status:"healthy",
   checkedAt:new Date().toISOString(),
   message:"Community Bundesliga pregame training/forecast pass; not real-time scoreboard.",
   metadata:{seasons:[season-1,season],historical:prior.length,
    currentSeason:current.length,proposed:proposed.length,predictionsPersisted:stored,
    skipped,reasons,externalPublicApiCalls:2,
    bookmakerProviderCalls:0,automaticBets:0,
    independentCalibrationVerified:false,licensedRealtimeClock:false},
  });
  return NextResponse.json({ok:true,source:"OPENLIGADB_COMMUNITY",
   seasons:[season-1,season],proposed:proposed.length,
   predictedOutcomesPersisted:stored,skipped,reasons,
   externalPublicApiCalls:2,bookmakerProviderCalls:0,
   liveClockVerified:false,calibrated:false,automaticBets:0},{headers});
 }catch{
  try{await store.appendProviderHealth({
    providerId:"openligadb-community",status:"degraded",
    checkedAt:new Date().toISOString(),
    message:"Community fixture/training data not available or storage failure.",
    metadata:{failureCode:"OPENLIGADB_SOURCE_OR_STORAGE_FAILURE",upstreamAttempted:true,
     bookmakerProviderCalls:0,automaticBets:0},
   });}catch{/* No fabricated successful health. */}
  return NextResponse.json({ok:false,source:"OPENLIGADB_COMMUNITY",
   reason:"SOURCE_OR_STORAGE_UNAVAILABLE",bookmakerProviderCalls:0,
   automaticBets:0},{status:503,headers});
 }
}
