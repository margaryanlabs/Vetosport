import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {isSelfcheckEvent} from "@/lib/live/persisted-utils";
import {exactStoredFixtureIndex,normalizeFinishedFixture} from "@/lib/providers/api-football-finals";
import {journalizeEventState} from "@/lib/data-plane/journalize";
import type {ApiFootballFixture} from "@/lib/providers/api-football";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
/** Six FREE queries daily, paired with 48 lives and 12 in-play => nominal 66/100 daily. */
export async function GET(req:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)
    return NextResponse.json({error:"Unauthorized"},{status:401,headers});
  if(process.env.VETO_API_FOOTBALL_ENABLED!=="true"||!process.env.API_FOOTBALL_KEY||
    !persistenceConfiguration().supabaseConfigured)
    return NextResponse.json({ok:true,skipped:true,reason:"LIVE_FOOTBALL_OR_STORAGE_NOT_ENABLED"},{headers});
  const now=new Date();
  // Catch yesterday twice a day, today's finals during the other four polls.
  const day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-
    (now.getUTCHours()%12===0?1:0))).toISOString().slice(0,10);
  try{
    const url="https://v3.football.api-sports.io/fixtures?date="+day+"&status=FT";
    const response=await fetch(url,{headers:{"x-apisports-key":process.env.API_FOOTBALL_KEY!,accept:"application/json"},
      cache:"no-store",signal:AbortSignal.timeout(15_000)});
    if(!response.ok)throw new Error("API-Football results unavailable");
    const data:unknown=await response.json();
    if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Bad response");
    const obj=data as {response?:unknown;errors?:unknown};
    if(!Array.isArray(obj.response)||
      (Array.isArray(obj.errors)&&obj.errors.length>0)||
      (obj.errors&&typeof obj.errors==="object"&&!Array.isArray(obj.errors)&&Object.keys(obj.errors).length>0))
      throw new Error("API returned error payload");
    const remainingHeader=response.headers.get("x-ratelimit-requests-remaining");
    const remaining=remainingHeader===null?null:Number(remainingHeader);
    if(remaining!==null&&Number.isFinite(remaining)&&remaining<=20)
      return NextResponse.json({ok:true,skipped:true,reason:"QUOTA_RESERVE",day,quotaRemaining:remaining},{headers});
    const finals=(obj.response as ApiFootballFixture[]).map(normalizeFinishedFixture)
      .filter((f):f is NonNullable<typeof f>=>f!==null);
    const store=getPersistence();
    const start=Date.parse(day+"T00:00:00Z");
    const blocks=await Promise.all([0,1,2].map(i=>store.listRecentEvents({
      from:new Date(start+i*8*3600000).toISOString(),
      to:new Date(start+(i+1)*8*3600000).toISOString(),limit:100,
    })));
    const events=[...new Map(blocks.flat().filter(e=>e.event.sport==="football"&&!isSelfcheckEvent(e)).map(e=>[e.id,e])).values()];
    const chunks=Array.from({length:Math.ceil(events.length/36)},(_,i)=>events.slice(i*36,(i+1)*36).map(e=>e.id));
    const states=(await Promise.all(chunks.map(ids=>store.listRecentEventStates({eventIds:ids,limit:900})))).flat();
    const {index,ambiguous}=exactStoredFixtureIndex(events,states);
    let matched=0,finishedStored=0,errors=0;
    const capturedAt=new Date().toISOString();
    for(const f of finals){
      const existing=index.get(f.providerEventId);
      if(!existing||Date.parse(existing.event.startsAt)!==Date.parse(f.startsAt))continue;
      if(existing.event.status==="finished")continue;
      matched++;
      if(finishedStored>=25)break;
      try{
        // Update only a previously observed exact fixture, never create a guess by team name.
        const event={...existing.event,id:String(f.providerEventId),status:"finished" as const,
          score:f.score};
        const updated=await store.upsertEvent(event,existing.canonicalKey,
          {provider:"api-football",id:String(f.providerEventId)});
        const state={status:"finished",score:f.score,providerEventId:f.providerEventId,
          source:"api-football.fixtures.results",timeSemantics:"OBSERVED_AT_FETCH_NOT_WHISTLE",regulationTimeOnly:true};
        await store.appendEventState({eventId:updated.id,sourceProvider:"api-football",
          capturedAt,state});
        await store.appendTruthJournal([journalizeEventState({canonicalEventId:updated.id,
          sourceProvider:"api-football",sourceRecordId:`fixture-ft:${f.providerEventId}:${capturedAt}`,
          gatewayReceivedAt:capturedAt,payload:state})]);
        finishedStored++;
      }catch{errors++;}
    }
    await store.appendProviderHealth({providerId:"api-football-finals",status:errors?"degraded":"healthy",
      checkedAt:capturedAt,quotaRemaining:Number.isFinite(remaining)?remaining??undefined:undefined,
      message:"FT results backfill, exact previously observed matches only. No odds polling.",
      metadata:{day,providerFinals:finals.length,matched,finishedStored,errors,ambiguous:ambiguous.length,
        scannedEvents:events.length,windowMayBeCapped:blocks.some(x=>x.length===100),estimatedCallsPerDay:6}
    });
    return NextResponse.json({ok:errors===0,source:"api-football",day,providerFinals:finals.length,
      matched,finishedStored,errors,ambiguous:ambiguous.length,quotaRemaining:remaining,
      validation:"EXACT_PROVIDER_ID_AND_KICKOFF",validatedEdgeCount:0,bookmakerOddsVerified:false},
      {headers,status:errors?502:200});
  }catch{
    return NextResponse.json({ok:false,error:"No verified final scores persisted; source or storage failed."},
      {status:502,headers});
  }
}
