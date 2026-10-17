import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {highOddsLegFromEvidence,proposeHighOddsSlips,
 HIGH_ODDS_STAKE,highOddsAccount} from "@/lib/paper/high-odds-research";
export const dynamic="force-dynamic";
export const maxDuration=30;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** No provider fetch, no wager, and NO INSERT: inspect currently stored
 * upcoming exact-ID EPL quotes to preview, not commit, genuine paper studies.
 * A prospective proposal is ephemeral until separately persisted by cron.
 */
export async function GET(){
 if(!persistenceConfiguration().supabaseConfigured)return NextResponse.json({
  ok:false,reason:"SOURCE_NOT_CONFIGURED",noSyntheticData:true},
  {status:503,headers});
 const now=new Date(),asOf=now.toISOString(),store=getPersistence();
 try{
  const [events,existing,settled]=await Promise.all([
   store.listRecentEvents({
    from:new Date(now.getTime()+30*60_000).toISOString(),
    to:new Date(now.getTime()+48*3_600_000).toISOString(),
    statuses:["scheduled"],canonicalKeyPrefix:"football::epl::",limit:100,
   }),
   store.listHighOddsPaperTickets(850),
   store.listHighOddsPaperSettlements(850),
  ]);
  if(events.length>=100||existing.length>=850||settled.length>=850)
   return NextResponse.json({ok:false,reason:"SOURCE_HISTORY_INCOMPLETE",
    noSyntheticData:true},{status:503,headers});
  const eligibleEvents=events.filter(e=>e.event.sport==="football"&&
   /^[a-f0-9]{32}$/i.test(e.providerRefs?.["the-odds-api"]??""))
   .sort((a,b)=>Date.parse(a.event.startsAt)-Date.parse(b.event.startsAt)||
    a.id.localeCompare(b.id)).slice(0,12);
  const data=await Promise.all(eligibleEvents.map(async event=>{
   try{
    const quotes=await store.listRecentQuotesForEvents({
     eventIds:[event.id],provider:"the-odds-api",marketKey:"soccer_epl.h2h",
     capturedSince:new Date(now.getTime()-4*3_600_000).toISOString(),limit:500,
    });
    if(quotes.length>=500)return{leg:null,reason:"QUOTES_CAPPED"};
    return{leg:highOddsLegFromEvidence({event,quotes,asOf}),reason:"OK"};
   }catch{return{leg:null,reason:"SOURCE_FETCH_FAILED"};}
  }));
  const legs=data.flatMap(x=>x.leg?[x.leg]:[]);
  const proposals=proposeHighOddsSlips({legs,asOf,already:existing});
  const account=highOddsAccount(existing,settled);
  const affordable=proposals.slice(0,Math.floor(account.available/HIGH_ODDS_STAKE));
  const warnings=[
   "These are uncommitted, price-indicative mathematical candidates, NOT placed or executable bookmaker accumulators.",
   "A synthetic price is the product of different fixture's stored single prices; cross-match independence and actual payout are unverified.",
   "A candidate never changes the $200 bankroll. Only the secured cron can write a pre-kickoff research slip.",
  ];
  return NextResponse.json({ok:true,source:"PERSISTED_ONLY",noNewProviderCalls:true,
   generatedAt:asOf,mode:"UNCOMMITTED_RESEARCH_PREVIEW",
   scanned:eligibleEvents.length,usableLegs:legs.length,
   excluded:{sourceErrors:data.filter(x=>x.reason==="SOURCE_FETCH_FAILED").length,
    incompleteQuotes:data.filter(x=>x.reason==="QUOTES_CAPPED").length,
    noSuitableBook:data.filter(x=>x.reason==="OK"&&!x.leg).length},
   proposals:affordable,committed:0,virtualBankAvailable:account.available,
   warning:warnings},{headers});
 }catch{
  return NextResponse.json({ok:false,reason:"PAPER_PREVIEW_SOURCE_UNAVAILABLE",
   noSyntheticData:true},{status:503,headers});
 }
}
