"use client";

import type { Locale } from "@/lib/domain/types";
import {
  evaluateModelPromotion,
  type ModelValidationSummary,
} from "@/lib/governance/promotion";
import {
  sandboxBacktestReport,
  sandboxWalkForward,
} from "@/lib/sandbox/backtest";

export function ModelGovernancePanel({ locale }: { locale: Locale }) {
  const metrics = sandboxBacktestReport.metrics;

  const champion: ModelValidationSummary = {
    modelVersion: "football.goal-state.v1",
    sampleRows: 842,
    leakageValid: true,
    brier: metrics.brier + 0.004,
    logLoss: metrics.logLoss + 0.006,
    expectedCalibrationError: metrics.expectedCalibrationError + 0.008,
    meanClvOdds: (metrics.meanClvOdds ?? 0) - 0.004,
    maxDrawdown: metrics.maxDrawdown * 0.94,
    walkForwardWindows: Math.max(4, sandboxWalkForward.summary.count - 1),
    positiveClvWindows: Math.max(2, sandboxWalkForward.summary.positiveClvWindows - 1),
    positiveRoiWindows: Math.max(2, sandboxWalkForward.summary.positiveRoiWindows - 1),
  };

  const challenger: ModelValidationSummary = {
    modelVersion: "football.goal-state.v1.1-candidate",
    sampleRows: sandboxBacktestReport.rows,
    leakageValid: sandboxBacktestReport.leakage.valid,
    brier: metrics.brier,
    logLoss: metrics.logLoss,
    expectedCalibrationError: metrics.expectedCalibrationError,
    meanClvOdds: metrics.meanClvOdds,
    maxDrawdown: metrics.maxDrawdown,
    walkForwardWindows: sandboxWalkForward.summary.count,
    positiveClvWindows: sandboxWalkForward.summary.positiveClvWindows,
    positiveRoiWindows: sandboxWalkForward.summary.positiveRoiWindows,
  };

  const gate = evaluateModelPromotion(champion, challenger);

  const copy =
    locale === "ru"
      ? {
          title: "MODEL CONTROL",
          subtitle: "Champion / challenger · promotion authority",
          hold: "До реальной истории promotion заблокирован",
        }
      : locale === "hy"
        ? {
            title: "MODEL CONTROL",
            subtitle: "Champion / challenger · promotion authority",
            hold: "Promotion-ը արգելափակված է մինչև իրական պատմական տվյալները",
          }
        : {
            title: "MODEL CONTROL",
            subtitle: "Champion / challenger · promotion authority",
            hold: "Promotion blocked until real history is loaded",
          };

  return (
    <section className="governanceSurface">
      <div className="governanceSurfaceHead">
        <div>
          <span className="panelIndex">13</span>
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span className="governanceSandbox">SANDBOX VALIDATION</span>
      </div>

      <div className="governanceCompare">
        <ModelLine role="CHAMPION" model={champion} active />
        <div className="governanceGate">
          <span>AUTHORIZE</span>
          <strong>{gate.score}</strong>
          <em className={gate.decision.toLowerCase()}>{gate.decision}</em>
          <p>{copy.hold}</p>
        </div>
        <ModelLine role="CHALLENGER" model={challenger} />
      </div>

      <div className="governanceCheckRail">
        {gate.checks.map((check, index) => (
          <div className="governanceCheckLine" key={check.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i className={check.passed ? "pass" : "fail"} />
            <strong>{check.id.replaceAll("-", " ")}</strong>
            <p>{check.detail}</p>
            <b>{check.passed ? "PASS" : "BLOCK"}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelLine({
  role,
  model,
  active = false,
}: {
  role: string;
  model: ModelValidationSummary;
  active?: boolean;
}) {
  return (
    <article className={"governanceModelLine " + (active ? "active" : "")}>
      <div className="governanceModelIdentity">
        <span>{role}</span>
        {active && <i>LIVE</i>}
        <strong>{model.modelVersion}</strong>
      </div>

      <div className="governanceModelMetric">
        <span>BRIER</span>
        <strong>{model.brier.toFixed(3)}</strong>
      </div>
      <div className="governanceModelMetric">
        <span>ECE</span>
        <strong>{(model.expectedCalibrationError * 100).toFixed(1)}%</strong>
      </div>
      <div className="governanceModelMetric">
        <span>CLV</span>
        <strong>{model.meanClvOdds == null ? "—" : `${model.meanClvOdds >= 0 ? "+" : ""}${(model.meanClvOdds * 100).toFixed(2)}%`}</strong>
      </div>
      <div className="governanceModelMetric">
        <span>WINDOWS</span>
        <strong>{model.walkForwardWindows}</strong>
      </div>
      <div className="governanceModelMetric">
        <span>ROWS</span>
        <strong>{model.sampleRows}</strong>
      </div>
    </article>
  );
}
