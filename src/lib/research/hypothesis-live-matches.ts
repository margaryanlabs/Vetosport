/** Match archived research patterns to current source-observed football states.
 * Does NOT promote exploratory patterns to a betting edge, and never predicts
 * a final result from a score observed after the quoted market timestamp.
 */
import type {PersistedEvent,PersistedEventStateRecord,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";
import type {DiscoveredPattern} from "@/lib/research/auto-discovery";
import {observedFootballState,observedPatternKeyFor} from "@/lib/research/auto-discovery";
import {paperContractFromQuote,type PaperContract} from "@/lib/paper/paper-verification";
import type {LiveEventSummary,LiveQuotePreview} from "@/lib/live/types";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

export type HypothesisLiveMatch={
 id:string;eventId:string;match:string;competition:string;
 eventStartsAt:string;observedAt:string;minute:number;score:{home:number;away:number};
 hypothesisId:string;hypothesisLabel:string;family:string;
 settled:number;hitRate:number|null;holdoutCount:number;holdoutHitRate:number|null;
 quote:null|{provider:string;bookmaker:string;odds:number;capturedAt:string;providerUpdatedAt:string;contract:PaperContract};
 stage:"SOURCE_OBSERVATION"|"INDICATIVE_PAPER_ONLY";
 validatedEdge:false;executablePriceVerified:false;researchOnly:true;
 reasons:string[];
};

const ALLOWED_PROVIDERS=new Set(["the-odds-api","api-football-live-odds"]);
const MAX_SOURCE_AGE=120_000;
const validTime=(value:string,now:number)=>{const t=Date.parse(value);return Number.isFinite(t)&&t<=now&&now-t<=MAX_SOURCE_AGE;};
const marketContract=(family:string):PaperContract|null=>{
 if(family==="btts-yes")return "FT_BTTS_YES";
 if(family==="btts-no")return "FT_BTTS_NO";
 const total=family.match(/^under-([1-4])\.5$/);
 return total?("FT_TOTAL_UNDER_"+total[1]+"_5") as PaperContract:null;
};
function label(event:PersistedEvent,s:{minute:number;score:{home:number;away:number}}):LiveEventSummary{
 return{id:event.id,source:"persisted",sport:"football",sportLabel:"Football",
  competition:event.event.competition,status:"live",clock:String(s.minute),
  period:"2H",homeCode:"H",awayCode:"A",
  homeName:event.event.home?.name??"",awayName:event.event.away?.name??"",
  homeScore:String(s.score.home),awayScore:String(s.score.away),
  pulse:"quiet",markets:0,repriced:0,intelligenceReady:false};
}
const directContract=(q:PersistedMarketQuoteRecord):PaperContract|null=>{
 // API-Football's ID 25 is already safely mapped by paperContractFromQuote.
 // The Odds API's full-time soccer totals market has a distinct raw key.
 const match=q.provider==="the-odds-api"&&q.marketKey==="soccer_epl.totals"&&
  q.line!==undefined&&[1.5,2.5,3.5,4.5].includes(q.line)&&
  q.selectionLabel.trim().toLowerCase()==="under";
 if(!match)return null;
 return ("FT_TOTAL_UNDER_"+Math.floor(q.line!)+"_5") as PaperContract;
};
function freshSameStateQuote(event:PersistedEvent,state:PersistedEventStateRecord,
 family:string,quotes:PersistedMarketQuoteRecord[],now:number,quotesCapped:boolean){
 if(quotesCapped)return null;
 const wanted=marketContract(family);
 if(!wanted)return null;
 const snapshot=observedFootballState(state.state);
 if(!snapshot)return null;
 const fixture=label(event,snapshot);
 const candidates=quotes.filter(q=>{
  const priceAt=Date.parse(q.capturedAt);
  const upstreamAt=Date.parse(q.providerLastUpdate??"");
  const stateAt=Date.parse(state.capturedAt);
  if(q.eventId!==event.id||!ALLOWED_PROVIDERS.has(q.provider)||q.suspended!==false||
   !q.bookmaker.trim()||/не указан|unknown|unidentified/i.test(q.bookmaker)||
   !Number.isFinite(q.decimalOdds)||q.decimalOdds<=1||q.decimalOdds>1000||
   !validTime(q.capturedAt,now)||!validTime(q.providerLastUpdate??"",now)||
   // Quote must be provided/updated AFTER the observed score, not before.
   upstreamAt<stateAt||priceAt<stateAt||upstreamAt>priceAt)return false;
  const preview:LiveQuotePreview={provider:q.provider,bookmaker:q.bookmaker,marketKey:q.marketKey,
   selectionKey:q.selectionKey,selectionLabel:q.selectionLabel,decimalOdds:q.decimalOdds,
   capturedAt:q.capturedAt,suspended:q.suspended};
  return (paperContractFromQuote(fixture,preview)??directContract(q))===wanted;
 });
 // Pick chronologically latest verified capture, deterministic tie-breaker;
 // never select a quote using the final match result.
 candidates.sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt)||
  a.bookmaker.localeCompare(b.bookmaker)||a.decimalOdds-b.decimalOdds);
 const price=candidates[0];
 return price?{provider:price.provider,bookmaker:price.bookmaker,odds:price.decimalOdds,
  capturedAt:price.capturedAt,providerUpdatedAt:price.providerLastUpdate!,contract:wanted}:null;
}
/**
 * Source-gated candidate discovery. The live observed state is never combined
 * with a retroactively captured price. Cohort hit rates stay descriptive only.
 */
export function buildHypothesisLiveMatches(input:{
 events:PersistedEvent[];states:PersistedEventStateRecord[];
 patterns:DiscoveredPattern[];quotes:PersistedMarketQuoteRecord[];
 asOf:string;quotesCapped?:boolean;maxResults?:number;
}):HypothesisLiveMatch[]{
 const now=Date.parse(input.asOf);
 if(!Number.isFinite(now))return[];
 const byEvent=new Map<string,PersistedEventStateRecord>();
 for(const s of input.states){
  if(s.sourceProvider!=="api-football"||s.state.status!=="live"||
   !validTime(s.capturedAt,now)||!observedFootballState(s.state))continue;
  const prev=byEvent.get(s.eventId);
  if(!prev||Date.parse(prev.capturedAt)<Date.parse(s.capturedAt))byEvent.set(s.eventId,s);
 }
 const eligiblePatterns=input.patterns.filter(p=>p.sport==="football"&&
  p.status!=="NEEDS_FINAL_RESULTS"&&p.settled>0&&!p.validatedEdge);
 const results:HypothesisLiveMatch[]=[];
 for(const event of input.events){
  const start=Date.parse(event.event.startsAt),state=byEvent.get(event.id);
  if(event.event.sport!=="football"||event.event.status!=="live"||
   isSelfcheckEvent(event)||!state||
   !Number.isFinite(start)||start>now||now-start>4*3600_000||
   !event.event.home?.name||!event.event.away?.name)continue;
  const observation=observedFootballState(state.state);
  if(!observation)continue;
  for(const pattern of eligiblePatterns){
   if(observedPatternKeyFor({...observation,family:pattern.family})!==pattern.id)continue;
   const price=freshSameStateQuote(event,state,pattern.family,input.quotes,now,Boolean(input.quotesCapped));
   const sufficientHoldout=pattern.holdoutCount>=18&&pattern.settled>=60;
   const stage=price&&sufficientHoldout?"INDICATIVE_PAPER_ONLY":"SOURCE_OBSERVATION";
   const reasons=[
    "Текущая ситуация совпадает с архивной гипотезой; это не прогноз с доказанной доходностью.",
    sufficientHoldout?"Наличие holdout не подтверждает правильную цену и калибровку.":"Недостаточно независимых подтверждённых завершений для надёжной оценки.",
    price?"Найдена свежая исходная котировка; реальная исполнимость не проверена.":"Нет свежего однозначного подтверждения букмекерской цены после снимка счёта.",
    ...(input.quotesCapped?["Выборка котировок достигла лимита; цены не подтверждаем."]:[]),
   ];
   results.push({
    id:event.id+"::"+pattern.id,eventId:event.id,
    match:event.event.home.name+" — "+event.event.away.name,
    competition:event.event.competition,eventStartsAt:event.event.startsAt,
    observedAt:state.capturedAt,minute:observation.minute,score:observation.score,
    hypothesisId:pattern.id,hypothesisLabel:pattern.label,family:pattern.family,
    settled:pattern.settled,hitRate:pattern.hitRate,
    holdoutCount:pattern.holdoutCount,holdoutHitRate:pattern.holdoutHitRate,
    quote:price,stage,validatedEdge:false,executablePriceVerified:false,
    researchOnly:true,reasons,
   });
  }
 }
 results.sort((a,b)=>
  Number(b.stage==="INDICATIVE_PAPER_ONLY")-Number(a.stage==="INDICATIVE_PAPER_ONLY")||
  b.settled-a.settled||Date.parse(b.observedAt)-Date.parse(a.observedAt)||
  a.id.localeCompare(b.id));
 // Prevent one heavily scanned match from monopolizing the page.
 const perEvent=new Map<string,number>(),max=Math.max(1,Math.min(30,input.maxResults??18));
 return results.filter(r=>{
  const count=perEvent.get(r.eventId)??0;
  if(count>=3)return false;
  perEvent.set(r.eventId,count+1);return true;
 }).slice(0,max);
}
export function hypothesisLiveMatchesSelfcheck(){
 const at="2026-10-18T12:00:00Z";
 const event:PersistedEvent={id:"event",canonicalKey:"football::epl::test",event:{
  id:"provider-10",sport:"football",competition:"League",status:"live",
  startsAt:"2026-10-18T11:00:00Z",
  home:{id:"h",name:"Home"},away:{id:"a",name:"Away"}}};
 const state:PersistedEventStateRecord={eventId:"event",sourceProvider:"api-football",
  capturedAt:"2026-10-18T11:59:00Z",state:{status:"live",score:{home:1,away:1},clock:"81′"}};
 const pattern:DiscoveredPattern={id:"late__score-1-1__under-3.5",label:"75–89′ · счёт 1:1 → ТМ 3.5",
  question:"",sport:"football",family:"under-3.5",observations:90,settled:70,wins:55,
  hitRate:55/70,lower95:.66,holdoutCount:21,holdoutWins:16,holdoutHitRate:16/21,
  status:"EXPLORATORY",verifiedOddsCount:0,validatedEdge:false};
 const quote:PersistedMarketQuoteRecord={eventId:"event",provider:"api-football-live-odds",
  marketKey:"api-football.live.25",selectionKey:"under:3.5",selectionLabel:"Under · 3.5",
  bookmaker:"Book",decimalOdds:1.4,suspended:false,
  capturedAt:"2026-10-18T11:59:40Z",providerLastUpdate:"2026-10-18T11:59:20Z"};
 const run=(overrides:Partial<Parameters<typeof buildHypothesisLiveMatches>[0]>={})=>
  buildHypothesisLiveMatches({events:[event],states:[state],patterns:[pattern],quotes:[quote],asOf:at,...overrides});
 const valid=run();
 const checks=[
  {name:"Current real source + matching hypothesis has explicit research-only label",
   pass:valid.length===1&&valid[0].validatedEdge===false&&valid[0].stage==="INDICATIVE_PAPER_ONLY"},
  {name:"Exact source-price timestamp after score required",
   pass:run({quotes:[{...quote,providerLastUpdate:"2026-10-18T11:58:30Z"}]})[0]?.quote===null},
  {name:"Expired quote never promoted",pass:run({quotes:[{...quote,capturedAt:"2026-10-18T11:49:40Z"}]})[0]?.quote===null},
  {name:"Incomplete quote metadata never becomes verified price",
   pass:run({quotes:[{...quote,providerLastUpdate:undefined}]})[0]?.quote===null},
  {name:"Suspended market never becomes paper hypothesis",
   pass:run({quotes:[{...quote,suspended:true}]})[0]?.stage==="SOURCE_OBSERVATION"},
  {name:"Other market is not same selection",pass:run({quotes:[{...quote,selectionKey:"over:3.5",selectionLabel:"Over · 3.5"}]})[0]?.quote===null},
  {name:"Wrong event market not used",pass:run({quotes:[{...quote,eventId:"other"}]})[0]?.quote===null},
  {name:"Truncated quote data fails closed",pass:run({quotesCapped:true})[0]?.quote===null},
  {name:"Unmatched archive bucket makes no live candidate",
   pass:run({patterns:[{...pattern,id:"opening__score-1-1__under-3.5"}]}).length===0},
  {name:"Stale live source cannot create a future opportunity",
   pass:run({states:[{...state,capturedAt:"2026-10-18T11:40:00Z"}]}).length===0},
  {name:"Future score cannot create a candidate",
   pass:run({states:[{...state,capturedAt:"2026-10-18T12:01:00Z"}]}).length===0},
  {name:"No historical settlement => hypothesis is not promoted",
   pass:run({patterns:[{...pattern,settled:0,status:"NEEDS_FINAL_RESULTS"}]}).length===0},
  {name:"Weak holdout doesn't authorize paper status",
   pass:run({patterns:[{...pattern,settled:20,holdoutCount:6}]} )[0]?.stage==="SOURCE_OBSERVATION"},
  {name:"Generic API-Football second half ID cannot masquerade as full-time totals",
   pass:run({quotes:[{...quote,marketKey:"api-football.live.36"}]})[0]?.quote===null},
 ];
 return {passed:checks.every(x=>x.pass),checks};
}
