import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {replayPersistedPaper} from "@/lib/paper/autonomous-replay";
import type {
 PersistedMarketQuoteRecord,PersistedPredictionSnapshotRecord,PersistedEventStateRecord,
} from "@/lib/persistence/contracts";

export const dynamic="force-dynamic";
export const maxDuration=30;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
const EMPTY={ok:false,model:"veto.paper.replay.first-eligible-v1",
 source:"PERSISTED_ONLY",cases:[],providerCalls:0,validatedEdgeCount:0,
 executionVerified:false};
/** Explicit, read-only on-demand reconstruction; never scans external sports
 * providers, places bets, schedules jobs or writes account/ledger data.
 * Coverage limits must be surfaced, never hidden.
 */
export async function GET(){
 const now=new Date(),at=now.toISOString();
 if(!persistenceConfiguration().supabaseConfigured)return NextResponse.json({
  ...EMPTY,reason:"NO_PERSISTENCE_CONFIG",generatedAt:at},{status:503,headers});
 try{
  const store=getPersistence();
  const DAY=86_400_000,PER_WINDOW=60;
  const windows=await Promise.all(Array.from({length:7},(_,i)=>
   store.listRecentEvents({
    from:new Date(now.getTime()-(i+1)*DAY).toISOString(),
    to:new Date(now.getTime()-i*DAY).toISOString(),
    statuses:["live","finished"],limit:PER_WINDOW,
   })));
  const found=[...new Map(windows.flat().filter(e=>
   e.event.sport==="football"&&!isSelfcheckEvent(e)).map(e=>[e.id,e])).values()];
  const events=found.sort((a,b)=>Date.parse(b.event.startsAt)-Date.parse(a.event.startsAt))
   .slice(0,96);
  let capped=windows.some(x=>x.length>=PER_WINDOW)||found.length>events.length;
  const states:PersistedEventStateRecord[]=[],quotes:PersistedMarketQuoteRecord[]=[],
   predictions:PersistedPredictionSnapshotRecord[]=[];
  const groups=Array.from({length:Math.ceil(events.length/8)},(_,i)=>
   events.slice(i*8,(i+1)*8).map(e=>e.id));
  let skippedCappedGroups=0;
  for(let i=0;i<groups.length;i+=3){
   const batch=await Promise.all(groups.slice(i,i+3).map(async eventIds=>{
    const [st,qt,pr]=await Promise.all([
     store.listRecentEventStates({eventIds,limit:800}),
     store.listRecentQuotesForEvents({eventIds,limit:1500}),
     store.listRecentPredictionsForEvents({eventIds,limit:1500}),
    ]);
    return{st,qt,pr};
   }));
   for(const b of batch){
    // Incomplete arrays can misselect the "first" event/quote or produce
    // falsely precise denominators. Exclude capped groups entirely.
    if(b.st.length>=800||b.qt.length>=1500||b.pr.length>=1500){
     capped=true;skippedCappedGroups++;continue;
    }
    states.push(...b.st);quotes.push(...b.qt);predictions.push(...b.pr);
   }
  }
  const usable=events.filter(e=>states.some(s=>s.eventId===e.id));
  const report=replayPersistedPaper({events:usable,states,quotes,predictions,asOf:at,
   sampleMayBeCapped:capped});
  return NextResponse.json({...report,ok:true,limits:{
   days:7,eventCap:96,storageWindowCap:PER_WINDOW,
   eventsExcludedByGlobalCap:Math.max(0,found.length-events.length),
   incompleteGroupsDropped:skippedCappedGroups,
   sourceTruncationPossible:capped,
  }},{headers});
 }catch{
  return NextResponse.json({...EMPTY,reason:"PERSISTED_SOURCE_UNAVAILABLE",
   generatedAt:at},{status:503,headers});
 }
}
