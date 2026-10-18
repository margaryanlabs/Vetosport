/**
 * Read-only Bundesliga source experiment for the first model rollout.
 * Cached for 30m across visitors so clicking Refresh does not hammer the
 * free community endpoint or consume paid bookmaker quota.
 *
 * CRITICAL: These estimates have NOT been committed as immutable pregame
 * predictions. Do not use them for backtests/edge, or treat data on an
 * OpenLigaDB page as a certified FT source.
 */
import {NextResponse} from "next/server";
import {unstable_cache} from "next/cache";
import {fetchBundesligaSeason,OPENLIGADB_MODEL} from "@/lib/providers/openligadb";
import {buildBundesligaPrematchForecasts} from "@/lib/research/bundesliga-prematch";
export const dynamic="force-dynamic";
export const maxDuration=60;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
const readCommunityPreview=unstable_cache(async(season:number)=>{
 const sourceRetrievedAt=new Date().toISOString();
 const [prior,current]=await Promise.all([
  fetchBundesligaSeason(season-1),fetchBundesligaSeason(season)]);
 const forecasts=buildBundesligaPrematchForecasts({
  prior,current,asOf:sourceRetrievedAt,maxResults:16});
 return {
  sourceRetrievedAt,trainingFixtures:prior.filter(f=>f.final!==null).length+
    current.filter(f=>f.final!==null).length,
  priorSeasonFixtures:prior.length,currentSeasonFixtures:current.length,
  eligibleFixtureCount:forecasts.length,
  rows:forecasts.map(f=>({
   id:String(f.id),match:f.home+" — "+f.away,
   startsAt:f.startsAt,
   sourceRetrievedAt,probability:f.probabilities,
   teamSamples:f.teamSamples,modelVersion:f.modelVersion,
   estimatedGoals:f.estimatedGoals,season:f.season,
   status:"UNCALIBRATED_READ_ONLY_PREVIEW" as const,
   isPersisted:false as const,
   evidenceIndependentFtCertified:false as const,
   executableBookmakerQuoteVerified:false as const,
   expectedValueVerified:false as const,
  })),
 };
},["veto-openligadb-community-prematch-preview-v1"],{revalidate:1800});

export async function GET(){
 const start=Date.now();
 const utc=new Date(start),season=utc.getUTCMonth()>=6?
  utc.getUTCFullYear():utc.getUTCFullYear()-1;
 try{
  const source=await readCommunityPreview(season);
  const safe=source.rows.filter(f=>
   Date.parse(f.startsAt)-start>=30*60_000&&
   Date.parse(f.startsAt)-start<=10*24*3600_000&&
   Date.parse(f.sourceRetrievedAt)<=start&&
   start-Date.parse(f.sourceRetrievedAt)<=36*60_000);
  return NextResponse.json({ok:true,source:"OPENLIGADB_COMMUNITY_CACHED_PREVIEW",
   asOf:new Date(start).toISOString(),
   ...source,rows:safe,
   previewOnly:true,persistedForecasts:0,independentCalibrationVerified:false,
   resultCertificatesUsed:0,marketQuoteInputsUsed:0,bookmakerProviderCalls:0,
   automaticBets:0,model:OPENLIGADB_MODEL,cacheTtlSeconds:1800,
   note:"Read-only experimental probabilities computed from community score history. NOT immutable recorded predictions. No professional LIVE clock, market odds, calibration, source-certified FT, edge or betting authorization."},
   {headers});
 }catch{
  return NextResponse.json({ok:false,source:"COMMUNITY_PROVIDER_OR_MODEL_UNAVAILABLE",
   previewOnly:true,rows:[],bookmakerProviderCalls:0,
   automaticBets:0},{status:503,headers});
 }
}
