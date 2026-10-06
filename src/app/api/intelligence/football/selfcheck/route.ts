import { NextResponse } from "next/server";
import { runFootballSelfCheck } from "@/lib/models/football/invariants";

export function GET() {
  const scenarios = runFootballSelfCheck();
  const passed = scenarios.every((scenario) => scenario.passed);

  return NextResponse.json(
    {
      model: "football.goal-state.v1",
      passed,
      scenarios,
    },
    { status: passed ? 200 : 500 },
  );
}
