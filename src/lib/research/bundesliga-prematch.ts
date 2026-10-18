/** Real-source but NOT scientifically calibrated Bundesliga pre-match baseline.
 * Inputs are documented community regulation FT results from completed games
 * available at forecast runtime. No bookmaker quotes or unofficial LIVE clock.
 * Refuse a selection whenever historic team-ID sample is insufficient.
 */
import {buildFootballProbabilitySurface} from "@/lib/models/football/surface";
import {GermanFixture,OPENLIGADB_MODEL,OPENLIGADB_FEATURE} from "@/lib/providers/openligadb";
export {OPENLIGADB_MODEL,OPENLIGADB_FEATURE};
const HOUR=3600000;
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const mean=(n:number,d:number,fallback:number)=>d? n/d:fallback;
export type BundesligaForecast={
 id:number;home:string;away:string;homeId:number;awayId:number;
 startsAt:string;season:number;captureAt:string;
 modelVersion:typeof OPENLIGADB_MODEL;featureVersion:typeof OPENLIGADB_FEATURE;
 estimatedGoals:{home:number;away:number};
 probabilities:{home:number;draw:number;away:number};
 teamSamples:{home:number;away:number};
 training:{fixtures:number;priorSeasonFixtures:number;currentSeasonFixtures:number;
  minimumTrainingGames:number;source:"OPENLIGADB_COMMUNITY"};
 status:"UNCALIBRATED_SHADOW_PREMATCH";
 sourceEmissionTimeVerified:false;independentFtCertification:false;
 bookmakerPriceVerified:false;profitabilityValidated:false;
};
type Row={fixture:GermanFixture;weight:number};
export function buildBundesligaPrematchForecasts(input:{
 prior:GermanFixture[];current:GermanFixture[];asOf:string;maxResults?:number;
}):BundesligaForecast[]{
 const now=Date.parse(input.asOf);
 if(!Number.isFinite(now))return[];
 const season=input.current[0]?.season;
 if(!season||input.current.some(x=>x.season!==season)||
   input.prior.some(x=>x.season!==season-1))return[];
 const older=input.prior.filter(f=>f.final!==null&&
  Date.parse(f.startsAt)<now-4*HOUR).map(f=>({fixture:f,weight:.65}));
 const thisSeason=input.current.filter(f=>f.final!==null&&
  Date.parse(f.startsAt)<now-4*HOUR).map(f=>({fixture:f,weight:1.5}));
 const training:Row[]=[...older,...thisSeason];
 if(training.length<130||older.length<115)return[];
 let leagueHome=0,leagueAway=0,weight=0;
 for(const r of training){leagueHome+=r.weight*r.fixture.final!.home;
  leagueAway+=r.weight*r.fixture.final!.away;weight+=r.weight;}
 const lh=leagueHome/weight,la=leagueAway/weight;
 if(!Number.isFinite(lh)||!Number.isFinite(la)||lh<.5||la<.5||lh>4||la>4)return[];
 const gamesFor=(id:number)=>training.filter(r=>
  r.fixture.homeId===id||r.fixture.awayId===id);
 const prior=5;
 const forecasts:BundesligaForecast[]=[];
 const future=input.current.filter(f=>f.final===null&&
   Date.parse(f.startsAt)-now>=30*60000&&
   Date.parse(f.startsAt)-now<=72*HOUR)
  .sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
 for(const fixture of future){
  const h=gamesFor(fixture.homeId),a=gamesFor(fixture.awayId);
  const hh=h.filter(r=>r.fixture.homeId===fixture.homeId),
   aa=a.filter(r=>r.fixture.awayId===fixture.awayId);
  if(h.length<8||a.length<8||hh.length<4||aa.length<4)continue;
  const weighted=(rows:Row[],side:"home"|"away",forGoals:boolean,baseline:number)=>{
   const sum=rows.reduce((s,r)=>s+r.weight*(side==="home"?
    (forGoals?r.fixture.final!.home:r.fixture.final!.away):
    (forGoals?r.fixture.final!.away:r.fixture.final!.home)),0);
   const w=rows.reduce((s,r)=>s+r.weight,0);
   return (sum+prior*baseline)/(w+prior);
  };
  const homeFor=weighted(hh,"home",true,lh),
   awayConceded=weighted(aa,"away",false,lh),
   awayFor=weighted(aa,"away",true,la),
   homeConceded=weighted(hh,"home",false,la);
  const expectedHome=clamp(homeFor*awayConceded/lh,.25,3.4);
  const expectedAway=clamp(awayFor*homeConceded/la,.25,3.4);
  const surface=buildFootballProbabilitySurface({
   scoreHome:0,scoreAway:0,elapsedMinutes:0,
   prematchExpectedHomeGoals:expectedHome,prematchExpectedAwayGoals:expectedAway});
  const picks=surface.markets.filter(x=>x.marketId==="football.1x2");
  const pHome=picks.find(x=>x.selectionId==="home")?.probability,
   pDraw=picks.find(x=>x.selectionId==="draw")?.probability,
   pAway=picks.find(x=>x.selectionId==="away")?.probability;
  if(pHome===undefined||pDraw===undefined||pAway===undefined||
   Math.abs(pHome+pDraw+pAway-1)>.00001)continue;
  const rounded=(x:number)=>Number(x.toFixed(6));
  forecasts.push({
   id:fixture.id,home:fixture.home,away:fixture.away,
   homeId:fixture.homeId,awayId:fixture.awayId,startsAt:fixture.startsAt,
   season,captureAt:input.asOf,
   modelVersion:OPENLIGADB_MODEL,featureVersion:OPENLIGADB_FEATURE,
   estimatedGoals:{home:rounded(expectedHome),away:rounded(expectedAway)},
   probabilities:{home:rounded(pHome),draw:rounded(pDraw),
    away:rounded(1-rounded(pHome)-rounded(pDraw))},
   teamSamples:{home:h.length,away:a.length},
   training:{fixtures:training.length,priorSeasonFixtures:older.length,
    currentSeasonFixtures:thisSeason.length,minimumTrainingGames:8,
    source:"OPENLIGADB_COMMUNITY"},
   status:"UNCALIBRATED_SHADOW_PREMATCH",
   sourceEmissionTimeVerified:false,independentFtCertification:false,
   bookmakerPriceVerified:false,profitabilityValidated:false,
  });
 }
 return forecasts.slice(0,Math.max(1,Math.min(input.maxResults??20,30)));
}
/** Exactly source-built past team samples, no synthetic forecast shown to clients. */
export function bundesligaPrematchSelfcheck(){
 const past=(i:number,season:number):GermanFixture=>({
  id:season*1000+i,season,startsAt:
   new Date(Date.parse("2025-08-01T12:00:00Z")+(season-2025)*365*24*HOUR+i*24*HOUR).toISOString(),
  updatedAt:null,homeId:i%2===0?1:2,awayId:i%2===0?2:1,
  home:"Home",away:"Away",final:{home:i%4,away:i%3},
  source:"OPENLIGADB_COMMUNITY"});
 const prior=Array.from({length:150},(_,i)=>past(i,2025));
 const current=Array.from({length:10},(_,i)=>({...past(i,2026),
  startsAt:new Date(Date.parse("2026-08-10T12:00:00Z")+i*24*HOUR).toISOString()}));
 const future:GermanFixture={...past(500,2026),id:2026500,
  startsAt:"2026-10-19T12:00:00Z",final:null};
 const asOf="2026-10-18T12:00:00Z";
 const run=(o:Partial<Parameters<typeof buildBundesligaPrematchForecasts>[0]>={})=>
  buildBundesligaPrematchForecasts({prior,current:[...current,future],asOf,...o});
 const a=run()[0];
 const checks=[
  {name:"Historical completed results yield prospective independent bookmaker-free 1X2",
   passed:!!a&&Math.abs(a.probabilities.home+a.probabilities.draw+a.probabilities.away-1)<.00001},
  {name:"Selection has no market odds, validated edge or trustworthy game clock",
   passed:a?.bookmakerPriceVerified===false&&a.profitabilityValidated===false&&
    a.status==="UNCALIBRATED_SHADOW_PREMATCH"},
  {name:"No upcoming kickoff means no forecast",passed:run({current}).length===0},
  {name:"Past completed match cannot be re-labelled as future forecast",
   passed:run({current:[...current,{...future,final:{home:2,away:1}}]}).length===0},
  {name:"Cannot forecast team with no verified history",
   passed:run({current:[...current,{...future,homeId:99999}]}).length===0},
  {name:"Insufficient historical league dataset must fail closed",
   passed:run({prior:prior.slice(0,60)}).length===0},
  {name:"Forecast cannot use future results as training",
   passed:run({prior:prior.map(f=>({...f,startsAt:"2027-01-01T00:00:00Z"}))}).length===0},
  {name:"Output contains team sample provenance, no independent FT claims",
   passed:!!a&&a.teamSamples.home>=8&&a.teamSamples.away>=8&&
    a.independentFtCertification===false},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
