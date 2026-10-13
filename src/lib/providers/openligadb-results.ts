/**
 * Public, independent community football results feed. OpenLigaDB is available
 * without credentials, but its database uses ODbL 1.0: preserve explicit
 * attribution and never insert these records into VETO's private research
 * database without a separate licensing and provenance review.
 *
 * Unlike provider-certified VETO final snapshots, this display does not assert
 * that our model observed the event, that odds were available, or that any
 * betting decision had a verified outcome.
 */
export type OpenLeague="bl1"|"bl2";
export const openLeagues=[
 {id:"bl1" as const,label:"Bundesliga",country:"Германия · 1"},
 {id:"bl2" as const,label:"2. Bundesliga",country:"Германия · 2"},
];
export const resultsAttribution={
 provider:"OpenLigaDB",sourceUrl:"https://openligadb.de/",
 license:"ODbL 1.0",licenseUrl:"https://opendatacommons.org/licenses/odbl/1.0/",
 limitation:"Данные вносит сообщество OpenLigaDB. VETO не считает их официальным независимым сертификатом качества модели.",
};
export type MatchState="finished-90"|"unverified"|"scheduled";
export type PublicMatch={
 id:number;league:OpenLeague;season:number;startsAt:string;
 home:string;away:string;homeScore:number|null;awayScore:number|null;
 state:MatchState;updatedAt:string|null;
 provenance:"OpenLigaDB / ODbL-1.0";
};
type MatchRaw={
 matchID?:unknown;matchDateTimeUTC?:unknown;
 leagueShortcut?:unknown;leagueSeason?:unknown;matchIsFinished?:unknown;
 lastUpdateDateTime?:unknown;
 team1?:{teamName?:unknown};team2?:{teamName?:unknown};
 matchResults?:Array<{resultTypeKind?:unknown;pointsTeam1?:unknown;pointsTeam2?:unknown}>;
};
const safeTeam=(n:unknown):string|null=>typeof n==="string"&&n.trim().length>=2&&n.length<=110?n.trim():null;
const safeScore=(x:unknown):number|null=>
 typeof x==="number"&&Number.isInteger(x)&&x>=0&&x<=30?x:null;

export function parseOpenLigaMatch(input:unknown,league:OpenLeague,season:number):PublicMatch|null{
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const row=input as MatchRaw;
 const id=row.matchID,ts=row.matchDateTimeUTC;
 if(typeof id!=="number"||!Number.isSafeInteger(id)||id<=0||
  typeof ts!=="string"||!Number.isFinite(Date.parse(ts))||
  row.leagueShortcut!==league||row.leagueSeason!==season)return null;
 const home=safeTeam(row.team1?.teamName),away=safeTeam(row.team2?.teamName);
 if(!home||!away||home.toLowerCase()===away.toLowerCase())return null;
 const finalRows=Array.isArray(row.matchResults)?
  row.matchResults.filter(v=>v?.resultTypeKind==="After90Minutes"||
    (v?.resultTypeKind==null&&(v as {resultTypeID?:unknown}).resultTypeID===2)): [];
 const final=finalRows.length===1?finalRows[0]:null;
 const homeScore=safeScore(final?.pointsTeam1),awayScore=safeScore(final?.pointsTeam2);
 const verified= row.matchIsFinished===true&&finalRows.length===1&&
  homeScore!==null&&awayScore!==null;
 const state:MatchState=verified?"finished-90":
  row.matchIsFinished===true?"unverified":"scheduled";
 const update=typeof row.lastUpdateDateTime==="string"&&
  Number.isFinite(Date.parse(row.lastUpdateDateTime))?row.lastUpdateDateTime:null;
 return{
  id,league,season,startsAt:new Date(ts).toISOString(),home,away,
  homeScore:verified?homeScore:null,awayScore:verified?awayScore:null,
  state,updatedAt:update,provenance:"OpenLigaDB / ODbL-1.0",
 };
}
export function germanSeason(now:Date):number{
 return now.getUTCMonth()>=7?now.getUTCFullYear():now.getUTCFullYear()-1;
}
export type LeagueResults={
 league:OpenLeague;label:string;season:number;
 status:"available"|"source-unavailable";
 finished:PublicMatch[];upcoming:PublicMatch[];
 allSeasonCompleted:number;fetchedAt:string;
}
export function selectLeagueResults(raw:unknown,league:OpenLeague,season:number,asOf:Date):LeagueResults{
 const rows=Array.isArray(raw)?raw:[];
 const all=rows.slice(0,350).map(row=>parseOpenLigaMatch(row,league,season))
  .filter((m):m is PublicMatch=>m!==null);
 const now=asOf.getTime();
 const completed=all.filter(m=>m.state==="finished-90"&&Date.parse(m.startsAt)<=now);
 const recent=completed.filter(m=>Date.parse(m.startsAt)>=now-21*86400000)
  .sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt)).slice(0,18);
 const finished=recent.length?recent:completed
  .sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt)).slice(0,12);
 const upcoming=all.filter(m=>m.state==="scheduled"&&
  Date.parse(m.startsAt)>=now-30*60000&&Date.parse(m.startsAt)<=now+14*86400000)
  .sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)).slice(0,8);
 return{league,label:openLeagues.find(l=>l.id===league)?.label??league,season,
  status:"available",finished,upcoming,allSeasonCompleted:completed.length,
  fetchedAt:asOf.toISOString()};
}
export async function fetchOpenLigaResults(league:OpenLeague,now=new Date()):Promise<LeagueResults>{
 const season=germanSeason(now);
 try{
  const url=`https://api.openligadb.de/getmatchdata/${league}/${season}`;
  const response=await fetch(url,{next:{revalidate:3600},
   headers:{accept:"application/json"},signal:AbortSignal.timeout(14000)});
  if(!response.ok)throw Error("SOURCE_UNAVAILABLE");
  const json:unknown=await response.json();
  if(!Array.isArray(json))throw Error("INVALID_FEED");
  return selectLeagueResults(json,league,season,now);
 }catch{
  return{league,label:openLeagues.find(l=>l.id===league)?.label??league,
   season,status:"source-unavailable",finished:[],upcoming:[],
   allSeasonCompleted:0,fetchedAt:now.toISOString()};
 }
}
export function openLigaSelfcheck(){
 const sample={matchID:1,matchDateTimeUTC:"2026-10-11T15:30:00Z",
  leagueShortcut:"bl1",leagueSeason:2026,matchIsFinished:true,
  team1:{teamName:"SC Freiburg"},team2:{teamName:"FC Bayern München"},
  matchResults:[
   {resultTypeKind:"HalfTime",pointsTeam1:1,pointsTeam2:0},
   {resultTypeKind:"After90Minutes",pointsTeam1:2,pointsTeam2:1},
  ]};
 const time=new Date("2026-10-14T00:00:00Z");
 const base=parseOpenLigaMatch(sample,"bl1",2026);
 const tests=[
  {name:"Genuine explicit after-90 score, not half time",pass:base?.homeScore===2&&base?.awayScore===1&&base.state==="finished-90"},
  {name:"Unfinished game cannot advertise a final score",pass:parseOpenLigaMatch({...sample,matchIsFinished:false},"bl1",2026)?.homeScore===null},
  {name:"No regulation time marker means unknown, never fake FT",pass:parseOpenLigaMatch({...sample,matchResults:[sample.matchResults[0]]},"bl1",2026)?.state==="unverified"},
  {name:"Extra-time-only result cannot be called regulation FT",pass:parseOpenLigaMatch({...sample,matchResults:[{resultTypeKind:"AfterExtraTime",pointsTeam1:3,pointsTeam2:1}]},"bl1",2026)?.homeScore===null},
  {name:"League, season and IDs must match",pass:parseOpenLigaMatch(sample,"bl2",2026)===null&&parseOpenLigaMatch({...sample,leagueSeason:2025},"bl1",2026)===null},
  {name:"Invalid or duplicate FT rows excluded",pass:parseOpenLigaMatch({...sample,matchResults:[...sample.matchResults,sample.matchResults[1]]},"bl1",2026)?.state==="unverified"},
  {name:"Upcoming games never contribute to season FT",pass:selectLeagueResults([{...sample,matchIsFinished:false,matchDateTimeUTC:"2026-10-15T15:30:00Z"}],"bl1",2026,time).allSeasonCompleted===0},
  {name:"Only selected league's historical completed games counted",pass:selectLeagueResults([sample,{...sample,leagueShortcut:"bl2"}],"bl1",2026,time).allSeasonCompleted===1},
  {name:"Source attribution and legal terms remain explicit",pass:resultsAttribution.provider==="OpenLigaDB"&&resultsAttribution.license==="ODbL 1.0"},
  {name:"No persisted canonical event or fabricated betting edge",pass:!("validatedEdge" in (base??{}))&&!("marketOdds" in (base??{}))},
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
