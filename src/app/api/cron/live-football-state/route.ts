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
    return NextResponse.json(
      {
        ok: false,
        skipped: false,
        error:
          error instanceof Error
            ? error.message
            : "Football live cycle failed.",
      },
      { status: 502 },
    );
  }
}
