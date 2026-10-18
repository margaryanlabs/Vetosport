/**
 * Transparent full-time 1X2 market reference from exact persisted EPL quotes.
 * NOT a VETO independent predictive model, not a recommendation or claimed EV.
 * No external calls, inferred bookmaker odds, post-event source inputs,
 * price mixing between different bookmaker snapshots, or wager execution.
 */
import type {PersistedEvent,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";
import {isExactEplFixture} from "@/lib/paper/epl-exact-identity";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";

export type MarketReference={
 eventId:string;match:string;competition:string;startsAt:string;
 sampleAt:string;latestSourceAt:string;
 bookmakers:number;source:"PERSISTED_THE_ODDS_API";
 probability:{home:number;draw:number;away:number};
 minMax:{home:[number,number];draw:[number,number];away:[number,number]};
 overroundPct:{min:number;max:number;median:number};
 freshestBookmakers:string[];
 confidence:"MARKET_REFERENCE_ONLY";independentVetoModel:false;
 executablePriceVerified:false;profitabilityVerified:false;
 };
const MAX_QUOTE_AGE_MS=4*3600_000;
const MAX_BOOKMAKER_SPREAD_MS=15*60_000;
const norm=(v:string)=>v.toLowerCase().trim().replace(/\s+/g," ");
type Bundle={bookmaker:string;at:number;upstreamAt:number;h:number;d:number;a:number;overround:number;};
type Group={bookmaker:string;at:string;quotes:PersistedMarketQuoteRecord[]};

function coherentTrio(event:PersistedEvent,group:Group):Bundle|null{
 const home=norm(event.event.home?.name??""),away=norm(event.event.away?.name??"");
 const unique=(name:string)=>{
  const a=group.quotes.filter(q=>norm(q.selectionLabel)===name);
  return a.length===1?a[0]:null;
 };
 const h=unique(home),d=unique("draw"),a=unique(away);
 if(!h||!d||!a)return null;
 const odds=[h.decimalOdds,d.decimalOdds,a.decimalOdds];
 const inv=odds.map(o=>1/o),overround=inv.reduce((s,n)=>s+n,0);
 if(!Number.isFinite(overround)||overround<1||overround>1.4)return null;
 // Upstream source last_update can differ slightly by outcome, but must
 // be no later than the capture and close enough to be one snapshot.
 const captures=[h,d,a].map(x=>Date.parse(x.capturedAt));
 const upstream=[h,d,a].map(x=>Date.parse(x.providerLastUpdate??""));
 if([...captures,...upstream].some(t=>!Number.isFinite(t)))return null;
 if(Math.max(...captures)-Math.min(...captures)>1000||
    Math.max(...upstream)-Math.min(...upstream)>60_000||
    upstream.some((t,i)=>t>captures[i]))return null;
 return{bookmaker:group.bookmaker,at:captures[0],upstreamAt:Math.min(...upstream),
  h:inv[0]/overround,d:inv[1]/overround,a:inv[2]/overround,overround};
}
const round=(n:number)=>Number(n.toFixed(5));
const bounds=(arr:number[]):[number,number]=>[round(Math.min(...arr)),round(Math.max(...arr))];
export function buildPrematchMarketReference(input:{
 events:PersistedEvent[];quotes:PersistedMarketQuoteRecord[];
 asOf:string;maxResults?:number;quotesCapped?:boolean;eventsCapped?:boolean;
}):MarketReference[]{
 const now=Date.parse(input.asOf);
 // Complete scans are mandatory for an independent-bookmaker quorum.
 if(!Number.isFinite(now)||input.quotesCapped||input.eventsCapped)return[];
 const relevant=new Map(input.events.filter(e=>{
  const start=Date.parse(e.event.startsAt);
  return e.event.status==="scheduled"&&!isSelfcheckEvent(e)&&
   isExactEplFixture(e)&&!!e.event.home?.name&&!!e.event.away?.name&&
   norm(e.event.home.name)!==norm(e.event.away.name)&&
   Number.isFinite(start)&&start-now>=30*60_000&&start-now<=36*3600_000;
 }).map(e=>[e.id,e]));
 const groups=new Map<string,Group>();
 for(const q of input.quotes){
  const e=relevant.get(q.eventId);
  if(!e||q.provider!=="the-odds-api"||q.marketKey!=="soccer_epl.h2h"||
   q.line!==undefined||q.suspended===true||
   !Number.isFinite(q.decimalOdds)||q.decimalOdds<=1.01||q.decimalOdds>50||
   !q.bookmaker.trim()||/unknown|не указан|unidentified/i.test(q.bookmaker))continue;
  const at=Date.parse(q.capturedAt),updated=Date.parse(q.providerLastUpdate??"");
  if(!Number.isFinite(at)||!Number.isFinite(updated)||at>now||
   now-at>MAX_QUOTE_AGE_MS||updated>at||at>=Date.parse(e.event.startsAt))continue;
  const key=q.eventId+"|"+q.bookmaker+"|"+q.capturedAt;
  const old=groups.get(key)??{bookmaker:q.bookmaker,at:q.capturedAt,quotes:[]};
  old.quotes.push(q);groups.set(key,old);
 }
 const byEvent=new Map<string,Bundle[]>();
 for(const [key,group] of groups){
  const eventId=key.split("|",1)[0],event=relevant.get(eventId);
  if(!event)continue;
  const trio=coherentTrio(event,group);
  if(!trio)continue;
  const arr=byEvent.get(eventId)??[];arr.push(trio);byEvent.set(eventId,arr);
 }
 const rows:MarketReference[]=[];
 for(const [eventId,bundles] of byEvent){
  const event=relevant.get(eventId);
  if(!event)continue;
  // One most recent complete synchronized 1X2 trio per bookmaker.
  const latest=new Map<string,Bundle>();
  for(const b of bundles.sort((a,b)=>b.at-a.at||
   a.bookmaker.localeCompare(b.bookmaker))){
   if(!latest.has(b.bookmaker))latest.set(b.bookmaker,b);
  }
  const distinct=[...latest.values()].sort((a,b)=>b.at-a.at||
   a.bookmaker.localeCompare(b.bookmaker));
  if(distinct.length<2)continue;
  const freshest=distinct[0].at;
  const aligned=distinct.filter(b=>freshest-b.at<=MAX_BOOKMAKER_SPREAD_MS);
  if(aligned.length<2)continue;
  // Equal weighting per independent book; not a new market-implied edge.
  const mean=(field:"h"|"d"|"a")=>aligned.reduce((s,b)=>s+b[field],0)/aligned.length;
  const home=round(mean("h")),draw=round(mean("d")),away=round(mean("a"));
  const roundoff=1-(home+draw+away);
  const probs={home,draw,away:round(away+roundoff)};
  const margins=aligned.map(b=>(b.overround-1)*100).sort((a,b)=>a-b);
  const median=margins.length%2?margins[(margins.length-1)/2]:
   (margins[margins.length/2-1]+margins[margins.length/2])/2;
  rows.push({
   eventId,match:event.event.home!.name+" — "+event.event.away!.name,
   competition:event.event.competition,startsAt:event.event.startsAt,
   sampleAt:new Date(freshest).toISOString(),
   latestSourceAt:new Date(Math.max(...aligned.map(b=>b.upstreamAt))).toISOString(),
   bookmakers:aligned.length,source:"PERSISTED_THE_ODDS_API",
   probability:probs,minMax:{home:bounds(aligned.map(b=>b.h)),
    draw:bounds(aligned.map(b=>b.d)),away:bounds(aligned.map(b=>b.a))},
   overroundPct:{min:round(margins[0]),max:round(margins.at(-1)!),
    median:round(median)},freshestBookmakers:aligned.map(b=>b.bookmaker).slice(0,6),
   confidence:"MARKET_REFERENCE_ONLY",independentVetoModel:false,
   executablePriceVerified:false,profitabilityVerified:false,
  });
 }
 return rows.sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)||
  b.bookmakers-a.bookmakers||a.eventId.localeCompare(b.eventId))
  .slice(0,Math.max(1,Math.min(input.maxResults??15,30)));
}
/** Pure deterministic checks, with fixed synthetic fixtures only for tests. */
export function marketReferenceSelfcheck(){
 const at="2026-10-18T12:00:00Z",bookid="a".repeat(32);
 const e:PersistedEvent={id:"e",canonicalKey:"football::epl::alpha",
  providerRefs:{"the-odds-api":bookid},event:{
   id:bookid,sport:"football",competition:"EPL",status:"scheduled",
   startsAt:"2026-10-18T16:00:00Z",
   home:{id:"h",name:"Arsenal"},away:{id:"a",name:"Chelsea"}}};
 const source=(bookmaker:string,prices:number[],capturedAt="2026-10-18T11:59:00Z")=>
  ["Arsenal","Draw","Chelsea"].map((name,i):PersistedMarketQuoteRecord=>({
   eventId:"e",provider:"the-odds-api",bookmaker,marketKey:"soccer_epl.h2h",
   selectionKey:name.toLowerCase(),selectionLabel:name,decimalOdds:prices[i],
   capturedAt,providerLastUpdate:capturedAt,
  }));
 const q=[...source("A",[1.85,3.6,4.5]),...source("B",[1.91,3.7,4.7])];
 const run=(props:Partial<Parameters<typeof buildPrematchMarketReference>[0]>={})=>
  buildPrematchMarketReference({events:[e],quotes:q,asOf:at,...props});
 const v=run()[0];
 const checks=[
  {name:"Two independent fully sourced trios yield normalized probability baseline",
   pass:!!v&&v.bookmakers===2&&Math.abs(Object.values(v.probability).reduce((a,b)=>a+b,0)-1)<.00001},
  {name:"No independent VETO model or betting edge asserted",
   pass:v?.independentVetoModel===false&&v?.profitabilityVerified===false&&v.executablePriceVerified===false},
  {name:"Only one bookmaker never creates fake independent quorum",
   pass:run({quotes:source("A",[1.85,3.6,4.5])}).length===0},
  {name:"Prices for one bookmaker cannot be mixed from different snapshots",
   pass:run({quotes:[...source("A",[1.85,3.6,4.5]).slice(0,2),
    ...source("A",[1.9,3.6,4.7],"2026-10-18T11:58:00Z").slice(2),...source("B",[1.91,3.7,4.7])]}).length===0},
  {name:"No future kickoff or after kickoff quotes",
   pass:run({events:[{...e,event:{...e.event,startsAt:"2026-10-18T10:00:00Z"}}]}).length===0},
  {name:"Stale quotations never count as valid",
   pass:run({quotes:[...source("A",[1.85,3.6,4.5],"2026-10-18T03:00:00Z"),...q.slice(3)]}).length===0},
  {name:"Truncated research evidence produces no authoritative market consensus",
   pass:run({quotesCapped:true}).length===0&&run({eventsCapped:true}).length===0},
  {name:"Score or odds can never be borrowed from another fixture",
   pass:run({quotes:q.map(x=>({...x,eventId:"other"}))}).length===0},
  {name:"Different markets cannot be pooled",
   pass:run({quotes:q.map((x,i)=>i<3?x:{...x,marketKey:"soccer_epl.totals"})}).length===0},
 ];
 return{passed:checks.every(c=>c.pass),checks};
}
