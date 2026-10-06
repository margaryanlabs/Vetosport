import { NextResponse } from "next/server";
import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";
import type { FootballLiveInputs } from "@/lib/models/football/types";
import {
  buildFootballParallaxContracts,
  footballParallaxContractIds,
  type FootballParallaxMarketSnapshot,
} from "@/lib/parallax/football-contracts";
import { analyzeFootballParallax } from "@/lib/parallax/engine";

interface Body {
  state: FootballLiveInputs;
  market: FootballParallaxMarketSnapshot;
  primaryContractId?: string;
  halfLifeSeconds?: number;
  ageSeconds?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body?.state || !body?.market) {
      return NextResponse.json(
        { error: "state and market are required" },
        { status: 400 },
      );
    }

    const invalidContract = footballParallaxContractIds.find((id) => {
      const value = body.market[id];
      return (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value <= 0 ||
        value >= 1
      );
    });

    if (invalidContract) {
      return NextResponse.json(
        {
          error: `market probability for ${invalidContract} must be inside (0,1)`,
        },
        { status: 400 },
      );
    }

    const oneXTwoMass =
      body.market["home-win"] +
      body.market.draw +
      body.market["away-win"];

    if (Math.abs(oneXTwoMass - 1) > 0.03) {
      return NextResponse.json(
        {
          error:
            "1X2 market probabilities must be de-vigged and sum approximately to one",
          mass: oneXTwoMass,
        },
        { status: 400 },
      );
    }

    const surface = buildFootballProbabilitySurface(body.state);
    const contracts = buildFootballParallaxContracts(body.market);
    const analysis = analyzeFootballParallax({
      scorelines: surface.scorelines,
      inputs: body.state,
      contracts,
      primaryContractId: body.primaryContractId,
      halfLifeSeconds: body.halfLifeSeconds,
      ageSeconds: body.ageSeconds,
    });

    return NextResponse.json({
      model: "veto.parallax.football.v1",
      version: "0.1.0",
      generatedAt: new Date().toISOString(),
      inputSemantics:
        "market probabilities must be no-vig estimates from synchronized contract snapshots",
      researchWarning:
        "PARALLAX v1 audits probability consistency. It does not establish a tradable edge without executable quotes, latency evidence and out-of-sample validation.",
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PARALLAX analysis failed",
      },
      { status: 422 },
    );
  }
}
