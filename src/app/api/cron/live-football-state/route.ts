import { NextResponse } from "next/server";
import { runLiveFootballCycle } from "@/lib/ingestion/live-football-cycle";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = providerConfiguration();
  const persistence = persistenceConfiguration();

  if (!providers.sportmonks.configured || !persistence.supabaseConfigured) {
    // Exiting silently here used to make production show "UNKNOWN" forever.
    // One hourly heartbeat is sufficient; no paid provider request is made.
    const failureCode=!providers.sportmonks.configured?
      "SPORTMONKS_NOT_CONFIGURED":"SPORT_PERSISTENCE_NOT_CONFIGURED";
    if(!providers.sportmonks.configured&&persistence.supabaseConfigured){
      try{
        const {getPersistence}=await import("@/lib/persistence/factory");
        const store=getPersistence();
        const latest=await store.listRecentProviderHealth({
          providerId:"sportmonks-football",limit:1});
        const since=Date.parse(latest[0]?.checkedAt??"");
        const previousCode=latest[0]?.metadata?.failureCode;
        if(previousCode!==failureCode||!Number.isFinite(since)||
         Date.now()-since>=60*60_000){
          await store.appendProviderHealth({
            providerId:"sportmonks-football",status:"degraded",
            checkedAt:new Date().toISOString(),
            message:"Live integration key is not configured; no upstream attempt.",
            metadata:{failureCode,upstreamAttempted:false,
              verifiedLiveStates:0,providerRows:0,manualConfigurationRequired:true},
          });
        }
      }catch{/* Operational source summary also reads runtime configuration. */}
    }
    return NextResponse.json({
      ok:true,skipped:true,failureCode,
      externalProviderCalls:0,realMoneyBets:0,
      note:"No live football observations or forecasts have been invented.",
    },{headers:{"Cache-Control":"no-store"}});
  }

  try {
    const result = await runLiveFootballCycle();
    const settlementErrors = result.settlement.errors.length;

    return NextResponse.json(
      {
        ok: settlementErrors === 0,
        skipped: false,
        result,
      },
      { status: settlementErrors === 0 ? 200 : 502 },
    );
  } catch (error) {
    const raw=error instanceof Error?error.message:"";
    const allowed=new Set(["SPORTMONKS_AUTH","SPORTMONKS_SUBSCRIPTION",
      "SPORTMONKS_QUOTA","SPORTMONKS_UPSTREAM"]);
    const failureCode=allowed.has(raw)?raw:"SPORTMONKS_UPSTREAM";
    // A failing secondary provider must never expose account details or
    // a token-bearing provider URL in a public cron error response.
    try{
      const {getPersistence}=await import("@/lib/persistence/factory");
      await getPersistence().appendProviderHealth({
        providerId:"sportmonks-football",status:"degraded",
        checkedAt:new Date().toISOString(),
        message:"Sportmonks in-play source unavailable; no derived score or FT persisted.",
        metadata:{failureCode,upstreamAttempted:true,verifiedLiveStates:0},
      });
    }catch{/* No fabricated healthy heartbeat. */}
    return NextResponse.json({ok:false,skipped:false,
      error:"Sportmonks live source unavailable; check source health.",
      failureCode,source:"sportmonks-football",externalBookmakerCalls:0},
      {status:502,headers:{"Cache-Control":"no-store"}});
  }
}
