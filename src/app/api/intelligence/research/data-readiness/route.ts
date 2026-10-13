import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {evidenceCoverage} from "@/lib/research/evidence-coverage";
import type {PersistedEventStateRecord,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Read-only aggregates; never leaks provider keys, bridge URLs, raw quotes or identities. */
export async function GET(){
 const now=new Date(),at=now.toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({source:"NO_REAL_STORAGE",generatedAt:at,gates:[],
   error:"No verified storage configured; no synthetic diagnostics generated."},{headers});
 try{
  const store=getPersistence(),windowHours=16,windows=3;
  const batches=await Promise.all(Array.from({length:windows},(_,i)=>store.listRecentEvents({
   from:new Date(now.getTime()-(i+1)*windowHours*3600000).toISOString(),
   to:new Date(now.getTime()-i*windowHours*3600000).toISOString(),
   statuses:["live","finished","scheduled","suspended"],limit:100,
  })));
  const events=[...new Map(batches.flat().filter(e=>e.event.sport==="football"&&!isSelfcheckEvent(e)).map(e=>[e.id,e])).values()];
  const chunks=Array.from({length:Math.ceil(events.length/32)},(_,i)=>events.slice(i*32,(i+1)*32).map(e=>e.id));
  const pairs=await Promise.all(chunks.map(async eventIds=>Promise.all([
   store.listRecentEventStates({eventIds,limit:900}),
   store.listRecentQuotesForEvents({eventIds,limit:1600}),
  ])));
  const states:PersistedEventStateRecord[]=pairs.flatMap(x=>x[0]);
  const quotes:PersistedMarketQuoteRecord[]=pairs.flatMap(x=>x[1]);
  const sampleMayBeCapped=batches.some(x=>x.length>=100)||
   pairs.some(x=>x[0].length>=900||x[1].length>=1600);
  return NextResponse.json({...evidenceCoverage({events,states,quotes,at,
    windowHours:windows*windowHours,sampleMayBeCapped}),
   fetchCoverage:{windows,maxEventsPerWindow:100,eventStateSnapshotsRead:states.length,
    marketQuoteRowsRead:quotes.length,sampleMayBeCapped}},
   {headers});
 }catch{
  return NextResponse.json({source:"READ_ERROR",generatedAt:at,gates:[],
    error:"Evidence data unavailable; no coverage or signals invented."},{headers,status:503});
 }
}