/** VETO Sport / HIGH ODDS LAB v1.
 * A distinct, small-stake, forward-only mathematical PAPER PARLAY research account.
 * Products of single-game prices are NOT provider-quoted parlay prices; no claim
 * of executability, independent same-game events, expected profit or real betting.
 */
import type {PersistedEvent,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";
import {paperContractWins,type PaperContract} from "@/lib/paper/paper-verification";

export const HIGH_ODDS_PROTOCOL="veto.paper.high-odds.cross-event.v1" as const;
export const HIGH_ODDS_INITIAL_BANK=200;
export const HIGH_ODDS_STAKE=1;
export const HIGH_ODDS_MAX_DAILY_TICKETS=3;
export const HIGH_ODDS_MAX_LEG_EXPOSURE_PER_DAY=2; // virtual $, across overlapping tickets
export type HighOddsBand="X10_20"|"X20_50"|"X50_PLUS";
export type HighOddsLeg={
 eventId:string;eventStartsAt:string;home:string;away:string;
 bookmaker:string;provider:"the-odds-api";marketKey:"soccer_epl.h2h";
 selectionKey:string;selectionLabel:string;contract:"FT_HOME"|"FT_DRAW"|"FT_AWAY";
 quoteAt:string;providerUpdatedAt:string;decimalOdds:number;
 impliedFairProbability:number;
};
export type HighOddsSlip={
 id:string;protocol:string;dayUTC:string;dailySlot:number;
 band:HighOddsBand;legs:HighOddsLeg[];syntheticDecimalOdds:number;
 stake:number;capturedAt:string;pricing:"PRODUCT_OF_SINGLE_MARKET_PRICES_NOT_EXECUTABLE";
};
export type HighOddsSettlement={
 ticketId:string;result:"WIN"|"LOSS";
 provenOutcomes:Array<{eventId:string;score:{home:number;away:number};
  provider:"the-odds-api";finalAt:string;won:boolean}>;
 settledAt:string;
};
export type HighOddsAccount={
 source:"SERVER_PERSISTED";protocol:typeof HIGH_ODDS_PROTOCOL;paperOnly:true;
 nominalInitialBank:number;balance:number;net:number;reserved:number;
 available:number;open:number;settled:number;wins:number;losses:number;
 roiPct:number;maxDrawdown:number;ticketCount:number;dailyLimit:number;
 tickets:Array<HighOddsSlip&{settlement:HighOddsSettlement|null}>;
 monthly:Array<{day:string;count:number;settled:number;net:number}>;
};
export type HighOddsProposal=Omit<HighOddsSlip,"id"|"dailySlot">;
const ts=(s:string)=>Date.parse(s);
const norm=(s:string)=>s.trim().replace(/\s+/g," ").toLowerCase();
const valid=(s:string,now:number,age:number)=>Number.isFinite(ts(s))&&ts(s)<=now&&now-ts(s)<=age;
const isNativeEvent=(e:PersistedEvent,now:number)=>e.event.sport==="football"&&
 e.event.status==="scheduled"&&e.canonicalKey.startsWith("football::epl::")&&
 /^[a-f0-9]{32}$/i.test(e.providerRefs?.["the-odds-api"]??"")&&
 Number.isFinite(ts(e.event.startsAt))&&
 ts(e.event.startsAt)-now>=30*60_000&&ts(e.event.startsAt)-now<=48*3_600_000&&
 !!e.event.home?.name&&!!e.event.away?.name&&
 norm(e.event.home.name)!==norm(e.event.away.name);
/** Exactly one complete 1X2 observation, ONE bookmaker/time, is the source of
 * candidate legs. Optional prices are not selected retrospectively by profits.
 * The selection heuristic is predeclared: favour DRAW if 2.8..7.5, otherwise
 * maximum odds among complete source three-way outcomes <=7.5.
 */
export function highOddsLegFromEvidence(input:{
 event:PersistedEvent;quotes:PersistedMarketQuoteRecord[];asOf:string;
}):HighOddsLeg|null{
 const now=ts(input.asOf),event=input.event;
 if(!Number.isFinite(now)||!isNativeEvent(event,now))return null;
 const q=input.quotes.filter(row=>row.eventId===event.id&&
  row.provider==="the-odds-api"&&row.marketKey==="soccer_epl.h2h"&&
  row.suspended!==true&&row.bookmaker.length>0&&
  Number.isFinite(row.decimalOdds)&&row.decimalOdds>1.01&&row.decimalOdds<=20&&
  valid(row.capturedAt,now,4*3_600_000)&&
  valid(row.providerLastUpdate??"",now,4*3_600_000)&&
  ts(row.providerLastUpdate!)<=ts(row.capturedAt)&&
  ts(row.capturedAt)<ts(event.event.startsAt));
 const groups=new Map<string,PersistedMarketQuoteRecord[]>();
 for(const quote of q){
  const key=quote.bookmaker+"|"+quote.capturedAt;
  const items=groups.get(key)??[];items.push(quote);groups.set(key,items);
 }
 const sorted=[...groups.values()].sort((x,y)=>{
  const rank=(r:PersistedMarketQuoteRecord)=>r.bookmaker.toLowerCase()==="pinnacle"?0:1;
  return rank(x[0])-rank(y[0])||x[0].bookmaker.localeCompare(y[0].bookmaker)||
   ts(y[0].capturedAt)-ts(x[0].capturedAt);
 });
 for(const rows of sorted){
  const options:[PaperContract,string][]=[
   ["FT_HOME",event.event.home!.name],["FT_DRAW","draw"],["FT_AWAY",event.event.away!.name],
  ];
  const exact=options.map(([,label])=>rows.filter(r=>norm(r.selectionLabel)===norm(label)));
  if(exact.some(x=>x.length!==1))continue;
  const trio=exact.map(x=>x[0]);
  const inv=trio.map(x=>1/x.decimalOdds),sum=inv.reduce((a,b)=>a+b,0);
  if(!Number.isFinite(sum)||sum<1||sum>1.4)continue;
  const draw=trio[1];
  const chosen=draw.decimalOdds>=2.8&&draw.decimalOdds<=7.5?draw:
   [...trio].filter(x=>x.decimalOdds<=7.5).sort((a,b)=>
    b.decimalOdds-a.decimalOdds||a.selectionKey.localeCompare(b.selectionKey))[0];
  if(!chosen)return null;
  const index=trio.indexOf(chosen);
  const contract=options[index][0];
  if(contract!=="FT_HOME"&&contract!=="FT_DRAW"&&contract!=="FT_AWAY")return null;
  return{eventId:event.id,eventStartsAt:event.event.startsAt,
   home:event.event.home!.name,away:event.event.away!.name,
   bookmaker:chosen.bookmaker,provider:"the-odds-api",marketKey:"soccer_epl.h2h",
   selectionKey:chosen.selectionKey,selectionLabel:chosen.selectionLabel,
   contract,quoteAt:chosen.capturedAt,providerUpdatedAt:chosen.providerLastUpdate!,
   decimalOdds:chosen.decimalOdds,impliedFairProbability:inv[index]/sum};
 }
 return null;
}
const bands:{band:HighOddsBand;minimum:number;maximum:number;legCount:number}[]=[
 {band:"X10_20",minimum:10,maximum:20,legCount:2},
 {band:"X20_50",minimum:20,maximum:50,legCount:3},
 {band:"X50_PLUS",minimum:50,maximum:10_000,legCount:4},
];
/** Prospective multi-FIXTURE construction. Never multiply same-event markets:
 * those outcomes are correlated and a legitimate sportsbook must price their
 * joint probability. Multiple *different* tickets may reuse one fixture, but
 * an independent risk exposure cap applies across all those tickets.
 */
export function proposeHighOddsSlips(input:{
 legs:HighOddsLeg[];asOf:string;already:HighOddsSlip[];
}):HighOddsProposal[]{
 const now=ts(input.asOf),day=input.asOf.slice(0,10);
 if(!Number.isFinite(now)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day))return [];
 const options=[...new Map(input.legs.filter(x=>
  Number.isFinite(x.decimalOdds)&&x.decimalOdds>1&&
  ts(x.eventStartsAt)>now+30*60_000&&valid(x.quoteAt,now,4*3_600_000))
  .map(x=>[x.eventId,x])).values()]
  .sort((a,b)=>ts(a.eventStartsAt)-ts(b.eventStartsAt)||a.eventId.localeCompare(b.eventId))
  .slice(0,12);
 const today=input.already.filter(x=>x.dayUTC===day);
 const exposure=new Map<string,number>();
 for(const slip of today)for(const leg of slip.legs)
  exposure.set(leg.eventId,(exposure.get(leg.eventId)??0)+slip.stake);
 const existing=new Set(input.already.map(s=>s.legs.map(l=>l.eventId).sort().join("|")));
 const picked:HighOddsProposal[]=[];
 function choose(k:number,items:HighOddsLeg[],start:number,output:HighOddsLeg[][]){
  if(items.length===k){output.push([...items]);return;}
  for(let i=start;i<options.length;i++){
   items.push(options[i]);choose(k,items,i+1,output);items.pop();
   if(output.length>=220)break;
  }
 }
 for(const rule of bands){
  if(today.length+picked.length>=HIGH_ODDS_MAX_DAILY_TICKETS)break;
  const combinations:HighOddsLeg[][]=[];
  choose(rule.legCount,[],0,combinations);
  const validCombinations=combinations.map(legs=>{
   const syntheticOdds=legs.reduce((n,r)=>n*r.decimalOdds,1);
   return{legs,syntheticOdds,key:legs.map(l=>l.eventId).sort().join("|")};
  }).filter(x=>x.syntheticOdds>=rule.minimum&&x.syntheticOdds<=rule.maximum&&
   !existing.has(x.key)&&
   x.legs.every(leg=>(exposure.get(leg.eventId)??0)+HIGH_ODDS_STAKE<=HIGH_ODDS_MAX_LEG_EXPOSURE_PER_DAY));
  // The deterministic target closest to the bottom of each risk band avoids
  // post-hoc max-price shopping. No known outcome is consulted.
  validCombinations.sort((a,b)=>
   a.syntheticOdds-b.syntheticOdds||a.key.localeCompare(b.key));
  const selection=validCombinations[0];
  if(!selection)continue;
  const slip:HighOddsProposal={
   protocol:HIGH_ODDS_PROTOCOL,dayUTC:day,band:rule.band,
   legs:selection.legs,syntheticDecimalOdds:Number(selection.syntheticOdds.toFixed(4)),
   stake:HIGH_ODDS_STAKE,capturedAt:input.asOf,
   pricing:"PRODUCT_OF_SINGLE_MARKET_PRICES_NOT_EXECUTABLE",
  };
  picked.push(slip);existing.add(selection.key);
  for(const leg of selection.legs)
   exposure.set(leg.eventId,(exposure.get(leg.eventId)??0)+HIGH_ODDS_STAKE);
 }
 return picked;
}
export function settleHighOddsSlip(slip:HighOddsSlip,
 finals:Array<{eventId:string;score:{home:number;away:number};
 provider:"the-odds-api";finalAt:string}>,asOf:string):HighOddsSettlement|null{
 if(slip.legs.length<2||slip.legs.length>4||
  new Set(slip.legs.map(x=>x.eventId)).size!==slip.legs.length)return null;
 const map=new Map(finals.map(x=>[x.eventId,x]));
 const outcomes=[];
 for(const leg of slip.legs){
  const final=map.get(leg.eventId);
  if(!final||ts(final.finalAt)<=ts(slip.capturedAt)||
   !Number.isInteger(final.score.home)||!Number.isInteger(final.score.away)||
   final.score.home<0||final.score.away<0)return null;
  const won=paperContractWins(leg.contract,final.score);
  if(won===null)return null;
  outcomes.push({...final,won});
 }
 return{ticketId:slip.id,result:outcomes.every(x=>x.won)?"WIN":"LOSS",
  provenOutcomes:outcomes,settledAt:asOf};
}
export function highOddsAccount(tickets:HighOddsSlip[],
 settlements:HighOddsSettlement[]):HighOddsAccount{
 const proof=new Map(settlements.map(x=>[x.ticketId,x]));
 const rows=tickets.filter(x=>x.protocol===HIGH_ODDS_PROTOCOL).map(x=>({
  ...x,settlement:proof.get(x.id)??null}));
 const finished=rows.filter(x=>x.settlement);
 const net=finished.reduce((sum,x)=>sum+(x.settlement?.result==="WIN"?
   x.stake*(x.syntheticDecimalOdds-1):-x.stake),0);
 const reserved=rows.filter(x=>!x.settlement).reduce((sum,x)=>sum+x.stake,0);
 let equity=HIGH_ODDS_INITIAL_BANK,high=equity,drawdown=0;
 for(const x of [...finished].sort((a,b)=>ts(a.settlement!.settledAt)-ts(b.settlement!.settledAt))){
  equity+=x.settlement?.result==="WIN"?x.stake*(x.syntheticDecimalOdds-1):-x.stake;
  high=Math.max(high,equity);drawdown=Math.max(drawdown,high-equity);
 }
 const dayKeys=[...new Set(rows.map(r=>r.dayUTC))].sort().reverse();
 return{source:"SERVER_PERSISTED",protocol:HIGH_ODDS_PROTOCOL,paperOnly:true,
  nominalInitialBank:HIGH_ODDS_INITIAL_BANK,
  balance:HIGH_ODDS_INITIAL_BANK+net,net,reserved,
  available:Math.max(0,HIGH_ODDS_INITIAL_BANK+net-reserved),
  open:rows.length-finished.length,settled:finished.length,
  wins:finished.filter(x=>x.settlement?.result==="WIN").length,
  losses:finished.filter(x=>x.settlement?.result==="LOSS").length,
  roiPct:100*net/HIGH_ODDS_INITIAL_BANK,maxDrawdown:drawdown,
  ticketCount:rows.length,dailyLimit:HIGH_ODDS_MAX_DAILY_TICKETS,
  tickets:rows.sort((a,b)=>ts(b.capturedAt)-ts(a.capturedAt)).slice(0,160),
  monthly:dayKeys.slice(0,31).map(day=>{
   const entries=rows.filter(t=>t.dayUTC===day);
   return{day,count:entries.length,settled:entries.filter(x=>x.settlement).length,
    net:entries.reduce((sum,x)=>sum+(x.settlement?
      x.settlement.result==="WIN"?x.stake*(x.syntheticDecimalOdds-1):-x.stake:0),0)};
  })};
}
export function highOddsSelfcheck(){
 const asOf="2026-10-16T12:00:00Z";
 const mk=(i:number,odds:number):HighOddsLeg=>({
  eventId:"event-"+i,eventStartsAt:"2026-10-17T16:30:00Z",
  home:"Home "+i,away:"Away "+i,bookmaker:"Pinnacle",provider:"the-odds-api",
  marketKey:"soccer_epl.h2h",selectionKey:"Draw",selectionLabel:"Draw",
  contract:"FT_DRAW",quoteAt:"2026-10-16T11:45:00Z",
  providerUpdatedAt:"2026-10-16T11:44:00Z",
  decimalOdds:odds,impliedFairProbability:1/odds,
 });
 const legs=[mk(1,3.4),mk(2,3.6),mk(3,3.1),mk(4,3.0),mk(5,3.1),mk(6,4)];
 const selected=proposeHighOddsSlips({legs,asOf,already:[]});
 const t:HighOddsSlip={...selected[0],id:"paper-1",dailySlot:1};
 const other=selected.map((x,i)=>({...x,id:"p"+i,dailySlot:i+1}));
 const finals=t.legs.map(l=>({eventId:l.eventId,score:{home:1,away:1},
  provider:"the-odds-api" as const,finalAt:"2026-10-17T20:00:00Z"}));
 const settled=settleHighOddsSlip(t,finals,"2026-10-17T22:00:00Z");
 const tests=[
  {name:"High-odds bands may include distinct scenarios sharing fixtures across tickets",
   pass:selected.length>=2&&selected.every(x=>new Set(x.legs.map(l=>l.eventId)).size===x.legs.length)},
  {name:"No unlimited correlated fixture exposure",pass:(()=>{
   const exposure=new Map<string,number>();
   for(const row of selected)for(const leg of row.legs)
    exposure.set(leg.eventId,(exposure.get(leg.eventId)??0)+row.stake);
   return [...exposure.values()].every(n=>n<=HIGH_ODDS_MAX_LEG_EXPOSURE_PER_DAY);
  })()},
  {name:"No retrospective changes after a ticket is committed",
   pass:proposeHighOddsSlips({legs,asOf,already:other}).length===0},
  {name:"Every fixture needs independent provider FT before winning",
   pass:settleHighOddsSlip(t,finals.slice(1),"2026-10-17T22:00:00Z")===null},
  {name:"Winning math does not claim sportsbook-combined quote",
   pass:settled?.result==="WIN"&&t.pricing==="PRODUCT_OF_SINGLE_MARKET_PRICES_NOT_EXECUTABLE"},
  {name:"Losing even one leg makes final composite scenario lose",
   pass:settleHighOddsSlip(t,[{...finals[0],score:{home:2,away:1}},...finals.slice(1)],
     "2026-10-17T22:00:00Z")?.result==="LOSS"},
  {name:"Separate virtual bank reserves open stake, never affects base daily bank",
   pass:highOddsAccount([t],[]).available===199&&highOddsAccount([t],[]).net===0},
  {name:"Provider-confirmed virtual composite returns mathematical product only",
   pass:Math.abs(highOddsAccount([t],[settled!]).balance-
     (HIGH_ODDS_INITIAL_BANK+t.syntheticDecimalOdds-1))<1e-6},
 ];
 return{passed:tests.every(x=>x.pass),tests};
}
