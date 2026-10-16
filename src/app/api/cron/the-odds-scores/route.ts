import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {parseOddsApiScore,matchOddsApiScore} from "@/lib/paper/odds-score-certification";
import {journalizeEventState} from "@/lib/data-plane/journalize";
export const dynamic="force-dynamic";
export const maxDuration=30;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Optional once-a-day exact-provider EPL FT reconciliation.
 * Cost 2 The Odds API quota credits per poll (daysFrom=3).
 * Disabled by default until operator opts in and reviews quota budget.
 * Read-only upstream; local append-only result certificates, zero bets.
 */
export async function GET(req:Request){
 if(!process.env.CRON_SECRET||
    req.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)
   return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 if(process.env.VETO_ODDS_SCORES_ENABLED!=="true"||!process.env.THE_ODDS_API_KEY||
    !persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:true,skipped:true,
   reason:"OPERATOR_OPT_IN_OR_KEY_REQUIRED",quotaCharged:0},{headers});
 const store=getPersistence(),now=new Date(),asOf=now.toISOString();
 try{
  const recent=await store.listRecentProviderHealth({providerId:"the-odds-api-scores",limit:1});
  if(recent[0]?.quotaRemaining!==undefined&&recent[0].quotaRemaining!==null&&
     recent[0].quotaRemaining<=30)
   return NextResponse.json({ok:true,skipped:true,reason:"SCORE_QUOTA_RESERVE",quotaCharged:0},{headers});
  const DAY=86_400_000;
  const groups=await Promise.all([1,2,3].map(i=>store.listRecentEvents({
   from:new Date(now.getTime()-i*DAY).toISOString(),
   to:new Date(now.getTime()-(i-1)*DAY).toISOString(),
   statuses:["scheduled","live"],limit:100,
  })));
  const capped=groups.some(g=>g.length>=100);
  // No eligible native-ID scheduled EPL games: save the 2-credit call.
  const candidates=[...new Map(groups.flat().filter(e=>
    e.event.sport==="football"&&e.canonicalKey.startsWith("football::epl::")&&
    /^[a-f0-9]{32}$/i.test(e.providerRefs?.["the-odds-api"]??"")&&
    Date.parse(e.event.startsAt)<=now.getTime()-60*60_000).map(e=>[e.id,e])).values()];
  if(!candidates.length)return NextResponse.json({ok:true,skipped:true,
   reason:"NO_UNVERIFIED_NATIVE_EPL_GAMES",quotaCharged:0},{headers});
  const url=new URL("https://api.the-odds-api.com/v4/sports/soccer_epl/scores");
  url.searchParams.set("daysFrom","3");
  url.searchParams.set("eventIds",candidates.slice(0,30).map(e=>e.providerRefs!["the-odds-api"]).join(","));
  url.searchParams.set("apiKey",process.env.THE_ODDS_API_KEY);
  const response=await fetch(url.toString(),{cache:"no-store",
   signal:AbortSignal.timeout(14_000)});
  if(!response.ok||!response.headers.get("x-requests-remaining"))
   throw Error("ODDS_SCORE_UPSTREAM_FAILURE");
  const quotaRemaining=Number(response.headers.get("x-requests-remaining"));
  if(!Number.isSafeInteger(quotaRemaining)||quotaRemaining<0)
   throw Error("SCORE_QUOTA_UNKNOWN");
  const payload:unknown=await response.json();
  if(!Array.isArray(payload))throw Error("SCORE_PAYLOAD_INVALID");
  const parsed=payload.map(x=>parseOddsApiScore(x,asOf)).filter((x):x is NonNullable<typeof x>=>x!==null);
  const duplicateSourceIds=new Set<string>();
  const uniqueById=new Map<string,typeof parsed>();
  for(const row of parsed){
   const group=uniqueById.get(row.externalId)??[];
   group.push(row);uniqueById.set(row.externalId,group);
  }
  for(const [id,items] of uniqueById)if(items.length>1)duplicateSourceIds.add(id);
  let certified=0,failures=0,unmatched=0;
  for(const e of candidates){
   const id=e.providerRefs?.["the-odds-api"];
   if(!id||duplicateSourceIds.has(id)){unmatched++;continue;}
   const scores=uniqueById.get(id);
   const good=scores?.[0];
   if(!good||!matchOddsApiScore(e,good)){unmatched++;continue;}
   const state={source:"the-odds-api.scores",status:"finished",score:good.score,
    providerEventId:good.externalId,regulationTimeOnly:true,
    sourceSportKey:"soccer_epl",sourceCommenceTime:good.startsAt,
    receivedAt:asOf};
   try{
    // Source proof is written before marking the canonical game finished.
    await store.appendEventState({eventId:e.id,sourceProvider:"the-odds-api",
     capturedAt:asOf,state});
    await store.appendTruthJournal([journalizeEventState({
     canonicalEventId:e.id,sourceProvider:"the-odds-api",
     sourceRecordId:`odds-scores:${good.externalId}:${asOf}`,
     gatewayReceivedAt:asOf,payload:state,
    })]);
    await store.upsertEvent({...e.event,status:"finished",score:good.score},
      e.canonicalKey,{provider:"the-odds-api",id:good.externalId});
    certified++;
   }catch{failures++;}
  }
  await store.appendProviderHealth({providerId:"the-odds-api-scores",
   status:failures?"degraded":"healthy",checkedAt:asOf,
   quotaRemaining,message:failures?"Some exact EPL FT writes failed.":"Exact provider-ID EPL FT lookup finished.",
   metadata:{provider:"the-odds-api",sportKey:"soccer_epl",costCredits:2,
    candidates:candidates.length,certified,unmatched,failures,
    droppedDuplicateIds:duplicateSourceIds.size,windowMayBeCapped:capped},
  });
  return NextResponse.json({ok:failures===0,source:"the-odds-api.scores",
   researchOnly:true,providerCalls:1,nominalCredits:2,
   candidateGames:candidates.length,certified,unmatched,failures,capped},
   {status:failures?503:200,headers});
 }catch{
  return NextResponse.json({ok:false,error:"ODDS_SCORES_SOURCE_UNAVAILABLE",
   noSyntheticFinals:true},{status:503,headers});
 }
}
