import { NextResponse } from "next/server";
import {
  buildHockeySurface,
  priceHockeyMarket,
  type HockeyStateInput,
} from "@/lib/models/hockey/engine";

interface Body extends HockeyStateInput {
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
    body.elapsedSeconds,
    body.prematchExpectedHomeGoals,
    body.prematchExpectedAwayGoals,
  ];

  if (
    required.some(
      (value) => typeof value !== "number" || !Number.isFinite(value),
    )
  ) {
    return NextResponse.json(
      { error: "Valid hockey state inputs are required." },
      { status: 400 },
    );
  }

  const surface = buildHockeySurface(body);
  const totalLines = body.totalLines ?? [5.5, 6.5, 7.5];
  const homeTeamTotalLines = body.homeTeamTotalLines ?? [2.5, 3.5, 4.5];
  const awayTeamTotalLines = body.awayTeamTotalLines ?? [2.5, 3.5, 4.5];

  return NextResponse.json({
    model: "hockey.shift-goalie.v1",
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    researchWarning:
      "Manpower, attack-state and empty-net modifiers are research priors until calibrated on historical shift-level data.",
    remainingGoals: surface.remainingGoals,
    regulation: {
      home: priceHockeyMarket(
        surface.regulation.homeWin,
        body.marketOdds?.["reg-home"],
      ),
      tie: priceHockeyMarket(
        surface.regulation.tie,
        body.marketOdds?.["reg-tie"],
      ),
      away: priceHockeyMarket(
        surface.regulation.awayWin,
        body.marketOdds?.["reg-away"],
      ),
    },
    totals: totalLines.map((line) => ({
      line,
      under: priceHockeyMarket(
        surface.totalUnder(line),
        body.marketOdds?.[`total-under-${line}`],
      ),
      over: priceHockeyMarket(
        surface.totalOver(line),
        body.marketOdds?.[`total-over-${line}`],
      ),
    })),
    homeTeamTotals: homeTeamTotalLines.map((line) => ({
      line,
      under: priceHockeyMarket(
        surface.homeTeamUnder(line),
        body.marketOdds?.[`home-team-under-${line}`],
      ),
    })),
    awayTeamTotals: awayTeamTotalLines.map((line) => ({
      line,
      under: priceHockeyMarket(
        surface.awayTeamUnder(line),
        body.marketOdds?.[`away-team-under-${line}`],
      ),
    })),
  });
}
