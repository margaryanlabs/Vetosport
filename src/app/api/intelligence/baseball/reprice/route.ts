import { NextResponse } from "next/server";
import {
  buildBaseballSurface,
  priceBaseballMarket,
  type BaseballStateInput,
} from "@/lib/models/baseball/engine";

interface Body extends BaseballStateInput {
  totalLines?: number[];
  homeTeamTotalLines?: number[];
  awayTeamTotalLines?: number[];
  marketOdds?: Record<string, number>;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  const required = [
    body.homeScore,
    body.awayScore,
    body.inning,
    body.prematchExpectedHomeRuns,
    body.prematchExpectedAwayRuns,
  ];

  if (
    required.some(
      (value) => typeof value !== "number" || !Number.isFinite(value),
    ) ||
    !body.runners ||
    !["top", "bottom"].includes(body.half)
  ) {
    return NextResponse.json(
      { error: "Valid baseball inning-state inputs are required." },
      { status: 400 },
    );
  }

  const surface = buildBaseballSurface(body);
  const totalLines = body.totalLines ?? [8.5, 9.5, 10.5];
  const homeTeamTotalLines = body.homeTeamTotalLines ?? [4.5, 5.5, 6.5];
  const awayTeamTotalLines = body.awayTeamTotalLines ?? [3.5, 4.5, 5.5];

  return NextResponse.json({
    model: "baseball.inning-state.v1",
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    researchWarning:
      "Run-expectancy, bullpen and park modifiers are research priors until calibrated on historical pitch/inning data.",
    remainingRuns: surface.remainingRuns,
    projectedFinal: surface.projectedFinal,
    game: {
      home: priceBaseballMarket(
        surface.game.homeWin,
        body.marketOdds?.["game-home"],
      ),
      tieAfterNine: priceBaseballMarket(
        surface.game.tieAfterNine,
        body.marketOdds?.["game-tie"],
      ),
      away: priceBaseballMarket(
        surface.game.awayWin,
        body.marketOdds?.["game-away"],
      ),
    },
    totals: totalLines.map((line) => ({
      line,
      under: priceBaseballMarket(
        surface.totalUnder(line),
        body.marketOdds?.[`total-under-${line}`],
      ),
      over: priceBaseballMarket(
        surface.totalOver(line),
        body.marketOdds?.[`total-over-${line}`],
      ),
    })),
    homeTeamTotals: homeTeamTotalLines.map((line) => ({
      line,
      under: priceBaseballMarket(
        surface.homeTeamUnder(line),
        body.marketOdds?.[`home-team-under-${line}`],
      ),
    })),
    awayTeamTotals: awayTeamTotalLines.map((line) => ({
      line,
      under: priceBaseballMarket(
        surface.awayTeamUnder(line),
        body.marketOdds?.[`away-team-under-${line}`],
      ),
    })),
  });
}
