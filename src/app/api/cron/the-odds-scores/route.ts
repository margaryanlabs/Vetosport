import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {parseOddsApiScore,matchOddsApiScore} from "@/lib/paper/odds-score-certification";
import {journalizeEventState} from "@/lib/data-plane/journalize";
import {assessFtScoreBudget,FT_SCORE_COST_CREDITS} from "@/lib/paper/ft-quota-gate";
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
  const [paperPicks,paperSettled,highPicks,highSettled,quotaHealth,scoresHealth]=await Promise.all([
   store.listPaperDailyPicks(900),store.listPaperDailySettlements(900),
   store.listHighOddsPaperTickets(850),store.listHighOddsPaperSettlements(850),
   store.listRecentProviderHealth({providerId:"the-odds-api",limit:1}),
   store.listRecentProviderHealth({providerId:"the-odds-api-scores",limit:1}),
  ]);
  if(paperPicks.length>=900||paperSettled.length>=900||highPicks.length>=850||highSettled.length>=850)
   return NextResponse.json({ok:false,skipped:true,reason:"PAPER_HISTORY_CAPPED",
    quotaCharged:0},{status:503,headers});
  const settledIds=new Set(paperSettled.map(x=>x.pickId));
  const DAY=86_400_000;
  // Source truth: only previously committed open PREMATCH research, never
  // unrelated EPL fixtures. No research => zero expensive API requests.
  const outstanding=paperPicks.filter(p=>
   p.lane==="PREMATCH_ODDS_CONTROL"&&!settledIds.has(p.id)&&
   Date.parse(p.eventStartsAt)>=now.getTime()-3*DAY&&
   Date.parse(p.eventStartsAt)<=now.getTime()-60*60_000).slice(0,30);
  // Include distinct fixture legs from any LOCKED unresolved high-odds
  // research slip; no need to spend scores credits otherwise.
  const highSettledIds=new Set(highSettled.map(x=>x.ticketId));
  const highDue=highPicks.filter(p=>!highSettledIds.has(p.id))
   .flatMap(p=>p.legs).filter(leg=>
    Date.parse(leg.eventStartsAt)>=now.getTime()-3*DAY&&
    Date.parse(leg.eventStartsAt)<=now.getTime()-60*60_000);
  const dueEventIds=[...new Set([...outstanding.map(p=>p.eventId),
    ...highDue.map(leg=>leg.eventId)])].slice(0,30);
  if(!dueEventIds.length)return NextResponse.json({ok:true,skipped:true,
   reason:"NO_DUE_PAPER_FT_CERTIFICATES",quotaCharged:0},{headers});
  // This cron fires at 07:00 UTC; legitimate last odds observations may
  // be 23h old. A 6h limit silently prevented EVERY next-day settlement.
  // Pure source-credit gate: bounded 30h provenance, >=100-credit cushion,
  // prevent repeat paid scores calls within 20h.
  const gate=assessFtScoreBudget({dueFixtures:dueEventIds.length,asOf,
   quota:quotaHealth[0]??null,lastScoresCall:scoresHealth[0]??null});
  if(!gate.allowed)
   return NextResponse.json({ok:true,skipped:true,reason:gate.reason,
    sourceAgeHours:gate.sourceAgeHours,quotaRemaining:gate.quotaRemaining,
    minimumProvenCredits:gate.minimumProvenCredits,quotaCharged:0,
    realBetsPlaced:0},{headers});
  const fetched=await Promise.all(dueEventIds.map(id=>store.getEventById(id)));
  const candidates=[...new Map(fetched.filter((e):e is NonNullable<typeof e>=>
    !!e&&e.event.status!=="finished"&&e.event.sport==="football"&&
    e.canonicalKey.startsWith("football::epl::")&&
    /^[a-f0-9]{32}$/i.test(e.providerRefs?.["the-odds-api"]??"")&&
    Date.parse(e.event.startsAt)<=now.getTime()-60*60_000)
    .map(e=>[e.id,e])).values()];
  const ownership=new Map<string,number>();
  for(const e of candidates){
   const id=e.providerRefs!["the-odds-api"];
   ownership.set(id,(ownership.get(id)??0)+1);
  }
  const safeCandidates=candidates.filter(e=>ownership.get(e.providerRefs!["the-odds-api"])===1);
  if(!safeCandidates.length)return NextResponse.json({ok:true,skipped:true,
   reason:"PAPER_FT_SOURCE_ID_UNAVAILABLE_OR_AMBIGUOUS",quotaCharged:0},{headers});
  const url=new URL("https://api.the-odds-api.com/v4/sports/soccer_epl/scores");
  url.searchParams.set("daysFrom","3");
  url.searchParams.set("eventIds",safeCandidates.slice(0,30).map(e=>e.providerRefs!["the-odds-api"]).join(","));
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
  for(const e of safeCandidates){
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
   metadata:{provider:"the-odds-api",sportKey:"soccer_epl",costCredits:FT_SCORE_COST_CREDITS,providerCalls:1,
    candidates:safeCandidates.length,certified,unmatched,failures,
    droppedDuplicateIds:duplicateSourceIds.size,windowMayBeCapped:false},
  });
  return NextResponse.json({ok:failures===0,source:"the-odds-api.scores",
   researchOnly:true,providerCalls:1,nominalCredits:FT_SCORE_COST_CREDITS,
   candidateGames:safeCandidates.length,certified,unmatched,failures,capped:false},
   {status:failures?503:200,headers});
 }catch{
  return NextResponse.json({ok:false,error:"ODDS_SCORES_SOURCE_UNAVAILABLE",
   noSyntheticFinals:true},{status:503,headers});
 }
}
