import type {SportEvent} from "@/lib/domain/types";

export interface ApiFootballFixture {
  fixture?: {
    id?:number;
    date?:string;
    status?:{short?:string;long?:string;elapsed?:number|null;extra?:number|null};
  };
  league?:{name?:string;country?:string};
  teams?:{
    home?:{id?:number;name?:string};
    away?:{id?:number;name?:string};
  };
  goals?:{home?:number|null;away?:number|null};
}
export interface ApiFootballLiveSnapshot {
  fetchedAt:string;
  quotaRemaining:number|null;
  quotaLimit:number|null;
  fixtures:ApiFootballFixture[];
}
export const apiFootballAvailable = () => Boolean(process.env.API_FOOTBALL_KEY);
export const apiFootballSchedule = {perDay:48,reserve:20,estimatedMaximum:68} as const;

// API-Football (api-sports.io): 100 requests/day on FREE. No browser calls.
// Only the protected 30-minute cron may invoke this client. Never log credentials.
export async function getApiFootballLiveFixtures():Promise<ApiFootballLiveSnapshot>{
  const key=process.env.API_FOOTBALL_KEY;
  if(!key)throw new Error("API_FOOTBALL_KEY not configured.");
  const response=await fetch("https://v3.football.api-sports.io/fixtures?live=all",{
    headers:{"x-apisports-key":key,accept:"application/json"},
    cache:"no-store",
    signal:AbortSignal.timeout(12_000)
  });
  const remainingHeader=response.headers.get("x-ratelimit-requests-remaining");
  const limitHeader=response.headers.get("x-ratelimit-requests-limit");
  const quotaRemaining=remainingHeader===null?null:Number(remainingHeader);
  const quotaLimit=limitHeader===null?null:Number(limitHeader);
  if(!response.ok)throw new Error(`API-Football HTTP ${response.status}; no state written.`);
  const payload:unknown=await response.json();
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new Error("API-Football payload malformed.");
  const data=payload as {response?:unknown;errors?:unknown;results?:number};
  const errors=data.errors;
  if(Array.isArray(errors)?errors.length>0:errors&&typeof errors==="object"&&Object.keys(errors).length>0){
    throw new Error("API-Football reported API-level errors; no data written.");
  }
  if(!Array.isArray(data.response))throw new Error("API-Football response array absent.");
  return{
    fetchedAt:new Date().toISOString(),
    quotaRemaining:quotaRemaining!==null&&Number.isFinite(quotaRemaining)?quotaRemaining:null,
    quotaLimit:quotaLimit!==null&&Number.isFinite(quotaLimit)?quotaLimit:null,
    fixtures:data.response.slice(0,50) as ApiFootballFixture[],
  };
}
const liveCodes=new Set(["1H","HT","2H","ET","BT","P","LIVE","INT"]);
const finishedCodes=new Set(["FT","AET","PEN"]);
const suspendedCodes=new Set(["SUSP","PST","CANC","ABD","AWD","WO"]);
export function normalizeApiFootballFixture(row:ApiFootballFixture):{event:SportEvent;state:Record<string,unknown>}|null{
  const f=row.fixture,t=row.teams;
  const id=f?.id;
  const date=f?.date;
  const home=t?.home?.name,away=t?.away?.name;
  if(typeof id!=="number"||!Number.isSafeInteger(id)||id<1||
     !date||!Number.isFinite(Date.parse(date))||!home||!away)return null;
  const code=f?.status?.short||"";
  const status:SportEvent["status"]=liveCodes.has(code)?"live":finishedCodes.has(code)?"finished":
    suspendedCodes.has(code)?"suspended":"scheduled";
  // A live=all response unexpectedly containing nonlive status is dropped.
  if(status!=="live")return null;
  const minutes=f?.status?.elapsed;
  const extra=f?.status?.extra;
  const elapsed=typeof minutes==="number"&&Number.isFinite(minutes)&&minutes>=0&&minutes<=130?minutes:null;
  const additional=typeof extra==="number"&&Number.isFinite(extra)&&extra>=0&&extra<=20?extra:0;
  const clock=elapsed===null?"ВРЕМЯ НЕ ПЕРЕДАНО":additional>0?`${elapsed}+${additional}′`:`${elapsed}′`;
  const homeGoals=row.goals?.home,awayGoals=row.goals?.away;
  const validScore=typeof homeGoals==="number"&&Number.isInteger(homeGoals)&&homeGoals>=0&&
    typeof awayGoals==="number"&&Number.isInteger(awayGoals)&&awayGoals>=0;
  const event:SportEvent={
    id:String(id),sport:"football",
    competition:[row.league?.name,row.league?.country].filter(Boolean).join(" · ")||"Football",
    startsAt:new Date(date).toISOString(),status,
    home:{id:String(t?.home?.id??home),name:home},
    away:{id:String(t?.away?.id??away),name:away},
    clock:{period:code,elapsedSeconds:elapsed===null?undefined:elapsed*60},
    score:validScore?{home:homeGoals,away:awayGoals}:undefined,
  };
  const state:Record<string,unknown>={
    status,period:code,clock,
    ...(validScore?{score:{home:homeGoals,away:awayGoals}}:{}),
    providerEventId:id,
    providerStatusLong:f?.status?.long||code,
    source:"api-football.fixtures.live",
  };
  return{event,state};
}
export function apiFootballAdapterSelfcheck(){
  const base:ApiFootballFixture={fixture:{id:20,date:"2026-10-12T10:00:00Z",status:{short:"2H",elapsed:83}},teams:{home:{id:1,name:"Team A"},away:{id:2,name:"Team B"}},goals:{home:1,away:1}};
  const valid=normalizeApiFootballFixture(base);
  const checks=[
    {name:"Valid second half score preserved",pass:valid?.event.status==="live"&&valid?.event.score?.home===1&&valid?.state.clock==="83′"},
    {name:"Missing goals never fabricated",pass:normalizeApiFootballFixture({...base,goals:{home:null,away:null}})?.event.score===undefined},
    {name:"Invalid fixture id rejected",pass:normalizeApiFootballFixture({...base,fixture:{...base.fixture,id:-1}})===null},
    {name:"Finished fixture excluded from live stream",pass:normalizeApiFootballFixture({...base,fixture:{...base.fixture,status:{short:"FT"}}})===null},
    {name:"Unknown state excluded from live stream",pass:normalizeApiFootballFixture({...base,fixture:{...base.fixture,status:{short:"NS"}}})===null},
    {name:"Injury time parsed",pass:normalizeApiFootballFixture({...base,fixture:{...base.fixture,status:{short:"2H",elapsed:90,extra:3}}})?.state.clock==="90+3′"},
    {name:"Raw quote data never manufactured",pass:!Object.hasOwn(valid?.state||{},"quotes")},
    {name:"Quota estimates below free plan",pass:apiFootballSchedule.perDay<100},
  ];
  return{passed:checks.every(x=>x.pass),checks};
}
