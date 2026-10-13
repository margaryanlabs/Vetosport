import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {fetchOpenLigaResults,openLeagues} from "@/lib/providers/openligadb-results";
import {findUnambiguousExternalLinks,evaluateCrossSourceMatches} from "@/lib/research/result-corroboration";
import type {PersistedEvent, PersistedEventStateRecord} from "@/lib/persistence/contracts";

export const dynamic="force-dynamic";
export const maxDuration=30;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/**
 * User-triggered only. Source-vs-source comparison remains outside settlement
 * and proprietary research storage. No mutation or billable sports API calls.
 */
export async function GET(){
 const now=new Date(),asOf=now.toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({source:"NO_VETO_STORAGE",asOf,
   error:"Observed sports history unavailable. No synthetic comparisons generated."},
   {status:503,headers});
 try{
  const [leagueOne,leagueTwo]=await Promise.all(openLeagues.map(l=>fetchOpenLigaResults(l.id,now)));
  const leagues=[leagueOne,leagueTwo];
  if(leagues.some(x=>x.status!=="available"))
   return NextResponse.json({source:"OPEN_RESULTS_UNAVAILABLE",asOf,
    error:"Community result source temporarily unavailable. No fallback scores invented."},
    {status:503,headers});
  const store=getPersistence();
  const DAY=86400000,HOUR=3600000;
  const windows=14;
  const batches:PersistedEvent[][]=[];
  // Bounded max 4 concurrent storage reads, 7 days of 12-hour windows.
  // Read-only scan; report truncation when any window reaches the cap.
  for(let i=0;i<windows;i+=4){
   const part=await Promise.all(Array.from({length:Math.min(4,windows-i)},(_,j)=>{
    const n=i+j;
    return store.listRecentEvents({
     from:new Date(now.getTime()-(n+1)*12*HOUR).toISOString(),
     to:new Date(now.getTime()-n*12*HOUR).toISOString(),
     statuses:["live","finished"],limit:100,
    });
   }));
   batches.push(...part);
  }
  const events=[...new Map(batches.flat()
   .filter(e=>e.event.sport==="football"&&!isSelfcheckEvent(e))
   .map(e=>[e.id,e])).values()];
  const publicMatches=leagues.flatMap(l=>l.finished).filter(m=>
   Date.parse(m.startsAt)>=now.getTime()-7*DAY);
  const links=findUnambiguousExternalLinks({events,publicMatches});
  const linkedIds=[...new Set([...links.matches.values()].map(x=>x.event.id))];
  const states:PersistedEventStateRecord[]=[];
  let stateLimitReached=false;
  for(let i=0;i<linkedIds.length;i+=8){
   const chunk=await store.listRecentEventStates({eventIds:linkedIds.slice(i,i+8),limit:1800});
   if(chunk.length>=1800)stateLimitReached=true;
   states.push(...chunk);
  }
  const capped=batches.some(b=>b.length>=100)||stateLimitReached;
  return NextResponse.json({...evaluateCrossSourceMatches({
   events,states,leagues,asOf,limitedByStorage:capped,
  }),dataCoverage:{windows,maxPerWindow:100,statesRead:states.length,
   linkedCanonicalEvents:linkedIds.length,sourceAcquisition:"user-initiated",quotaPaidApiCalls:0}},
   {headers});
 }catch{
  return NextResponse.json({source:"CROSSCHECK_READ_ERROR",asOf,
   error:"Cannot read both providers for safe comparison. No inferred result published."},
   {status:503,headers});
 }
}
