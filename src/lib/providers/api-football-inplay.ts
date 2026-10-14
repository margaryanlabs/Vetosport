import type {MarketQuote} from "@/lib/domain/types";
import {canonicalSelectionKey} from "@/lib/canonical/id";
import {classifyFixtureProviderFailure} from "@/lib/providers/api-football-finals";

export interface ApiFootballInPlayValue{value?:string|number;odd?:string|number;handicap?:string|number|null;main?:boolean|null;suspended?:boolean|null;}
export interface ApiFootballInPlayMarket{id?:number;name?:string;values?:ApiFootballInPlayValue[];}
export interface ApiFootballInPlayRow{
 fixture?:{id?:number;status?:{elapsed?:number;seconds?:string;long?:string}};
 status?:{stopped?:boolean;blocked?:boolean;finished?:boolean};
 update?:string;
 odds?:ApiFootballInPlayMarket[];
}
export interface ApiFootballInPlayResponse{
 fetchedAt:string;
 rows:ApiFootballInPlayRow[];
 quotaRemaining:number|null;
 pagesTotal:number;
}
const numberHeader=(v:string|null)=>v===null?null:Number.isFinite(Number(v))?Number(v):null;

export async function getApiFootballInPlay(input?:{fixtureId?:number}):Promise<ApiFootballInPlayResponse>{
 const key=process.env.API_FOOTBALL_KEY;
 if(!key)throw Error("API_FOOTBALL_KEY_MISSING");
 // API-Football supports ?fixture=<observed exact ID>. One query, no pagination
 // and no team-name guesswork. Targeted fallback is separately quota-gated.
 const url=new URL("https://v3.football.api-sports.io/odds/live");
 if(input?.fixtureId!==undefined){
  if(!Number.isSafeInteger(input.fixtureId)||input.fixtureId<1)
   throw Error("INVALID_TARGETED_FIXTURE_ID");
  url.searchParams.set("fixture",String(input.fixtureId));
 }
 const response=await fetch(url.toString(),{
  headers:{"x-apisports-key":key,accept:"application/json"},cache:"no-store",
  signal:AbortSignal.timeout(12000),
 });
 const fetchedAt=new Date().toISOString();
 const quotaRemaining=numberHeader(response.headers.get("x-ratelimit-requests-remaining"));
 if(response.status===204)return{fetchedAt,rows:[],quotaRemaining,pagesTotal:1};
 if(!response.ok)throw Error("API_FOOTBALL_LIVE_ODDS_HTTP_"+response.status);
 const body:unknown=await response.json();
 if(!body||typeof body!=="object"||Array.isArray(body))throw Error("API_FOOTBALL_LIVE_ODDS_BAD_BODY");
 const parsed=body as{response?:unknown;errors?:unknown;paging?:{total?:unknown}};
 const classified=classifyFixtureProviderFailure(parsed.errors);
 if(classified)throw Error(classified);
 if(!Array.isArray(parsed.response))throw Error("API_FOOTBALL_LIVE_ODDS_BAD_BODY");
 const pages=typeof parsed.paging?.total==="number"&&Number.isFinite(parsed.paging.total)?parsed.paging.total:1;
 return{fetchedAt,quotaRemaining,pagesTotal:pages,rows:parsed.response.slice(0,50) as ApiFootballInPlayRow[]};
}

export function normalizeInPlayOdds(row:ApiFootballInPlayRow,canonicalEventId:string,now=new Date()):MarketQuote[]{
 const id=row.fixture?.id,update=row.update;
 if(typeof id!=="number"||!Number.isSafeInteger(id)||id<=0||!update)return[];
 const at=Date.parse(update),nowMs=now.getTime();
 // Absolute time of source observation, never substitute fetch clock.
 if(!Number.isFinite(at)||at>nowMs+90_000||nowMs-at>20*60_000)return[];
 const ts=new Date(at).toISOString();
 const locked=row.status?.stopped!==false||row.status?.blocked!==false||row.status?.finished!==false;
 const quotes:MarketQuote[]=[];
 for(const market of row.odds??[]){
  if(typeof market.id!=="number"||!Number.isSafeInteger(market.id)||market.id<0||
    !market.name||!Array.isArray(market.values))continue;
  const unique=new Map<string,MarketQuote>();
  for(const v of market.values){
   const price=Number(v.odd);
   const label=typeof v.value==="number"?String(v.value):v.value;
   if(!label||!Number.isFinite(price)||price<=1||price>1000)continue;
   const line=v.handicap==null||v.handicap===""?undefined:Number(v.handicap);
   if(line!==undefined&&!Number.isFinite(line))continue;
   const side=/^under\b/i.test(label)?"under":/^over\b/i.test(label)?"over":undefined;
   const selectionId=canonicalSelectionKey({label:String(label),line});
   const quote:MarketQuote={
    eventId:canonicalEventId,marketId:"api-football.live."+market.id,
    selection:{id:selectionId,label:String(label)+(line===undefined?"":" · "+line),line,side},
    // LIVE endpoint provides market odds but does not identify a betting operator.
    // Do NOT invent a bookmaker.
    bookmaker:"API-Football · букмекер не указан",
    decimalOdds:price,capturedAt:ts,providerLastUpdate:ts,sourceProvider:"api-football-live-odds",
    suspended:locked||v.suspended!==false,
    raw:{sourceFixtureId:id,marketName:market.name,marketId:market.id,
      statusBlocked:row.status?.blocked,statusStopped:row.status?.stopped,statusFinished:row.status?.finished,
      main:v.main??null,bookmakerVerified:false},
   };
   // Repeated selections: choose explicitly MAIN; otherwise preserve first (do not claim best).
   const previous=unique.get(selectionId);
   if(!previous||(!previous.raw?.main&&v.main===true))unique.set(selectionId,quote);
  }
  quotes.push(...unique.values());
  if(quotes.length>=200)break;
 }
 return quotes.slice(0,200);
}

/**
 * One optional extra call per 4h cron bucket (up to six per day).
 * The global live-odds list may be paginated / dominated by other leagues,
 * so an exact observed provider fixture ID is the only safe fallback.
 * The fallback never runs when the global call already matched a fixture.
 */
export function planTargetedInplayProbe(input:{
 fixtureIds:number[];globalFixtureIds:number[];globalPages:number;
 remaining:number|null;asOf:string;previousProbeBucket?:number|null;
}):{fixtureId:number|null;bucket:number|null;reason:string}{
 const time=Date.parse(input.asOf);
 if(!Number.isFinite(time))return{fixtureId:null,bucket:null,reason:"INVALID_CLOCK"};
 const bucket=Math.floor(time/(4*3600000));
 const utcHour=new Date(time).getUTCHours();
 if(utcHour%4!==0)return{fixtureId:null,bucket,reason:"OUTSIDE_FOUR_HOUR_SLOT"};
 if(input.previousProbeBucket===bucket)return{fixtureId:null,bucket,reason:"BUCKET_ALREADY_PROBED"};
 // Remaining is measured on the global call, not estimated from config.
 // Missing or nearly exhausted quota does not authorize extra requests.
 if(input.remaining===null||!Number.isFinite(input.remaining)||input.remaining<=22)
  return{fixtureId:null,bucket,reason:"QUOTA_NOT_PROVEN_SAFE"};
 const ids=[...new Set(input.fixtureIds.filter(id=>Number.isSafeInteger(id)&&id>0))]
  .sort((a,b)=>a-b);
 if(!ids.length)return{fixtureId:null,bucket,reason:"NO_EXACT_FIXTURES"};
 const globalIds=new Set(input.globalFixtureIds);
 if(ids.some(id=>globalIds.has(id)))
  return{fixtureId:null,bucket,reason:"GLOBAL_ALREADY_COVERS_FIXTURE"};
 if(input.globalPages<=1&&input.globalFixtureIds.length===0)
  return{fixtureId:null,bucket,reason:"NO_ACTIVE_UPSTREAM_ODDS"};
 return{fixtureId:ids[bucket%ids.length],bucket,reason:"TARGET_EXACT_FIXTURE"};
}
export function targetedInplayProbeSelfcheck(){
 const common:{fixtureIds:number[];globalFixtureIds:number[];globalPages:number;
  remaining:number|null;asOf:string;previousProbeBucket:number|null}={
  fixtureIds:[31,17],globalFixtureIds:[999],globalPages:3,
  remaining:70,asOf:"2026-10-14T12:00:00Z",previousProbeBucket:null};
 const plan=(diff:Partial<typeof common>)=>planTargetedInplayProbe({...common,...diff});
 const selected=plan({});
 const checks=[
  {name:"Explicit observed fixture can be selected when global list misses it",
   pass:selected.fixtureId!==null&&[17,31].includes(selected.fixtureId)},
  {name:"Do not pay another call when global response already matched",
   pass:plan({globalFixtureIds:[999,17]}).fixtureId===null},
  {name:"Do not pay another call without confirmed quota remaining",
   pass:plan({remaining:null}).fixtureId===null},
  {name:"Reserve 20 daily requests plus safety margin",
   pass:plan({remaining:22}).fixtureId===null&&plan({remaining:23}).fixtureId!==null},
  {name:"Only six scheduled probe windows per UTC day",
   pass:plan({asOf:"2026-10-14T14:00:00Z"}).fixtureId===null},
  {name:"Never query a guessed or invalid fixture",
   pass:plan({fixtureIds:[0,-1,NaN]}).fixtureId===null},
  {name:"Same four-hour bucket cannot be probed twice",
   pass:plan({previousProbeBucket:selected.bucket}).fixtureId===null},
  {name:"Empty global odds with only one upstream page does not burn a probe",
   pass:plan({globalFixtureIds:[],globalPages:1}).fixtureId===null},
 ];
 return{passed:checks.every(c=>c.pass),checks};
}

export const inPlayProviderFailureSelfcheck=()=>{
 const classify=(errors:unknown)=>classifyFixtureProviderFailure(errors);
 const checks=[
  {name:"Provider plan errors are not confused with an empty valid response",
   pass:classify({plan:"provider-private-text"})==="UPSTREAM_SUBSCRIPTION"},
  {name:"Daily free source quota exhaustion classified without raw secrets",
   pass:classify({requests:"secret quota text"})==="UPSTREAM_DAILY_QUOTA"},
  {name:"Empty provider errors object permits empty valid response",pass:classify({})===null},
 ];
 return{passed:checks.every(c=>c.pass),checks};
};
export function inPlayNormalizerSelfcheck(){
 const now=new Date("2026-10-12T12:00:00Z");
 const base:ApiFootballInPlayRow={fixture:{id:123,status:{elapsed:82}},status:{stopped:false,blocked:false,finished:false},update:"2026-10-12T11:59:30Z",
  odds:[{id:36,name:"Over/Under Line",values:[{value:"Under",odd:"1.25",handicap:"4.5",main:true,suspended:false}]}]};
 const q=normalizeInPlayOdds(base,"match",now)[0];
 const checks=[
  {name:"Exact known fixture produces one price",pass:normalizeInPlayOdds(base,"match",now).length===1&&q.eventId==="match"},
  {name:"Odds and handicap real provider fields",pass:q.decimalOdds===1.25&&q.selection.line===4.5&&q.selection.side==="under"},
  {name:"Bookmaker identity not fabricated",pass:q.raw?.bookmakerVerified===false&&q.bookmaker.includes("не указан")},
  {name:"Actual provider time preserved",pass:q.capturedAt==="2026-10-12T11:59:30.000Z"},
  {name:"Stale quotes dropped",pass:normalizeInPlayOdds({...base,update:"2026-10-12T10:00:00Z"},"match",now).length===0},
  {name:"Future provider timestamps dropped",pass:normalizeInPlayOdds({...base,update:"2026-10-12T12:05:00Z"},"match",now).length===0},
  {name:"Blocked market suspended",pass:normalizeInPlayOdds({...base,status:{...base.status,blocked:true}},"match",now)[0].suspended===true},
  {name:"Missing status defaults to suspended",pass:normalizeInPlayOdds({...base,status:undefined},"match",now)[0].suspended===true},
  {name:"Invalid prices excluded",pass:normalizeInPlayOdds({...base,odds:[{id:36,name:"total",values:[{value:"Under",odd:"0.2"}]}]},"match",now).length===0},
  {name:"Duplicate line selection deduped",pass:normalizeInPlayOdds({...base,odds:[{id:36,name:"total",values:[{value:"Under",odd:"1.2",handicap:"4.5",main:false},{value:"Under",odd:"1.4",handicap:"4.5",main:true,suspended:false}]}]},"match",now).length===1},
  {name:"No fabricated event state/score",pass:!Object.hasOwn(q.raw??{},"score")&&!Object.hasOwn(q.raw??{},"eventStatus")},
 ];
 return {passed:checks.every(c=>c.pass),checks};
}
