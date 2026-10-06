import { NextResponse } from "next/server";
import {
  buildTennisPointState,
  priceTennisMarket,
  type TennisStateInput,
} from "@/lib/models/tennis/engine";

interface Body extends TennisStateInput {
  matchMarketOdds?: number;
  holdMarketOdds?: number;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  const required = [
    body.playerServePointWin,
    body.opponentServePointWin,
    body.playerSets,
    body.opponentSets,
    body.playerGames,
    body.opponentGames,
  ];

  if (required.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return NextResponse.json(
      { error: "Valid tennis point-state inputs are required." },
      { status: 400 },
    );
  }

  const state = buildTennisPointState(body);

  return NextResponse.json({
    state,
    markets: {
      playerMatchWinner: priceTennisMarket(
        state.matchWinProbability,
        body.matchMarketOdds,
      ),
      playerNextHold: priceTennisMarket(
        state.playerHoldProbability,
        body.holdMarketOdds,
      ),
      playerNextBreak: priceTennisMarket(state.playerBreakProbability),
    },
  });
}
