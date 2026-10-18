import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {buildPrematchMarketReference} from "@/lib/research/market-reference";
export const dynamic="force-dynamic";
export const maxDuration=45;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Bounded read-only real-market reference. Quote-implied CONTROL only,
 * no upstream sportsbook/provider requests and never a VETO model pick. */
export async function GET(){
 const now=Date.now(),asOf=new Date(now).toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:false,source:"NO_REAL_STORAGE",asOf,rows:[],
   externalProviderCalls:0,independentModel:false},{status:503,headers});
 try{
  const store=getPersistence(),H=3600_000;
  const windows=await Promise.all([0,18].map(fromHour=>
   store.listRecentEvents({
    from:new Date(now+fromHour*H).toISOString(),
    to:new Date(now+(fromHour+18)*H).toISOString(),
    statuses:["scheduled"],canonicalKeyPrefix:"football::epl::",limit:100,
   })));
  const events=[...new Map(windows.flat().filter(e=>
    e.event.sport==="football").map(e=>[e.id,e])).values()];
  const eventScanCapped=windows.some(x=>x.length>=100);
  // Defensive: if global database read caps are hit, no apparently complete
  // independent consensus can be shown.
  const quotes=events.length&&!eventScanCapped?
   await store.listRecentQuotesForEvents({eventIds:events.map(e=>e.id),
    provider:"the-odds-api",marketKey:"soccer_epl.h2h",
    capturedSince:new Date(now-4*H).toISOString(),limit:3000}):[];
  const quotesCapped=quotes.length>=3000;
  const rows=buildPrematchMarketReference({events,quotes,asOf,
   quotesCapped,eventsCapped:eventScanCapped,maxResults:18});
  return NextResponse.json({ok:true,source:"PERSISTED_ONLY",asOf,rows,
   fixturesScanned:events.length,quotesScanned:quotes.length,
   eventsCapped:eventScanCapped,quotesCapped,
   benchmarkType:"DEVIGGED_BOOKMAKER_CONTROL",
   independentModel:false,validatedEdgeCount:0,executablePriceVerified:false,
   realMoneyBets:0,externalProviderCalls:0,
   note:"Bookmaker-derived three-way baseline, not VETO independent prediction or expected-value advantage. Provider quote update times may differ from gateway receipt."},{headers});
 }catch{
  return NextResponse.json({ok:false,source:"READ_ERROR",asOf,rows:[],
   independentModel:false,externalProviderCalls:0},{status:503,headers});
 }
}
