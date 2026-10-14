import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {evidenceCoverage} from "@/lib/research/evidence-coverage";
import type {PersistedEventStateRecord,PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";

export const dynamic="force-dynamic";
export const maxDuration=60;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Read-only aggregates; never leaks provider keys, bridge URLs, raw quotes or identities. */
export async function GET(){
 const now=new Date(),at=now.toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({source:"NO_REAL_STORAGE",generatedAt:at,gates:[],
   error:"No verified storage configured; no synthetic diagnostics generated."},{headers});
 try{
  // A targeted 24-hour observability report avoids slow 48-hour fan-out.
  // Historic provenance is reported only for this declared, sampled window.
  const store=getPersistence(),windowHours=3,windows=8;
  // The storage API orders by starts_at ASC and limits each request to 100.
  // Broad 16-hour windows truncated reads to 100; the observed 3-hour
  // football windows stay under this cap while keeping requests bounded.
  const batches:Awaited<ReturnType<typeof store.listRecentEvents>>[]=[];
  for(let offset=0;offset<windows;offset+=3){
   const group=await Promise.all(Array.from({length:Math.min(3,windows-offset)},(_,index)=>{
    const i=offset+index;
    return store.listRecentEvents({
     from:new Date(now.getTime()-(i+1)*windowHours*3600000).toISOString(),
     to:new Date(now.getTime()-i*windowHours*3600000).toISOString(),
     statuses:["live","finished","scheduled","suspended"],limit:100,
    });
   }));
   batches.push(...group);
  }
  const events=[...new Map(batches.flat().filter(e=>e.event.sport==="football"&&!isSelfcheckEvent(e)).map(e=>[e.id,e])).values()];
  const chunks=Array.from({length:Math.ceil(events.length/24)},(_,i)=>events.slice(i*24,(i+1)*24).map(e=>e.id));
  const pairs: Array<[PersistedEventStateRecord[],PersistedMarketQuoteRecord[]]>=[];
  // Bounded storage reads avoid 40+ simultaneous bridge requests and
  // smaller event chunks reduce global per-query truncation of hot games.
  for(let index=0;index<chunks.length;index+=4){
   const group=await Promise.all(chunks.slice(index,index+4).map(async eventIds=>Promise.all([
    store.listRecentEventStates({eventIds,limit:900}),
    store.listRecentQuotesForEvents({eventIds,limit:1600}),
   ]) as Promise<[PersistedEventStateRecord[],PersistedMarketQuoteRecord[]]>));
   pairs.push(...group);
  }
  const states:PersistedEventStateRecord[]=pairs.flatMap(x=>x[0]);
  const quotes:PersistedMarketQuoteRecord[]=pairs.flatMap(x=>x[1]);
  const sampleMayBeCapped=batches.some(x=>x.length>=100)||
   pairs.some(x=>x[0].length>=900||x[1].length>=1600);
  return NextResponse.json({...evidenceCoverage({events,states,quotes,at,
    windowHours:windows*windowHours,sampleMayBeCapped}),
   fetchCoverage:{windows,windowHoursPerRead:windowHours,maxEventsPerWindow:100,eventStateSnapshotsRead:states.length,
    marketQuoteRowsRead:quotes.length,sampleMayBeCapped}},
   {headers});
 }catch{
  return NextResponse.json({source:"READ_ERROR",generatedAt:at,gates:[],
    error:"Evidence data unavailable; no coverage or signals invented."},{headers,status:503});
 }
}