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
import { runCouncilSelfCheck } from "@/lib/council/selfcheck";
import { runAlphaMemorySelfCheck } from "@/lib/alpha/selfcheck";
import { runExperimentLedgerSelfCheck } from "@/lib/research/selfcheck";
import { runTruthPlaneSelfCheck } from "@/lib/truth/selfcheck";
import { runContractSemanticsSelfCheck } from "@/lib/contracts/selfcheck";
import { runDataPlaneSelfCheck } from "@/lib/data-plane/selfcheck";
import { runSensorIntegritySelfCheck } from "@/lib/integrity/selfcheck";
import { runVoiSelfCheck } from "@/lib/voi/selfcheck";
import { runCapacitySelfCheck } from "@/lib/capacity/selfcheck";
import { runSemanticDriftSelfCheck } from "@/lib/drift/selfcheck";
import { runLeakageSelfCheck } from "@/lib/leakage/selfcheck";
import { runDiscoveryControlSelfCheck } from "@/lib/discovery/selfcheck";
import { runCalibrationDriftSelfCheck } from "@/lib/calibration/selfcheck";
import { runSuspensionCensoringSelfCheck } from "@/lib/censoring/selfcheck";
import { runAbstentionSelfCheck } from "@/lib/abstention/selfcheck";
import { runRegimeChangeSelfCheck } from "@/lib/regime/selfcheck";
import { runRegimeAttributionSelfCheck } from "@/lib/regime-attribution/selfcheck";
import { runRegimeRouterSelfCheck } from "@/lib/regime-router/selfcheck";

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
    modelCouncil: {
      model: "veto.council.lineage.v2",
      ...runCouncilSelfCheck(),
    },
    alphaMemory: {
      model: "veto.alpha.memory.v1",
      ...runAlphaMemorySelfCheck(),
    },
    experimentLedger: {
      model: "veto.research.preregistered.v1",
      ...runExperimentLedgerSelfCheck(),
    },
    truthPlane: {
      model: "veto.truth.bitemporal.v1",
      ...runTruthPlaneSelfCheck(),
    },
    contractSemantics: {
      model: "veto.contracts.semantics.v1",
      ...runContractSemanticsSelfCheck(),
    },
    dataPlane: {
      model: "veto.data-plane.v1",
      ...runDataPlaneSelfCheck(),
    },
    sensorIntegrity: {
      model: "veto.integrity.identifiability.v1",
      ...runSensorIntegritySelfCheck(),
    },
    valueOfInformation: {
      model: "veto.voi.router.v1",
      ...runVoiSelfCheck(),
    },
    marketCapacity: {
      model: "veto.capacity.tradability.v1",
      ...runCapacitySelfCheck(),
    },
    semanticDrift: {
      model: "veto.semantic-drift.v1",
      ...runSemanticDriftSelfCheck(),
    },
    leakageMonitor: {
      model: "veto.leakage.negative-controls.v1",
      ...runLeakageSelfCheck(),
    },
    discoveryControl: {
      model: "veto.discovery.control.v1",
      ...runDiscoveryControlSelfCheck(),
    },
    calibrationDrift: {
      model: "veto.calibration.drift.v1",
      ...runCalibrationDriftSelfCheck(),
    },
    suspensionCensoring: {
      model: "veto.suspension.censoring.v1",
      ...runSuspensionCensoringSelfCheck(),
    },
    abstentionBoundary: {
      model: "veto.abstention.boundary.v1",
      ...runAbstentionSelfCheck(),
    },
    regimeChange: {
      model: "veto.regime.change-point.v1",
      ...runRegimeChangeSelfCheck(),
    },
    regimeAttribution: {
      model: "veto.regime.attribution.v1",
      ...runRegimeAttributionSelfCheck(),
    },
    regimeRouter: {
      model: "veto.regime.expert-router.v1",
      ...runRegimeRouterSelfCheck(),
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
