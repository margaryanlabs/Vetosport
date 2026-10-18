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
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: !providers.sportmonks.configured
        ? "SPORTMONKS_API_TOKEN is not configured."
        : "Persistence is not configured.",
    });
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
