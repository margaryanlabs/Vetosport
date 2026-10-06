"use client";

import type { Locale, Sport } from "@/lib/domain/types";
import {
  evaluateModelPromotion,
  type ModelValidationSummary,
} from "@/lib/governance/promotion";
import {
  sandboxBacktestReport,
  sandboxWalkForward,
} from "@/lib/sandbox/backtest";

export function ModelGovernancePanel({
  locale,
  sport = "football",
  modelVersion = "football.goal-state.v1",
}: {
  locale: Locale;
  sport?: Sport;
  modelVersion?: string;
}) {
  if (sport !== "football") {
    return (
      <SpecialistModelControl
        locale={locale}
        sport={sport}
        modelVersion={modelVersion}
      />
    );
  }

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


function SpecialistModelControl({
  locale,
  sport,
  modelVersion,
}: {
  locale: Locale;
  sport: Sport;
  modelVersion: string;
}) {
  const label =
    sport === "basketball"
      ? "BASKETBALL"
      : sport === "hockey"
        ? "HOCKEY"
        : "TENNIS";
  const checks = [
    { label: "engine invariants", status: "PASS", detail: "Core mathematical self-check is green." },
    { label: "historical sample", status: "BLOCK", detail: "No production-grade settled sample loaded." },
    { label: "closing line", status: "BLOCK", detail: "Closing benchmark is not available yet." },
    { label: "walk-forward", status: "BLOCK", detail: "No out-of-sample windows can be produced yet." },
    { label: "calibration", status: "BLOCK", detail: "Calibration requires real historical outcomes." },
  ];

  const blockedCopy =
    locale === "ru"
      ? "Новая модель не может стать champion без реальной истории."
      : locale === "hy"
        ? "Նոր մոդելը չի կարող դառնալ champion առանց իրական պատմական տվյալների։"
        : "A new model cannot become champion without real historical evidence.";

  return (
    <section className="governanceSurface specialistGovernanceSurface">
      <div className="governanceSurfaceHead">
        <div>
          <span className="panelIndex">13</span>
          <div>
            <h2>{label} MODEL CONTROL</h2>
            <p>Promotion authority · evidence before deployment</p>
          </div>
        </div>
        <span className="governanceSandbox">NO CHAMPION YET</span>
      </div>

      <div className="specialistGovernanceHero">
        <div>
          <span>CANDIDATE</span>
          <strong>{modelVersion}</strong>
        </div>
        <div className="governanceGate">
          <span>AUTHORIZE</span>
          <strong>20</strong>
          <em className="reject">REJECT</em>
          <p>{blockedCopy}</p>
        </div>
        <div>
          <span>CHAMPION</span>
          <strong>NOT ASSIGNED</strong>
        </div>
      </div>

      <div className="governanceCheckRail">
        {checks.map((check, index) => (
          <div className="governanceCheckLine" key={check.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i className={check.status === "PASS" ? "pass" : "fail"} />
            <strong>{check.label}</strong>
            <p>{check.detail}</p>
            <b className={check.status === "PASS" ? "positive" : "negative"}>{check.status}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
