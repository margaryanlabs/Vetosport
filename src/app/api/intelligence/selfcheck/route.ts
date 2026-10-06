import { NextResponse } from "next/server";
import { runFootballSelfCheck } from "@/lib/models/football/invariants";
import { runAsianSelfCheck } from "@/lib/models/football/asian-selfcheck";
import { runBasketballSelfCheck } from "@/lib/models/basketball/selfcheck";
import { runTennisSelfCheck } from "@/lib/models/tennis/selfcheck";
import { runHockeySelfCheck } from "@/lib/models/hockey/selfcheck";
import { runParallaxSelfCheck } from "@/lib/parallax/selfcheck";
import { runTemporalSelfCheck } from "@/lib/parallax/temporal-selfcheck";
import { runPropagationSelfCheck } from "@/lib/parallax/propagation-selfcheck";
import { runShockExecutionSelfCheck } from "@/lib/parallax/shock-execution-selfcheck";

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

  const researchLayers = {
    parallax: {
      model: "veto.parallax.football.v1",
      ...runParallaxSelfCheck(),
    },
    temporalResponse: {
      model: "veto.parallax.temporal-response.v1",
      ...runTemporalSelfCheck(),
    },
    crossMarketPropagation: {
      model: "veto.parallax.cross-market.v1",
      ...runPropagationSelfCheck(),
    },
    shockExecution: {
      model: "veto.parallax.shock-execution.v1",
      ...runShockExecutionSelfCheck(),
    },
  };

  const passed =
    Object.values(engines).every((engine) => engine.passed) &&
    Object.values(researchLayers).every((layer) => layer.passed);

  return NextResponse.json(
    {
      passed,
      generatedAt: new Date().toISOString(),
      engines,
      researchLayers,
    },
    { status: passed ? 200 : 500 },
  );
}
