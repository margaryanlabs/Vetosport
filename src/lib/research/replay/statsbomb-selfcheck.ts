import { replayStatsBombMatch, type OpenEvent, type OpenMatch } from "./statsbomb";
const demo:OpenMatch={
 match_id:3895074,match_date:"2023-09-15",home_score:2,away_score:2,
 home_team:{home_team_name:"Bayern Munich",home_team_id:169},
 away_team:{away_team_name:"Bayer Leverkusen",away_team_id:904},
};
const ev=(index:number,period:number,minute:number,second:number,team:"Bayern Munich"|"Bayer Leverkusen",type:string,outcome?:string):OpenEvent=>({
 index,period,minute,second,team:{name:team},
 type:{name:type},shot:outcome?{outcome:{name:outcome}}:undefined,
});
export function runStatsBombReplaySelfcheck(){
 const match:OpenMatch={...demo,home_score:2,away_score:2};
 const events:OpenEvent[]=[
  ev(1,1,52,15,"Bayern Munich","Shot","Goal"),
  ev(2,1,53,40,"Bayern Munich","Half End"),
  ev(3,2,75,45,"Bayer Leverkusen","Shot","Goal"),
  ev(4,2,85,21,"Bayern Munich","Shot","Goal"),
  ev(5,2,93,46,"Bayer Leverkusen","Shot","Goal"),
  ev(6,2,98,24,"Bayern Munich","Half End"),
 ];
 const x=replayStatsBombMatch(match,events);
 const own=replayStatsBombMatch(
  {...demo,match_id:1,home_score:1,away_score:0},
  [
   ev(1,1,17,34,"Bayern Munich","Own Goal For"),
   ev(2,1,17,34,"Bayer Leverkusen","Own Goal Against"),
   ev(3,1,46,0,"Bayern Munich","Half End"),
   ev(4,2,93,0,"Bayern Munich","Half End"),
  ]
 );
 const overtime=replayStatsBombMatch(match,[...events,ev(8,3,96,0,"Bayern Munich","Pass")]);
 const mismatched=replayStatsBombMatch({...match,home_score:3},events);
 const checks=[
  {name:"Correctly reconstructs 1:1 at end minute 80",passed:x.scoreAtEndOfMinute80[0]===1&&x.scoreAtEndOfMinute80[1]===1},
  {name:"Recognizes two late goals and Under 3.5 losing",passed:x.goalsAfterMinute80===2&&x.under35ResultAfter80==="LOSS"},
  {name:"First-half stoppage goal at minute 52 precedes second half",passed:x.goals[0].period===1&&x.goals[0].minute===52},
  {name:"Fulltime minute 98 after stoppage",passed:x.fulltimeEndedMinute===98},
  {name:"Own Goal For and Against mirror count as one",passed:own.matchedFinalScore&&own.goals.length===1},
  {name:"Overtime records are blocked",passed:overtime.blockers.some(b=>b.startsWith("EXTRA_TIME_PRESENT"))},
  {name:"Inconsistent metadata must be blocked",passed:!mismatched.matchedFinalScore&&mismatched.under35ResultAfter80==="NOT_ELIGIBLE"},
  {name:"No wagering authority from any replay",passed:x.verdict==="HISTORICAL_REPLAY_ONLY"},
 ];
 return {passed:checks.every(c=>c.passed),checks,example:{scoreAt80:x.scoreAtEndOfMinute80,goalsAfter80:x.goalsAfterMinute80,halftime:x.halftimeEndedMinute,fulltime:x.fulltimeEndedMinute}};
}
