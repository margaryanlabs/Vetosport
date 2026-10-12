import {NextResponse} from "next/server";
import {getApiFootballLiveFixtures,normalizeApiFootballFixture,apiFootballSchedule} from "@/lib/providers/api-football";
import {ingestCanonicalLivePayload} from "@/lib/ingestion/canonical-live";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";

export const dynamic="force-dynamic";
/** Vercel Cron: one free-tier request every 30 minutes (~48 per UTC day).
 * Operator must opt in; NO browser/client invocation.
 * No bookmaker odds are requested or inferred. */
export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`){
    return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
  }
  const configured=Boolean(process.env.API_FOOTBALL_KEY);
  const enabled=process.env.VETO_API_FOOTBALL_ENABLED==="true";
  const persisted=persistenceConfiguration().supabaseConfigured;
  if(!enabled||!configured||!persisted){
    return NextResponse.json({ok:true,skipped:true,reason:!enabled?"OPERATOR_OPT_IN_REQUIRED":!configured?"API_FOOTBALL_KEY_MISSING":"PERSISTENCE_MISSING",estimatedScheduledRequestsPerDay:apiFootballSchedule.perDay},{headers:{"Cache-Control":"no-store"}});
  }
  try{
    const snapshot=await getApiFootballLiveFixtures();
    // Reserve a meaningful chunk of the free daily quota for diagnostics and
    // avoid using quota after response reveals the account is running out.
    const lowQuota=snapshot.quotaRemaining!==null&&snapshot.quotaRemaining<=apiFootballSchedule.reserve;
    const rows=snapshot.fixtures.map(normalizeApiFootballFixture).filter((row):row is NonNullable<typeof row>=>row!==null).slice(0,30);
    let stored=0;
    let failures=0;
    if(!lowQuota){
      for(const row of rows){
        try{
          await ingestCanonicalLivePayload({
            provider:"api-football",sourceEventId:row.event.id,
            gatewayReceivedAt:snapshot.fetchedAt,event:row.event,
            state:{
              sourceRecordId:`api-football:${row.event.id}:${snapshot.fetchedAt}`,
              capturedAt:snapshot.fetchedAt,
              sourceEmittedAt:snapshot.fetchedAt,
              payload:{...row.state,providerSnapshotTimeUnknown:true},
            },
            quotes:[],evidence:[],
          });
          stored++;
        }catch{failures++;}
      }
    }
    await getPersistence().appendProviderHealth({
      providerId:"api-football",
      status:lowQuota||failures>0?"degraded":"healthy",
      checkedAt:snapshot.fetchedAt,
      quotaRemaining:snapshot.quotaRemaining??undefined,
      message:lowQuota?"Daily quota reserve reached: skipping ingestion.":failures?"Some live fixtures could not be persisted.":"Live fixture batch processed; no bookmaker markets requested.",
      metadata:{upstreamFixtures:snapshot.fixtures.length,normalized:rows.length,stored,failures,lowQuota,providerTimestampIsFetchTime:true},
    });
    return NextResponse.json({
      ok:failures===0&&!lowQuota,
      source:"api-football",mode:"LIVE_SCORE_ONLY",
      receivedAt:snapshot.fetchedAt,
      upstreamFixtures:snapshot.fixtures.length,normalized:rows.length,stored,failures,
      quotaRemaining:snapshot.quotaRemaining,quotaLimit:snapshot.quotaLimit,
      quotaReserve:apiFootballSchedule.reserve,estimatedScheduledRequestsPerDay:apiFootballSchedule.perDay,
      bookmakerOddsVerified:false,sourceTimestampVerified:false,
    },{status:failures?502:200,headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({
      ok:false,error:"API-Football polling failed. Verify key, upstream quota and provider health. No fake matches generated.",
      bookmakerOddsVerified:false,
    },{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
