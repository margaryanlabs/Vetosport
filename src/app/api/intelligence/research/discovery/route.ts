import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {discoverObservedPatterns} from "@/lib/research/auto-discovery";
import {buildHypothesisLiveMatches} from "@/lib/research/hypothesis-live-matches";
import type {PersistedEvent,PersistedEventStateRecord} from "@/lib/persistence/contracts";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};

/** Read-only. Keep real certified historical finals for 7 days rather than dropping all evidence after 48 hours.
 * The bounded scan deliberately reports truncation instead of quietly implying the full sports universe was checked.
 * No third-party sports/odds requests, no bets. */
export async function GET(){
 const now=new Date(),at=now.toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({source:"NO_REAL_STORAGE",generatedAt:at,patterns:[],
   validatedEdgeCount:0,error:"Real storage is not configured."},{headers});
 try{
  const persistence=getPersistence();
  const DAY=24*3600000,HOUR=3600000, recentWindows=3,recentWindowHours=16,historyDays=5;
  const recent=await Promise.all(Array.from({length:recentWindows},(_,i)=>{
   const end=new Date(now.getTime()-i*recentWindowHours*HOUR).toISOString();
   const start=new Date(now.getTime()-(i+1)*recentWindowHours*HOUR).toISOString();
   return persistence.listRecentEvents({from:start,to:end,statuses:["live","finished"],limit:100});
  }));
  // Older games matter only after their canonical event was marked finished.
  // Separate results backfill certifies actual FT in a later snapshot; status by itself is never sufficient.
  const historical=await Promise.all(Array.from({length:historyDays},(_,i)=>{
   const end=new Date(now.getTime()-48*HOUR-i*DAY).toISOString();
   const start=new Date(now.getTime()-48*HOUR-(i+1)*DAY).toISOString();
   return persistence.listRecentEvents({from:start,to:end,statuses:["finished"],limit:100});
  }));
  const isEligible=(e:PersistedEvent)=>e.event.sport==="football"&&!isSelfcheckEvent(e);
  const recentEvents=[...new Map(recent.flat().filter(isEligible).map(e=>[e.id,e])).values()];
  const historicalEvents=[...new Map(historical.flat().filter(isEligible).map(e=>[e.id,e])).values()]
   .sort((a,b)=>Date.parse(b.event.startsAt)-Date.parse(a.event.startsAt));
  const maxArchived=220,archiveLimitHit=historicalEvents.length>maxArchived;
  const events=[...new Map([...recentEvents,...historicalEvents.slice(0,maxArchived)]
   .map(e=>[e.id,e])).values()];
  const chunks=Array.from({length:Math.ceil(events.length/24)},(_,i)=>
   events.slice(i*24,(i+1)*24).map(e=>e.id));
  const snapshots:PersistedEventStateRecord[]=[];
  let statesCapped=false;
  // Avoid overwhelming the storage bridge with 20+ simultaneous reads.
  for(let i=0;i<chunks.length;i+=4){
   const batch=await Promise.all(chunks.slice(i,i+4).map(eventIds=>
    persistence.listRecentEventStates({eventIds,limit:1200})));
   for(const records of batch){snapshots.push(...records);if(records.length>=1200)statesCapped=true;}
  }
  const windowMayBeCapped=recent.some(b=>b.length>=100)||
   historical.some(b=>b.length>=100)||archiveLimitHit||statesCapped;
  // Evaluate live, source-backed matches against the SAME historical rule definitions.
  // Initial pass intentionally reads no odds; price lookup is scoped to matching fixtures.
  const discovery=discoverObservedPatterns({events,states:snapshots,asOf:at,lookbackHours:168,maxPatterns:200});
  const active=recentEvents.filter(e=>e.event.status==="live"&&
   Number.isFinite(Date.parse(e.event.startsAt))&&
   Date.parse(e.event.startsAt)<=now.getTime()&&
   now.getTime()-Date.parse(e.event.startsAt)<=4*HOUR);
  const unmatchedPrice=buildHypothesisLiveMatches({events:active,states:snapshots,
   patterns:discovery.patterns,quotes:[],asOf:at,maxResults:24});
  const ids=[...new Set(unmatchedPrice.map(x=>x.eventId))].slice(0,12);
  let realQuotes:Awaited<ReturnType<typeof persistence.listRecentQuotesForEvents>>=[];
  let quotesCapped=false,quoteReadFailed=false;
  if(ids.length){
   try{
    realQuotes=await persistence.listRecentQuotesForEvents({eventIds:ids,limit:1000});
    quotesCapped=realQuotes.length>=1000;
   }catch{quoteReadFailed=true;}
  }
  const liveMatches=buildHypothesisLiveMatches({events:active,states:snapshots,
   patterns:discovery.patterns,quotes:realQuotes,asOf:at,maxResults:18,
   quotesCapped:quotesCapped||quoteReadFailed});
  return NextResponse.json({
   ...discovery,
   // Preserve the existing discovery page's 24-row display; use a wider
   // research horizon internally so live matches are not hidden by sort order.
   patterns:discovery.patterns.slice(0,24),
   liveMatches,
   matchCoverage:{scannedLiveEvents:active.length,eventsWithHypothesisMatches:ids.length,
    quotesCapped,quoteReadFailed,matched:liveMatches.length,externalProviderCalls:0,
    forecastEdgeValidated:false},
   
   fetchCoverage:{
    eventWindows:recentWindows+historyDays,maxEventsPerWindow:100,
    recentEvents:recentEvents.length,archivedFinishedEventsRetained:Math.min(maxArchived,historicalEvents.length),
    archivedFinishedEventsDroppedByLimit:Math.max(0,historicalEvents.length-maxArchived),
    statesFetched:snapshots.length,statesCapped,windowMayBeCapped,
    historicalRangeDays:7,source:"PERSISTED_ONLY",
   },
   liveReadOnly:true,externalProviderCalls:0,automatedBets:false,
  },{headers});
 }catch{
  return NextResponse.json({source:"READ_ERROR",generatedAt:at,patterns:[],
   validatedEdgeCount:0,error:"Persisted source unavailable. No synthetic discovery results generated."},
   {headers,status:503});
 }
}
