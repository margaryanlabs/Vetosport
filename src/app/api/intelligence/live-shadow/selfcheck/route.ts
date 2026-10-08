import { NextResponse } from "next/server";
import type {
  PersistedEvent,
  PersistedMarketQuoteRecord,
} from "@/lib/persistence/contracts";
import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";
import { mapFootballQuoteToModel } from "@/lib/live/football-market-map";
import { getPersistence, persistenceConfiguration } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

export async function GET() {
  const event: PersistedEvent = {
    id: "00000000-0000-4000-8000-000000000777",
    canonicalKey: "selfcheck",
    event: {
      id: "selfcheck",
      sport: "football",
      competition: "Selfcheck",
      startsAt: "2026-10-08T12:00:00.000Z",
      status: "live",
      home: { id: "home", name: "Arsenal" },
      away: { id: "away", name: "Chelsea" },
    },
  };
  const surface = buildFootballProbabilitySurface({
    scoreHome: 1,
    scoreAway: 0,
    elapsedMinutes: 55,
    prematchExpectedHomeGoals: 1.7,
    prematchExpectedAwayGoals: 1.2,
  });
  const quote = (
    marketKey: string,
    selectionKey: string,
    selectionLabel: string,
    line?: number,
  ): PersistedMarketQuoteRecord => ({
    eventId: event.id,
    provider: "selfcheck",
    bookmaker: "selfcheck",
    marketKey,
    selectionKey,
    selectionLabel,
    line,
    decimalOdds: 1.9,
    capturedAt: "2026-10-08T12:55:00.000Z",
  });

  const cases = [
    quote("soccer_epl.h2h", "arsenal", "Arsenal"),
    quote("soccer_epl.h2h", "draw", "Draw"),
    quote("soccer_epl.totals", "over:2.5", "Over", 2.5),
    quote("soccer_epl.totals", "under:2.5", "Under", 2.5),
    quote("soccer_epl.spreads", "arsenal:-0.5", "Arsenal", -0.5),
    quote("football.btts", "yes", "Yes"),
  ];

  const mapped = cases.map((item) =>
    mapFootballQuoteToModel({ event, quote: item, surface }),
  );
  const mapperPassed = mapped.every(Boolean);
  let storageProbe = {
    configured: persistenceConfiguration().supabaseConfigured,
    reachable: false,
    message: "Persistence is not configured.",
  };

  if (storageProbe.configured) {
    try {
      await getPersistence().listPredictionHeads([
        "00000000-0000-4000-8000-000000000777",
      ]);
      storageProbe = {
        configured: true,
        reachable: true,
        message: "prediction_snapshots read path is reachable.",
      };
    } catch (error) {
      storageProbe = {
        configured: true,
        reachable: false,
        message:
          error instanceof Error
            ? error.message
            : "prediction_snapshots read probe failed.",
      };
    }
  }

  const passed =
    mapperPassed &&
    (!storageProbe.configured || storageProbe.reachable);

  return NextResponse.json({
    passed,
    storageProbe,
    model: "veto.football-shadow-mapper.v1",
    checks: cases.map((item, index) => ({
      marketKey: item.marketKey,
      selectionKey: item.selectionKey,
      mapped: Boolean(mapped[index]),
      target: mapped[index]
        ? {
            marketId: mapped[index]!.modelMarket.marketId,
            selectionId: mapped[index]!.modelMarket.selectionId,
          }
        : null,
    })),
  }, { status: passed ? 200 : 500 });
}
