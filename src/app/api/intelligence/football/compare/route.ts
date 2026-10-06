import { NextResponse } from "next/server";
import type { FootballLiveInputs } from "@/lib/models/football/types";
import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";
import {
  diffFootballSurfaces,
  materialFootballShifts,
} from "@/lib/models/football/diff";

interface Body {
  before?: FootballLiveInputs;
  after?: FootballLiveInputs;
  minimumProbabilityShift?: number;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  if (!body.before || !body.after) {
    return NextResponse.json(
      { error: "before and after football inputs are required" },
      { status: 400 },
    );
  }

  try {
    const before = buildFootballProbabilitySurface(body.before);
    const after = buildFootballProbabilitySurface(body.after);
    const shifts = diffFootballSurfaces(before, after);
    const material = materialFootballShifts(
      before,
      after,
      body.minimumProbabilityShift ?? 0.01,
    );

    return NextResponse.json({
      model: "football.goal-state.v1",
      before: {
        remainingGoals: before.remainingGoals,
        generatedAt: before.generatedAt,
      },
      after: {
        remainingGoals: after.remainingGoals,
        generatedAt: after.generatedAt,
      },
      materialCount: material.length,
      material,
      topShifts: shifts.slice(0, 12),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Surface comparison failed" },
      { status: 422 },
    );
  }
}
