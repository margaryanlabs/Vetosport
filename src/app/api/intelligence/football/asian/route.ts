import { NextResponse } from "next/server";
import type { FootballLiveInputs } from "@/lib/models/football/types";
import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";
import {
  priceAsianHandicap,
  priceAsianTotal,
} from "@/lib/models/football/asian";

interface Body {
  inputs?: FootballLiveInputs;
  market?: "total" | "handicap";
  side?: "over" | "under" | "home" | "away";
  line?: number;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  if (!body.inputs || !body.market || !body.side || typeof body.line !== "number") {
    return NextResponse.json(
      { error: "inputs, market, side and numeric line are required" },
      { status: 400 },
    );
  }

  try {
    const surface = buildFootballProbabilitySurface(body.inputs);

    if (body.market === "total" && (body.side === "over" || body.side === "under")) {
      return NextResponse.json({
        market: body.market,
        side: body.side,
        line: body.line,
        pricing: priceAsianTotal(surface.scorelines, body.side, body.line),
      });
    }

    if (body.market === "handicap" && (body.side === "home" || body.side === "away")) {
      return NextResponse.json({
        market: body.market,
        side: body.side,
        line: body.line,
        pricing: priceAsianHandicap(surface.scorelines, body.side, body.line),
      });
    }

    return NextResponse.json(
      { error: "side is incompatible with market" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Asian pricing failed" },
      { status: 422 },
    );
  }
}
