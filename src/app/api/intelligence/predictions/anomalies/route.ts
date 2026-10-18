import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {findPriceDispersion} from "@/lib/research/price-dispersion";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Read-only, no external API costs; no wagering or claimed pricing advantage. */
export async function GET(){
 const now=Date.now(),asOf=new Date(now).toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:false,source:"NO_REAL_STORAGE",asOf,rows:[],
   automaticBettingEnabled:false,externalProviderCalls:0},{headers,status:503});
 try{
  const store=getPersistence(),H=3600_000;
  const windows=await Promise.all([
   store.listRecentEvents({from:new Date(now-4*H).toISOString(),to:new Date(now+24*H).toISOString(),
    statuses:["scheduled","live"],limit:100}),
   store.listRecentEvents({from:new Date(now+24*H).toISOString(),to:new Date(now+48*H).toISOString(),
    statuses:["scheduled"],limit:100}),
  ]);
  const events=[...new Map(windows.flat().filter(e=>e.event.sport==="football")
   .map(e=>[e.id,e])).values()].slice(0,55);
  if(!events.length)return NextResponse.json({ok:true,source:"PERSISTED_ONLY",asOf,rows:[],
   fixturesScanned:0,scanMayBeCapped:windows.some(w=>w.length>=100),
   quotesCapped:false,externalProviderCalls:0,automaticBettingEnabled:false},{headers});
  const quotes=await store.listRecentQuotesForEvents({eventIds:events.map(e=>e.id),limit:1500});
  const quotesCapped=quotes.length>=1500;
  const rows=findPriceDispersion({events,quotes,asOf,quotesCapped,limit:16});
  return NextResponse.json({ok:true,source:"PERSISTED_ONLY",asOf,rows,
   fixturesScanned:events.length,scanMayBeCapped:windows.some(w=>w.length>=100),
   quotesScanned:quotes.length,quotesCapped,
   externalProviderCalls:0,automaticBettingEnabled:false,validatedEdgeCount:0,
   note:"Unusual multi-bookmaker price disagreement is not a proven value bet. Price execution and market equivalence require independent verification."},{headers});
 }catch{
  return NextResponse.json({ok:false,source:"READ_ERROR",asOf,rows:[],
   externalProviderCalls:0,automaticBettingEnabled:false},{headers,status:503});
 }
}
