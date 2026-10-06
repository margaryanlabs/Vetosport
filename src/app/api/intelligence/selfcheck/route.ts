import { NextResponse } from "next/server";
import { runFootballSelfCheck } from "@/lib/models/football/invariants";
import { runAsianSelfCheck } from "@/lib/models/football/asian-selfcheck";
import { runBasketballSelfCheck } from "@/lib/models/basketball/selfcheck";
import { runTennisSelfCheck } from "@/lib/models/tennis/selfcheck";
import { runHockeySelfCheck } from "@/lib/models/hockey/selfcheck";

export const dynamic = "force-dynamic";

export function GET() {
  const footballScenarios = runFootballSelfCheck();
  const footballAsian = runAsianSelfCheck();

  const engines = {
    football: {
      model: "football.goal-state.v1",
      passed:
        footballScenarios.every((scenario) => scenario.passed) &&
        footballAsian.passed,
      checks:
        footballScenarios.reduce(
          (sum, scenario) =>
            sum + scenario.invariants.filter((check) => check.passed).length,
          0,
        ) +
        footballAsian.checks.filter((check) => check.passed).length,
    },
    basketball: {
      model: "basketball.possession-state.v1",
      ...runBasketballSelfCheck(),
    },
    tennis: {
      model: "tennis.point-state.v1",
      ...runTennisSelfCheck(),
    },
    hockey: {
      model: "hockey.shift-goalie.v1",
      ...runHockeySelfCheck(),
    },
  };

  const passed = Object.values(engines).every(
    (engine) => engine.passed,
  );

  return NextResponse.json(
    {
      passed,
      generatedAt: new Date().toISOString(),
      engines,
    },
    { status: passed ? 200 : 500 },
  );
}
