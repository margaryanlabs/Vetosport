import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {OPENLIGADB_MODEL} from "@/lib/providers/openligadb";
export const dynamic="force-dynamic";
export const maxDuration=45;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Stored and immutable pregame forecasts only. Never a real-time
 * scoreboard or executable sportsbook price. */
export async function GET(){
 const now=Date.now(),asOf=new Date(now).toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:false,source:"NO_REAL_STORAGE",asOf,
   rows:[],bookmakerProviderCalls:0},{status:503,headers});
 try{
  const store=getPersistence(),H=3600_000;
  const windows=await Promise.all(Array.from({length:10},(_,day)=>day*24).map(h=>store.listRecentEvents({
   from:new Date(now+h*H).toISOString(),
   to:new Date(now+(h+24)*H).toISOString(),
   statuses:["scheduled"],limit:100,
  })));
  const capped=windows.some(x=>x.length>=100);
  const events=[...new Map(windows.flat().filter(e=>
   e.event.sport==="football"&&
   e.event.competition==="Bundesliga · Germany"&&
   /^[1-9]\d{3,9}$/.test(e.providerRefs?.["openligadb-community"]??"")&&
   Date.parse(e.event.startsAt)>=now+30*60_000&&
   Date.parse(e.event.startsAt)<now+10*24*H)
    .map(e=>[e.id,e])).values()].slice(0,30);
  if(!events.length||capped)return NextResponse.json({
   ok:true,source:"PERSISTED_ONLY",asOf,rows:[],
   fixturesScanned:events.length,scanMayBeCapped:capped,
   licensedLiveClock:false,independentFtCertified:false,
   bookmakerProviderCalls:0,automaticBets:0},{headers});
  const predictions=await store.listRecentPredictionsForEvents({
   eventIds:events.map(e=>e.id),limit:600});
  const predictionReadMayBeCapped=predictions.length>=600;
  if(predictionReadMayBeCapped)return NextResponse.json({
   ok:true,source:"PERSISTED_ONLY",asOf,rows:[],fixturesScanned:events.length,
   scanMayBeCapped:true,licensedLiveClock:false,bookmakerProviderCalls:0,
   independentFtCertified:false,automaticBets:0},{headers});
  const rows=[];
  for(const event of events){
   const variants=predictions.filter(p=>p.eventId===event.id&&
    p.marketKey==="football.1x2"&&
    ["home","draw","away"].includes(p.selectionKey)&&
    Number.isFinite(p.fairProbability)&&p.fairProbability>0&&p.fairProbability<1&&
    p.modelSignals.length===1&&
    p.modelSignals.some(x=>x&&typeof x==="object"&&!Array.isArray(x)&&
     (x as {version?:string}).version===OPENLIGADB_MODEL&&
     (x as {mode?:string}).mode==="SHADOW_PREMATCH"&&
     (x as {bookmakerPriceVerified?:boolean}).bookmakerPriceVerified===false)&&
    Date.parse(p.capturedAt)>=now-24*H&&Date.parse(p.capturedAt)<=now&&
    Date.parse(p.capturedAt)<Date.parse(event.event.startsAt))
   .sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt));
   const mostRecent=variants[0]?.capturedAt;
   if(!mostRecent)continue;
   const trio=variants.filter(p=>p.capturedAt===mostRecent);
   const probability=(selection:string)=>{
    const p=trio.filter(t=>t.selectionKey===selection);
    return p.length===1?p[0].fairProbability:null;
   };
   const home=probability("home"),draw=probability("draw"),away=probability("away");
   if(home===null||draw===null||away===null||trio.length!==3||
    Math.abs(home+draw+away-1)>.000015)continue;
   rows.push({
    id:event.id,match:event.event.home?.name+" — "+event.event.away?.name,
    startsAt:event.event.startsAt,forecastAt:mostRecent,modelVersion:OPENLIGADB_MODEL,
    probability:{home,draw,away},teamIds:{
     home:event.event.home?.id,away:event.event.away?.id},
    trainingSource:"OPENLIGADB_COMMUNITY",stage:"UNCALIBRATED_SHADOW_PREMATCH",
    bookmakerPriceVerified:false,licensedLiveClock:false,
    independentFtCertified:false,profitabilityValidated:false,
   });
  }
  return NextResponse.json({ok:true,source:"PERSISTED_ONLY",asOf,
   rows:rows.sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)).slice(0,18),
   fixturesScanned:events.length,scanMayBeCapped:false,
   predictionsRead:predictions.length,
   model:"football.bundesliga.team-poisson.v1",
   licensedLiveClock:false,independentFtCertified:false,
   bookmakerProviderCalls:0,automaticBets:0,
   note:"OpenLigaDB is a community-maintained Bundesliga source. This separately versioned Poisson model has no independent calibration, certified FT or price/execution edge. Not a live score."},{headers});
 }catch{
  return NextResponse.json({ok:false,source:"READ_ERROR",asOf,rows:[],
   bookmakerProviderCalls:0,automaticBets:0},{status:503,headers});
 }
}
