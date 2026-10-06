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
    positiveClvWindows: Math.max(
      2,
      sandboxWalkForward.summary.positiveClvWindows - 1,
    ),
    positiveRoiWindows: Math.max(
      2,
      sandboxWalkForward.summary.positiveRoiWindows - 1,
    ),
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
          title: "MODEL GOVERNANCE",
          subtitle: "Champion / challenger promotion gate",
          champion: "CHAMPION",
          challenger: "CHALLENGER",
          synthetic: "SANDBOX VALIDATION",
          blocked: "Promotion заблокирован до реальной истории",
        }
      : locale === "hy"
        ? {
            title: "MODEL GOVERNANCE",
            subtitle: "Champion / challenger promotion gate",
            champion: "CHAMPION",
            challenger: "CHALLENGER",
            synthetic: "SANDBOX VALIDATION",
            blocked: "Promotion-ը արգելափակված է մինչև իրական պատմական տվյալները",
          }
        : {
            title: "MODEL GOVERNANCE",
            subtitle: "Champion / challenger promotion gate",
            champion: "CHAMPION",
            challenger: "CHALLENGER",
            synthetic: "SANDBOX VALIDATION",
            blocked: "Promotion blocked until real history is loaded",
          };

  return (
    <section className="panel governancePanel">
      <div className="panelHeader">
        <div>
          <span className="panelIndex">10</span>
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span className="syntheticBadge">{copy.synthetic}</span>
      </div>

      <div className="governanceGrid">
        <ModelCard
          role={copy.champion}
          version={champion.modelVersion}
          brier={champion.brier}
          ece={champion.expectedCalibrationError}
          clv={champion.meanClvOdds}
          active
        />

        <div className="promotionGate">
          <div className={"gateDial " + gate.decision.toLowerCase()}>
            <span>GATE</span>
            <strong>{gate.score}</strong>
            <em>{gate.decision}</em>
          </div>
          <p>{copy.blocked}</p>
        </div>

        <ModelCard
          role={copy.challenger}
          version={challenger.modelVersion}
          brier={challenger.brier}
          ece={challenger.expectedCalibrationError}
          clv={challenger.meanClvOdds}
        />
      </div>

      <div className="governanceChecks">
        {gate.checks.map((check) => (
          <div className="governanceCheck" key={check.id}>
            <i className={check.passed ? "pass" : "fail"} />
            <span>{check.id.replaceAll("-", " ")}</span>
            <p>{check.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelCard({
  role,
  version,
  brier,
  ece,
  clv,
  active = false,
}: {
  role: string;
  version: string;
  brier: number;
  ece: number;
  clv?: number;
  active?: boolean;
}) {
  const clvLabel =
    clv == null
      ? "—"
      : (clv >= 0 ? "+" : "") + (clv * 100).toFixed(2) + "%";

  return (
    <article className={"modelGovernanceCard " + (active ? "active" : "")}>
      <div>
        <span>{role}</span>
        {active && <i>LIVE</i>}
      </div>
      <strong>{version}</strong>
      <dl>
        <div><dt>Brier</dt><dd>{brier.toFixed(3)}</dd></div>
        <div><dt>ECE</dt><dd>{(ece * 100).toFixed(1)}%</dd></div>
        <div><dt>CLV</dt><dd>{clvLabel}</dd></div>
      </dl>
    </article>
  );
}
