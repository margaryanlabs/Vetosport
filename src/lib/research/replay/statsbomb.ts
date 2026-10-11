/**
 * Project ZERO-S / StatsBomb OPEN event replay.
 * Historical, observational, and research-only.
 *
 * Critical clock rules:
 * - period 1 may continue after minute 45 (e.g. a goal at minute 52)
 * - period 2 restarts at minute 45; sort by period, then by index
 * - Own Goal For and Own Goal Against are mirrored records of ONE goal;
 *   count Own Goal For and ignore its mirrored Own Goal Against.
 * - Never mix extra-time periods 3/4 with ordinary full-time UNDER.
 *
 * Official open source: https://github.com/hudl/open-data
 * No claims of contemporaneous executable odds or 2026 calibration.
 */
export type OpenMatch = {
  match_id: number;
  match_date: string;
  home_score: number;
  away_score: number;
  home_team: { home_team_name: string; home_team_id: number };
  away_team: { away_team_name: string; away_team_id: number };
};
export type OpenEvent = {
  id?: string;
  index: number;
  period: number;
  minute: number;
  second: number;
  team?: { name: string; id?: number };
  type?: { name: string };
  shot?: { outcome?: { name: string } };
};
export interface ReplayGoal {
  period: number; minute: number; second: number;
  team: "home"|"away"; type: "SHOT_GOAL"|"OWN_GOAL_FOR";
}
export type ReplayResult = {
  matchId: number; matchDate: string; matchLabel: string;
  finalScore: [number, number];
  reconstructedScore: [number, number];
  matchedFinalScore: boolean;
  halftimeEndedMinute: number|null;
  fulltimeEndedMinute: number|null;
  goals: ReplayGoal[];
  earlyScoreAt80: [number,number];
  scoreAtEndOfMinute80: [number,number];
  goalsAfterMinute80: number;
  eligibleUnder35AtMinute80: boolean;
  under35ResultAfter80: "WIN" | "LOSS" | "NOT_ELIGIBLE";
  blockers: string[];
  verdict: "HISTORICAL_REPLAY_ONLY";
};
const finite = (x: unknown) => typeof x==="number" && Number.isFinite(x);
function validMatch(m: OpenMatch) {
  return finite(m.match_id) && finite(m.home_score) && finite(m.away_score)
    && !!m.home_team?.home_team_name && !!m.away_team?.away_team_name
    && m.home_team.home_team_name!==m.away_team.away_team_name;
}
const isGoal = (e:OpenEvent) => (e.type?.name==="Shot" && e.shot?.outcome?.name==="Goal") || e.type?.name==="Own Goal For";
function beforeMinute(e:OpenEvent, minute:number):boolean {
  return e.period===1 || e.period===2 && (e.minute<minute || e.minute===minute && e.second===0);
}
function throughMinute(e:OpenEvent, minute:number):boolean {
  return e.period===1 || e.period===2 && e.minute<=minute;
}
export function replayStatsBombMatch(match:OpenMatch, events:OpenEvent[]):ReplayResult {
  if(!validMatch(match)||!Array.isArray(events))throw new Error("Valid match metadata and event array required");
  const ordered=[...events].sort((a,b)=>a.period-b.period || a.index-b.index);
  const blockers:string[]=[];
  if(ordered.some(e=>!finite(e.period)||!finite(e.index)||!finite(e.minute)||!finite(e.second))) {
    throw new Error("Invalid event time or ordering data");
  }
  if(ordered.some(e=>e.period>2))blockers.push("EXTRA_TIME_PRESENT: ordinary 90-minute fulltime does not cover knockout overtime");
  const regular=ordered.filter(e=>e.period===1||e.period===2);
  const goals:ReplayGoal[]=[];
  for(const e of regular){
    if(!isGoal(e))continue;
    const team=e.team?.name===match.home_team.home_team_name?"home":e.team?.name===match.away_team.away_team_name?"away":null;
    if(!team){blockers.push("GOAL_TEAM_UNMAPPED");continue;}
    goals.push({period:e.period,minute:e.minute,second:e.second,team,type:e.type?.name==="Own Goal For"?"OWN_GOAL_FOR":"SHOT_GOAL"});
  }
  const homeGoals=goals.filter(g=>g.team==="home").length;
  const awayGoals=goals.filter(g=>g.team==="away").length;
  const reconstructedScore:[number,number]=[homeGoals,awayGoals];
  const matchedFinalScore=homeGoals===match.home_score&&awayGoals===match.away_score;
  if(!matchedFinalScore)blockers.push("FINAL_SCORE_MISMATCH: do not use this game for tail-outcome research");
  const goalEvents=regular.filter(isGoal);
  const observedAt80=goalEvents.filter(e=>beforeMinute(e,80));
  const observedThrough80=goalEvents.filter(e=>throughMinute(e,80));
  const score=(subset:OpenEvent[]):[number,number]=>[
    subset.filter(e=>e.team?.name===match.home_team.home_team_name).length,
    subset.filter(e=>e.team?.name===match.away_team.away_team_name).length,
  ];
  const earlyScoreAt80=score(observedAt80);
  const scoreAtEndOfMinute80=score(observedThrough80);
  const goalsAfterMinute80=goalEvents.filter(e=>e.period===2&&e.minute>80).length;
  const ends=(period:number)=>regular.filter(e=>e.period===period && e.type?.name==="Half End");
  const halftime=ends(1)[0]||null;
  const fulltime=ends(2)[0]||null;
  if(!fulltime)blockers.push("NO_FULLTIME_CLOCK");
  if(!halftime)blockers.push("NO_HALFTIME_CLOCK");
  const eligibleUnder35AtMinute80=matchedFinalScore&&blockers.length===0&&scoreAtEndOfMinute80[0]===1&&scoreAtEndOfMinute80[1]===1;
  return{
    matchId:match.match_id,matchDate:match.match_date,
    matchLabel:match.home_team.home_team_name+" — "+match.away_team.away_team_name,
    finalScore:[match.home_score,match.away_score],reconstructedScore,matchedFinalScore,
    halftimeEndedMinute:halftime?.minute??null,fulltimeEndedMinute:fulltime?.minute??null,
    goals,earlyScoreAt80,scoreAtEndOfMinute80,goalsAfterMinute80,
    eligibleUnder35AtMinute80,
    under35ResultAfter80:eligibleUnder35AtMinute80?(goalsAfterMinute80>=2?"LOSS":"WIN"):"NOT_ELIGIBLE",
    blockers,verdict:"HISTORICAL_REPLAY_ONLY",
  };
}
