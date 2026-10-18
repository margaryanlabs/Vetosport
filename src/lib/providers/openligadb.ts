/** Community Bundesliga data, no key and no commercial LIVE clock authority.
 * ODbL source attribution: https://www.openligadb.de/
 * Only full-time resultTypeID=2 / After90Minutes qualifies as a historical
 * prematch *training* result; never promote community FT into the trusted
 * independently-certified settlement/ROI system.
 */
export const OPENLIGADB_SOURCE="openligadb-community";
export const OPENLIGADB_MODEL="football.bundesliga.team-poisson.v1";
export const OPENLIGADB_FEATURE="football.bundesliga.team-poisson-input.v1";
export type OpenLigaRaw={
 matchID?:unknown;leagueShortcut?:unknown;leagueSeason?:unknown;
 matchDateTimeUTC?:unknown;matchIsFinished?:unknown;
 lastUpdateDateTime?:unknown;
 team1?:{teamId?:unknown;teamName?:unknown};
 team2?:{teamId?:unknown;teamName?:unknown};
 matchResults?:Array<{resultTypeID?:unknown;resultTypeKind?:unknown;
  pointsTeam1?:unknown;pointsTeam2?:unknown}>;
};
export type GermanFixture={
 id:number;season:number;startsAt:string;updatedAt:string|null;
 homeId:number;awayId:number;home:string;away:string;
 final:{home:number;away:number}|null;
 source:"OPENLIGADB_COMMUNITY";
};
const numericId=(id:unknown)=>typeof id==="number"&&Number.isSafeInteger(id)&&id>0&&id<1e9;
const goals=(n:unknown)=>typeof n==="number"&&Number.isInteger(n)&&n>=0&&n<=25;
const iso=(s:unknown):string|null=>{
 if(typeof s!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s))return null;
 const n=Date.parse(s);return Number.isFinite(n)?new Date(n).toISOString():null;
};
const localUpdate=(value:unknown)=>{
 // OpenLigaDB lastUpdateDateTime has NO timezone. Never use it to prove a
 // historic cut-off: its timezone cannot be independently reconstructed.
 // Include it as descriptive string only, not a trustworthy timestamp.
 return typeof value==="string"&&value.length<=70?value:null;
};
export function normalizeOpenLigaMatch(raw:OpenLigaRaw,season:number):GermanFixture|null{
 if(raw.leagueShortcut!=="bl1"||raw.leagueSeason!==season||
   !numericId(raw.matchID)||!numericId(raw.team1?.teamId)||
   !numericId(raw.team2?.teamId)||raw.team1!.teamId===raw.team2!.teamId)return null;
 const start=iso(raw.matchDateTimeUTC);
 const home=raw.team1?.teamName,away=raw.team2?.teamName;
 if(!start||typeof home!=="string"||typeof away!=="string"||
  !home.trim()||!away.trim()||home.length>90||away.length>90)return null;
 const valid=(raw.matchResults??[]).filter(r=>r.resultTypeID===2&&
  r.resultTypeKind==="After90Minutes"&&
  goals(r.pointsTeam1)&&goals(r.pointsTeam2));
 const final=raw.matchIsFinished===true&&valid.length===1?
  {home:valid[0].pointsTeam1 as number,away:valid[0].pointsTeam2 as number}:null;
 return{id:raw.matchID as number,season,startsAt:start,
  updatedAt:localUpdate(raw.lastUpdateDateTime),
  homeId:raw.team1!.teamId as number,awayId:raw.team2!.teamId as number,
  home:home.trim(),away:away.trim(),final,source:"OPENLIGADB_COMMUNITY"};
}
export function parseBundesligaSeason(value:unknown,season:number):GermanFixture[]{
 if(!Array.isArray(value)||value.length>380)return[];
 const found=new Set<number>(),rows:GermanFixture[]=[];
 for(const v of value){
  if(!v||typeof v!=="object"||Array.isArray(v))continue;
  const normalized=normalizeOpenLigaMatch(v as OpenLigaRaw,season);
  if(!normalized||found.has(normalized.id))continue;
  found.add(normalized.id);rows.push(normalized);
 }
 return rows;
}
export async function fetchBundesligaSeason(season:number):Promise<GermanFixture[]>{
 if(!Number.isInteger(season)||season<2020||season>2035)throw Error("INVALID_BUNDESLIGA_SEASON");
 const res=await fetch("https://api.openligadb.de/getmatchdata/bl1/"+season,{
  cache:"no-store",headers:{accept:"application/json"},
  signal:AbortSignal.timeout(14000)});
 if(!res.ok)throw Error(res.status===429?"OPENLIGADB_RATE_LIMIT":"OPENLIGADB_UPSTREAM");
 const clen=Number(res.headers.get("content-length")??0);
 if(clen>2500000)throw Error("OPENLIGADB_OVERSIZED_RESPONSE");
 const body=await res.text();
 if(body.length>2500000)throw Error("OPENLIGADB_OVERSIZED_RESPONSE");
 let payload:unknown;
 try{payload=JSON.parse(body)}catch{throw Error("OPENLIGADB_MALFORMED_RESPONSE")}
 if(!Array.isArray(payload)||payload.length>380)throw Error("OPENLIGADB_MALFORMED_RESPONSE");
 const rows=parseBundesligaSeason(payload,season);
 if(rows.length<10)throw Error("OPENLIGADB_INSUFFICIENT_COVERAGE");
 return rows;
}
export function openLigaDataSelfcheck(){
 const template:OpenLigaRaw={matchID:123456,leagueShortcut:"bl1",
  leagueSeason:2026,matchDateTimeUTC:"2026-10-18T18:30:00Z",
  lastUpdateDateTime:"2026-10-18T20:29:10",matchIsFinished:true,
  team1:{teamId:1,teamName:"Bayern"},team2:{teamId:2,teamName:"Stuttgart"},
  matchResults:[
   {resultTypeID:1,resultTypeKind:"HalfTime",pointsTeam1:0,pointsTeam2:1},
   {resultTypeID:2,resultTypeKind:"After90Minutes",pointsTeam1:2,pointsTeam2:1},
  ]};
 const run=(m:OpenLigaRaw)=>normalizeOpenLigaMatch(m,2026);
 const checks=[
  {name:"Exact Bundesliga fixture and regulation FT parsed",passed:run(template)?.final?.home===2},
  {name:"Half-time never settles a full-time contract",
   passed:run({...template,matchResults:template.matchResults?.slice(0,1)})?.final===null},
  {name:"Unfinished community score never becomes FT",
   passed:run({...template,matchIsFinished:false})?.final===null},
  {name:"Unrelated league excluded",passed:run({...template,leagueShortcut:"bl2"})===null},
  {name:"Wrong season excluded",passed:run({...template,leagueSeason:2025})===null},
  {name:"Duplicate final scores fail closed",
   passed:run({...template,matchResults:[...template.matchResults!,template.matchResults![1]]})?.final===null},
  {name:"Invalid final scores fail closed",
   passed:run({...template,matchResults:[{resultTypeID:2,resultTypeKind:"After90Minutes",
     pointsTeam1:-4,pointsTeam2:2}]})?.final===null},
  {name:"Missing timezone-qualified kickoff rejected",passed:run({...template,matchDateTimeUTC:"2026-10-18T18:30:00"})===null},
  {name:"Same team identifier rejected",passed:run({...template,team2:{teamId:1,teamName:"Bayern"}})===null},
  {name:"Community FT cannot be mistaken for trusted final certification",
   passed:run(template)?.source==="OPENLIGADB_COMMUNITY"},
 ];
 return{passed:checks.every(x=>x.passed),checks};
}
