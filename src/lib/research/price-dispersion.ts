/** Source-observed bookmaker quote dispersion, not an actionable betting edge.
 * No generated odds, derived model probability, or cross-market comparisons.
 */
import type {PersistedEvent,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

export type PriceAnomaly={
 id:string;eventId:string;match:string;competition:string;
 marketKey:string;selectionKey:string;line:number|null;provider:string;
 medianOdds:number;highestObservedOdds:number;highestBookmaker:string;
 deviationPct:number;bookmakerCount:number;lastCapturedAt:string;
 classification:"PRICE_DISPERSION_RESEARCH";
 validatedEdge:false;executionVerified:false;researchOnly:true;
};
const age=(when:string,now:number)=>{const t=Date.parse(when);return Number.isFinite(t)&&t<=now?now-t:Infinity};
const MAX_QUOTE_AGE=120_000,MAX_PROVIDER_AGE=120_000;
export function findPriceDispersion(input:{
 events:PersistedEvent[];quotes:PersistedMarketQuoteRecord[];asOf:string;
 quotesCapped?:boolean;limit?:number;
}):PriceAnomaly[]{
 const now=Date.parse(input.asOf);
 // Full snapshot is necessary to compare bookmakers; truncated odds fail closed.
 if(!Number.isFinite(now)||input.quotesCapped)return[];
 const active=new Map(input.events.filter(e=>e.event.sport==="football"&&
  !isSelfcheckEvent(e)&&["scheduled","live"].includes(e.event.status)&&
  Number.isFinite(Date.parse(e.event.startsAt))&&
  (e.event.status==="scheduled"?Date.parse(e.event.startsAt)>=now:
   now-Date.parse(e.event.startsAt)<4*3600_000))
  .map(e=>[e.id,e]));
 const grouped=new Map<string,PersistedMarketQuoteRecord[]>();
 for(const q of input.quotes){
  const e=active.get(q.eventId);
  if(!e||!["the-odds-api","api-football-live-odds"].includes(q.provider)||
   !q.bookmaker.trim()||/не указан|unknown|unidentified/i.test(q.bookmaker)||
   q.suspended!==false||
   !Number.isFinite(q.decimalOdds)||q.decimalOdds<=1||q.decimalOdds>1000||
   age(q.capturedAt,now)>MAX_QUOTE_AGE||
   age(q.providerLastUpdate??"",now)>MAX_PROVIDER_AGE||
   Date.parse(q.providerLastUpdate!)>Date.parse(q.capturedAt))continue;
  const key=[q.eventId,q.provider,q.marketKey,q.selectionKey,q.line??"no-line"].join("|");
  const prev=grouped.get(key)??[];prev.push(q);grouped.set(key,prev);
 }
 const anomalies:PriceAnomaly[]=[];
 for(const [key,records] of grouped){
  // Choose latest quote for each bookmaker; require near-synchronous samples.
  const latest=new Map<string,PersistedMarketQuoteRecord>();
  for(const q of records.sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt))){
   if(!latest.has(q.bookmaker))latest.set(q.bookmaker,q);
  }
  const candidates=[...latest.values()].sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt));
  if(candidates.length<3)continue;
  const anchor=Date.parse(candidates[0].capturedAt);
  const aligned=candidates.filter(q=>anchor-Date.parse(q.capturedAt)<=90_000);
  if(aligned.length<3)continue;
  const prices=aligned.map(q=>q.decimalOdds).sort((a,b)=>a-b);
  const middle=Math.floor(prices.length/2);
  const median=prices.length%2?prices[middle]:(prices[middle-1]+prices[middle])/2;
  const highest=[...aligned].sort((a,b)=>b.decimalOdds-a.decimalOdds||
   a.bookmaker.localeCompare(b.bookmaker))[0];
  const delta=(highest.decimalOdds-median)/median;
  if(!Number.isFinite(delta)||delta<.12)continue;
  const market=aligned[0],event=active.get(market.eventId);
  if(!event||!event.event.home?.name||!event.event.away?.name)continue;
  anomalies.push({
   id:key,eventId:event.id,
   match:event.event.home.name+" — "+event.event.away.name,
   competition:event.event.competition,marketKey:market.marketKey,selectionKey:market.selectionKey,
   line:market.line??null,provider:market.provider,
   medianOdds:Number(median.toFixed(3)),
   highestObservedOdds:highest.decimalOdds,highestBookmaker:highest.bookmaker,
   deviationPct:Number((delta*100).toFixed(1)),bookmakerCount:aligned.length,
   lastCapturedAt:new Date(anchor).toISOString(),
   classification:"PRICE_DISPERSION_RESEARCH",validatedEdge:false,executionVerified:false,researchOnly:true,
  });
 }
 return anomalies.sort((a,b)=>b.deviationPct-a.deviationPct||
  Date.parse(b.lastCapturedAt)-Date.parse(a.lastCapturedAt)).slice(0,Math.max(1,Math.min(input.limit??16,30)));
}
export function priceDispersionSelfcheck(){
 const asOf="2026-10-18T12:00:00Z";
 const event:PersistedEvent={id:"e",canonicalKey:"football::epl::1",
  event:{id:"fixture",sport:"football",competition:"League",status:"scheduled",
   startsAt:"2026-10-18T16:00:00Z",
   home:{id:"h",name:"Home"},away:{id:"a",name:"Away"}}};
 const quotes=[1.9,1.91,2.22].map((odds,i):PersistedMarketQuoteRecord=>({
  eventId:"e",provider:"the-odds-api",bookmaker:"Book"+i,
  marketKey:"soccer_epl.h2h",selectionKey:"Draw",selectionLabel:"Draw",
  decimalOdds:odds,suspended:false,capturedAt:"2026-10-18T11:59:40Z",
  providerLastUpdate:"2026-10-18T11:59:32Z",
 }));
 const run=(patch:Partial<Parameters<typeof findPriceDispersion>[0]>={})=>
  findPriceDispersion({events:[event],quotes,asOf,...patch});
 const checks=[
  {name:"Three source bookmakers detect a price-dispersion observation without EDGE",
   pass:run().length===1&&!run()[0].validatedEdge&&run()[0].bookmakerCount===3},
  {name:"Two distinct bookmakers never constitute independent quorum",
   pass:run({quotes:quotes.slice(0,2)}).length===0},
  {name:"Duplicate same bookmaker does not inflate quorum",
   pass:run({quotes:[quotes[0],{...quotes[0]},quotes[1]]}).length===0},
  {name:"Outdated quote blocked",
   pass:run({quotes:quotes.map(q=>({...q,providerLastUpdate:"2026-10-18T11:52:00Z"}))}).length===0},
  {name:"Different selection and market cannot be compared",
   pass:run({quotes:[quotes[0],quotes[1],{...quotes[2],selectionKey:"Home"}]}).length===0},
  {name:"Suspended quote excluded",pass:run({quotes:[quotes[0],quotes[1],{...quotes[2],suspended:true}]}).length===0},
  {name:"Truncated sample fails closed",pass:run({quotesCapped:true}).length===0},
  {name:"Ordinary small price spread isn't called an anomaly",
   pass:run({quotes:quotes.map((q,i)=>({...q,decimalOdds:1.9+i*.01}))}).length===0},
 ];
 return {passed:checks.every(x=>x.pass),checks};
}
