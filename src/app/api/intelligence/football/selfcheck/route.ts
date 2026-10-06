import { NextResponse } from "next/server";
import { runFootballSelfCheck } from "@/lib/models/football/invariants";
import { runAsianSelfCheck } from "@/lib/models/football/asian-selfcheck";

export function GET() {
  const scenarios = runFootballSelfCheck();
  const asian = runAsianSelfCheck();
  const passed =
    scenarios.every((scenario) => scenario.passed) &&
    asian.passed;

  return NextResponse.json(
    {
      model: "football.goal-state.v1",
      passed,
      scenarios,
      asian,
    },
    { status: passed ? 200 : 500 },
  );
}
