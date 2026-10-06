import { NextResponse } from "next/server";
import {
  buildBasketballSurface,
  priceBasketballMarket,
  type BasketballStateInput,
} from "@/lib/models/basketball/engine";

interface Body extends BasketballStateInput {
  totalLines?: number[];
  homeHandicaps?: number[];
  awayTeamTotalLines?: number[];
  marketOdds?: Record<string, number>;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  const required = [
    body.homeScore,
    body.awayScore,
    body.elapsedSeconds,
    body.projectedPossessionsPerTeam,
    body.homePointsPerPossession,
    body.awayPointsPerPossession,
  ];

  if (required.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return NextResponse.json(
      { error: "Valid basketball state inputs are required." },
      { status: 400 },
    );
  }

  const surface = buildBasketballSurface(body);
  const totalLines = body.totalLines ?? [219.5, 224.5, 229.5, 234.5];
  const homeHandicaps = body.homeHandicaps ?? [-2.5, -4.5, -6.5];
  const awayTeamTotalLines = body.awayTeamTotalLines ?? [107.5, 111.5, 115.5];

  return NextResponse.json({
    projectedFinal: surface.projectedFinal,
    remainingPossessionsPerTeam: surface.remainingPossessionsPerTeam,
    volatility: {
      totalStdDev: surface.totalStdDev,
      marginStdDev: surface.marginStdDev,
    },
    markets: {
      totals: totalLines.map((line) => ({
        line,
        under: priceBasketballMarket(
          surface.totalUnder(line),
          body.marketOdds?.[`total-under-${line}`],
        ),
        over: priceBasketballMarket(
          surface.totalOver(line),
          body.marketOdds?.[`total-over-${line}`],
        ),
      })),
      homeSpreads: homeHandicaps.map((handicap) => ({
        handicap,
        home: priceBasketballMarket(
          surface.homeCover(handicap),
          body.marketOdds?.[`home-spread-${handicap}`],
        ),
      })),
      awayTeamTotals: awayTeamTotalLines.map((line) => ({
        line,
        under: priceBasketballMarket(
          surface.awayTeamUnder(line),
          body.marketOdds?.[`away-team-under-${line}`],
        ),
      })),
    },
  });
}
