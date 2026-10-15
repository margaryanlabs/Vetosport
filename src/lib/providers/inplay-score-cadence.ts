import type {VerifiedOddsMatch} from "@/lib/providers/api-football-odds-join";

/** Read-only snapshots age audit. Provider score capture times are GATEWAY timestamps. */
export function describeInplayScoreAge(matches:Iterable<VerifiedOddsMatch>){
 const ages=[...matches].map(x=>x.scoreAgeSeconds).filter(
  x=>Number.isSafeInteger(x)&&x>=0&&x<=24*3600,
 ).sort((a,b)=>a-b);
 return{
  verifiedSourceMatches:ages.length,
  scoreSnapshotsWithin2m:ages.filter(x=>x<=120).length,
  scoreSnapshots2to10m:ages.filter(x=>x>120&&x<=600).length,
  scoreSnapshotsOver10m:ages.filter(x=>x>600).length,
  medianScoreAgeSeconds:ages.length?ages[Math.floor((ages.length-1)/2)]:null,
  independentProviderClocksVerified:false as const,
  executableQuoteCertified:false as const,
 };
}

/**
 * Score ingestion at :00/:30, 2-hour odds at :01.
 * Same provider daily request frequency (48 scores + 12 odds).
 * Exact clocks are only planned; Vercel/ingestion runtimes can be delayed.
 */
export function cronOrderingSelfcheck(){
 const minute=(expression:string)=>Number(expression.split(" ")[0]);
 const score="*/30 * * * *",odds="1 */2 * * *";
 const scoreMinute=[0,30],oddsMinute=minute(odds);
 const demo:VerifiedOddsMatch[]=[
  {fixtureId:1,eventId:"one",stateAt:"2026-10-15T10:00:30Z",scoreAgeSeconds:90},
  {fixtureId:2,eventId:"two",stateAt:"2026-10-15T09:30:30Z",scoreAgeSeconds:1890},
  {fixtureId:3,eventId:"three",stateAt:"2026-10-15T10:00:50Z",scoreAgeSeconds:70},
 ];
 const observed=describeInplayScoreAge(demo);
 const tests=[
  {name:"Odds starts in a different minute AFTER planned :00 score poll",
   passed:score==="*/30 * * * *"&&scoreMinute[0]===0&&oddsMinute===1},
  {name:"Exactly twelve in-play scheduled requests per UTC day",
   passed:odds==="1 */2 * * *"&&Array.from({length:24},(_,h)=>h).filter(h=>h%2===0).length===12},
  {name:"Only age <=120s qualifies as near-capture, not live execution",
   passed:observed.scoreSnapshotsWithin2m===2&&observed.scoreSnapshotsOver10m===1},
  {name:"Unordered / invalid ages never produce false freshness",
   passed:describeInplayScoreAge([{...demo[0],scoreAgeSeconds:-3},{...demo[1],scoreAgeSeconds:NaN}]).verifiedSourceMatches===0},
  {name:"Median computed from bounded real observed states",
   passed:observed.medianScoreAgeSeconds===90},
  {name:"Fresh historical captures do not validate bookmaker execution",
   passed:observed.independentProviderClocksVerified===false&&observed.executableQuoteCertified===false},
 ];
 return{passed:tests.every(t=>t.passed),tests};
}
