import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {discoverObservedPatterns} from "@/lib/research/auto-discovery";
import type {PersistedEventStateRecord} from "@/lib/persistence/contracts";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Read-only, zero external provider requests. This is an exploratory study, never a betting signal. */
export async function GET(){
  const now=new Date(),at=now.toISOString();
  if(!persistenceConfiguration().supabaseConfigured)
    return NextResponse.json({source:"NO_REAL_STORAGE",generatedAt:at,patterns:[],
      validatedEdgeCount:0,error:"Real storage is not configured."},{headers});
  try{
    const persistence=getPersistence(),windows=3,windowHours=16;
    const batches=await Promise.all(Array.from({length:windows},(_,i)=>{
      const end=new Date(now.getTime()-i*windowHours*3600000).toISOString();
      const start=new Date(now.getTime()-(i+1)*windowHours*3600000).toISOString();
      return persistence.listRecentEvents({from:start,to:end,statuses:["live","finished"],limit:100});
    }));
    const events=[...new Map(batches.flat().filter(e=>e.event.sport==="football"&&!isSelfcheckEvent(e)).map(e=>[e.id,e])).values()];
    const chunks=Array.from({length:Math.ceil(events.length/36)},(_,i)=>events.slice(i*36,(i+1)*36).map(e=>e.id));
    const snapshots:PersistedEventStateRecord[]= (await Promise.all(
      chunks.map(eventIds=>persistence.listRecentEventStates({eventIds,limit:900}))
    )).flat();
    return NextResponse.json({
      ...discoverObservedPatterns({events,states:snapshots,asOf:at,lookbackHours:48}),
      fetchCoverage:{eventWindows:windows,maxEventsPerWindow:100,statesFetched:snapshots.length,windowMayBeCapped:batches.some(b=>b.length>=100)},
      liveReadOnly:true,externalProviderCalls:0,automatedBets:false,
    },{headers});
  }catch{
    return NextResponse.json({source:"READ_ERROR",generatedAt:at,patterns:[],
      validatedEdgeCount:0,error:"Persisted source unavailable. No synthetic discovery results generated."},
      {headers,status:503});
  }
}