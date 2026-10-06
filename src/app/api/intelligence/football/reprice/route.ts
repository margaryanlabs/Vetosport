import { NextResponse } from "next/server";
import type { LiveTwinState } from "@/lib/live-twin/types";
import { footballInputsFromLiveTwin } from "@/lib/models/football/from-live-twin";
import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";

interface Body {
  state?: LiveTwinState;
  baseline?: {
    prematchExpectedHomeGoals?: number;
    prematchExpectedAwayGoals?: number;
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  if (!body.state || !body.baseline) {
    return NextResponse.json(
      { error: "state and baseline are required" },
      { status: 400 },
    );
  }

  const home = body.baseline.prematchExpectedHomeGoals;
  const away = body.baseline.prematchExpectedAwayGoals;

  if (
    typeof home !== "number" ||
    !Number.isFinite(home) ||
    home <= 0 ||
    typeof away !== "number" ||
    !Number.isFinite(away) ||
    away <= 0
  ) {
    return NextResponse.json(
      { error: "baseline expected goals must be positive finite numbers" },
      { status: 400 },
    );
  }

  try {
    const inputs = footballInputsFromLiveTwin(body.state, {
      prematchExpectedHomeGoals: home,
      prematchExpectedAwayGoals: away,
    });
    const surface = buildFootballProbabilitySurface(inputs);

    return NextResponse.json({
      model: "football.goal-state.v1",
      version: "0.1.0",
      warning:
        "Heuristic live modifiers are research priors until calibrated out-of-sample.",
      surface,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Football repricing failed" },
      { status: 422 },
    );
  }
}
