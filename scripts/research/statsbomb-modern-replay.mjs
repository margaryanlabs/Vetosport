#!/usr/bin/env node
/**
 * StatsBomb Open Data chronological replay for Project ZERO-S.
 * Reproducible on a computer with Node 18+ and internet access:
 *
 * node scripts/research/statsbomb-modern-replay.mjs --competition 9 --season 281
 *
 * StatsBomb must be credited when publishing insights. Read the upstream
 * README for their terms: https://github.com/hudl/open-data
 *
 * Never publishes or claims live/executable betting quotes.
 * Downloads metadata and match events to .cache, not to the public repo.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const args=process.argv.slice(2);
const opt=(name,fallback)=>{
 const idx=args.indexOf("--"+name);
 return idx>=0?args[idx+1]:fallback;
};
const competition=Number(opt("competition","9"));
const season=Number(opt("season","281"));
const max=Number(opt("max","9999"));
if(!Number.isInteger(competition)||competition<1||!Number.isInteger(season)||season<1||!Number.isInteger(max)||max<1){
 console.error("Invalid --competition, --season, or --max");process.exit(1);
}
const base="https://raw.githubusercontent.com/hudl/open-data/master/data";
const cache=path.resolve(".cache/veto-statsbomb",String(competition),String(season));
await mkdir(cache,{recursive:true});
async function download(relative,filename){
 try{return JSON.parse(await readFile(path.join(cache,filename),"utf8"));}
 catch{}
 const url=base+"/"+relative;
 const response=await fetch(url,{headers:{"User-Agent":"VETO-Sport-ZERO-S-research"}});
 if(!response.ok)throw new Error("Fetch failed: "+url+" HTTP "+response.status);
 const result=await response.json();
 await writeFile(path.join(cache,filename),JSON.stringify(result),"utf8");
 return result;
}
const fixtures=await download("matches/"+competition+"/"+season+".json","matches.json");
if(!Array.isArray(fixtures))throw new Error("Invalid match metadata from provider");
const matches=[...fixtures].sort((a,b)=>a.match_date.localeCompare(b.match_date)||a.match_id-b.match_id).slice(0,max);
function replay(match,events){
 const goals=[];
 const warnings=[];
 const hName=match.home_team.home_team_name;
 const aName=match.away_team.away_team_name;
 const ordered=[...events].sort((a,b)=>a.period-b.period||a.index-b.index);
 for(const e of ordered){
  if(!(e.period===1||e.period===2))continue;
  const own=e.type?.name==="Own Goal For";
  const shot=e.type?.name==="Shot"&&e.shot?.outcome?.name==="Goal";
  if(!own&&!shot)continue; // mirrored Own Goal Against must NOT be counted again
  const team=e.team?.name===hName?"home":e.team?.name===aName?"away":null;
  if(!team){warnings.push("unmapped-goal-team");continue;}
  goals.push({period:e.period,minute:e.minute,second:e.second,team,type:own?"OWN_GOAL_FOR":"SHOT_GOAL"});
 }
 const totalHome=goals.filter(g=>g.team==="home").length;
 const totalAway=goals.filter(g=>g.team==="away").length;
 const scoreMatched=totalHome===match.home_score&&totalAway===match.away_score;
 if(!scoreMatched)warnings.push("final-score-mismatch");
 if(events.some(e=>e.period>2))warnings.push("extra-time-present");
 const ends=events.filter(e=>e.type?.name==="Half End"&&e.period===2);
 if(!ends.length)warnings.push("no-fulltime-clock");
 const before80=goals.filter(e=>e.period===1||e.period===2&&e.minute<80);
 const through80=goals.filter(e=>e.period===1||e.period===2&&e.minute<=80);
 const at=(list)=>[list.filter(e=>e.team==="home").length,list.filter(e=>e.team==="away").length];
 const atClock80=at(before80),atEndOfMinute80=at(through80);
 const lateGoals=goals.filter(e=>e.period===2&&e.minute>80).length;
 return {
   matchId:match.match_id,date:match.match_date,
   home:hName,away:aName,final:[match.home_score,match.away_score],
   atClock80,atEndOfMinute80,lateGoals,goalCount:goals.length,
   finalWhistleMinute:ends[0]?.minute??null,
   valid:warnings.length===0,warnings,
   under35EligibleAtEnd80: warnings.length===0&&atEndOfMinute80[0]===1&&atEndOfMinute80[1]===1,
 };
}
const records=[];
for(let i=0;i<matches.length;i+=3){
 const batch=matches.slice(i,i+3);
 const batchResults=await Promise.all(batch.map(async(m)=>{
  try{
   const events=await download("events/"+m.match_id+".json","events-"+m.match_id+".json");
   if(!Array.isArray(events))throw new Error("Invalid event list");
   return replay(m,events);
  }catch(error){return{matchId:m.match_id,date:m.match_date,valid:false,
   warnings:[error instanceof Error?error.message:String(error)]};}
 }));
 records.push(...batchResults);
}
const valid=records.filter(r=>r.valid);
const eligible=valid.filter(r=>r.under35EligibleAtEnd80);
const losses=eligible.filter(r=>r.lateGoals>=2);
const ftMinutes=valid.map(r=>r.finalWhistleMinute).filter(v=>typeof v==="number").sort((a,b)=>a-b);
const median=ftMinutes.length?ftMinutes[Math.floor(ftMinutes.length/2)]:null;
const output={
 mode:"HISTORICAL_RESEARCH_NOT_A_BETTING_BACKTEST",
 dataSource:"StatsBomb Open Data",
 sourceAttribution:"https://github.com/hudl/open-data",
 competitionId:competition,seasonId:season,
 biasWarning:"This available season is a SELECTED provider subset, not necessarily a full competition or random sample. Do not extrapolate late-goal rates.",
 clockConvention:"Score at end of recorded minute 80 includes period 1 plus period 2 events labeled minute <= 80. No exact betting quote available.",
 matchCount:records.length,validCount:valid.length,invalidCount:records.length-valid.length,
 fulltimeMinuteMedian:median,
 eligibleAt80_1_1:eligible.length,
 late2Plus:losses.length,
 historicalUnder35FailureRate:eligible.length?losses.length/eligible.length:null,
 eligibleCases:eligible.map(r=>({id:r.matchId,date:r.date,teams:r.home+" vs "+r.away,final:r.final,lateGoals:r.lateGoals,whistle:r.finalWhistleMinute})),
 invalidCases:records.filter(r=>!r.valid),
 blockedFromProduction:true,
};
console.log(JSON.stringify(output,null,2));
