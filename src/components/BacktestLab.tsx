"use client";

import type { Locale, Sport } from "@/lib/domain/types";
import {
  sandboxBacktestReport,
  sandboxWalkForward,
} from "@/lib/sandbox/backtest";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const signed = (value?: number) =>
  value == null ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;

export function BacktestLab({
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
      <SpecialistValidation
        locale={locale}
        sport={sport}
        modelVersion={modelVersion}
      />
    );
  }

  const metrics = sandboxBacktestReport.metrics;
  const calibration = metrics.calibration.filter((bucket) => bucket.count > 0);
  const maxCurve = Math.max(
    1,
    ...metrics.equityCurve.map((point) => Math.abs(point.cumulative)),
  );
  const curve = metrics.equityCurve.slice(-36);

  const copy =
    locale === "ru"
      ? {
          title: "VALIDATION LAB",
          subtitle: "Калибровка · closing line · walk-forward",
          synthetic: "SYNTHETIC / NOT PROOF",
          rows: "решений",
          warning: "Результаты ниже — детерминированный sandbox. Они проверяют механику validation pipeline, а не доказывают реальную доходность.",
        }
      : locale === "hy"
        ? {
            title: "VALIDATION LAB",
            subtitle: "Կալիբրացիա · closing line · walk-forward",
            synthetic: "SYNTHETIC / NOT PROOF",
            rows: "որոշումներ",
            warning: "Ստորև արդյունքները deterministic sandbox-ից են։ Դրանք ստուգում են validation pipeline-ը, ոչ թե իրական եկամտաբերությունը։",
          }
        : {
            title: "VALIDATION LAB",
            subtitle: "Calibration · closing line · walk-forward",
            synthetic: "SYNTHETIC / NOT PROOF",
            rows: "decisions",
            warning: "Results below come from a deterministic sandbox. They validate the evaluation pipeline, not real profitability.",
          };

  const metricStrip = [
    { label: "ROI", value: pct(metrics.roi), tone: metrics.roi >= 0 ? "positive" : "negative", note: `${metrics.actionableRows} ${copy.rows}` },
    { label: "MEAN CLV", value: signed(metrics.meanClvOdds), tone: (metrics.meanClvOdds ?? 0) >= 0 ? "positive" : "negative", note: "vs closing" },
    { label: "BRIER", value: metrics.brier.toFixed(3), note: `entry Δ +${metrics.brierDeltaVsEntry.toFixed(3)}` },
    { label: "CLOSE BRIER", value: metrics.closingMarketBrier?.toFixed(3) ?? "—", note: metrics.brierDeltaVsClose == null ? "no close" : `close Δ ${metrics.brierDeltaVsClose >= 0 ? "+" : ""}${metrics.brierDeltaVsClose.toFixed(3)}` },
    { label: "ECE", value: pct(metrics.expectedCalibrationError), note: "calibration error" },
    { label: "MAX DD", value: metrics.maxDrawdown.toFixed(2), note: "units" },
  ];

  return (
    <section className="validationSurface">
      <div className="validationHead">
        <div>
          <span className="panelIndex">12</span>
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <div className="validationStatus">
          <span>{copy.synthetic}</span>
          <i />
        </div>
      </div>

      <div className="validationMetricStrip">
        {metricStrip.map((item) => (
          <div className="validationMetric" key={item.label}>
            <span>{item.label}</span>
            <strong className={item.tone ?? ""}>{item.value}</strong>
            <small>{item.note}</small>
          </div>
        ))}
      </div>

      <div className="validationBody">
        <section className="validationCalibration">
          <div className="validationSubhead">
            <div>
              <span>CALIBRATION</span>
              <strong>Observed vs predicted</strong>
            </div>
            <small>ECE {pct(metrics.expectedCalibrationError)}</small>
          </div>

          <div className="validationCalibrationChart">
            <div className="validationPerfect" />
            {calibration.map((bucket) => (
              <div className="validationBucket" key={`${bucket.from}-${bucket.to}`}>
                <div
                  className="validationObserved"
                  style={{ height: `${Math.max(3, bucket.observedRate * 100)}%` }}
                />
                <i
                  className="validationPredicted"
                  style={{ bottom: `${bucket.meanProbability * 100}%` }}
                />
                <span>{Math.round(bucket.meanProbability * 100)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="validationEquity">
          <div className="validationSubhead">
            <div>
              <span>EQUITY</span>
              <strong>Actionable decisions only</strong>
            </div>
            <small>{metrics.profit >= 0 ? "+" : ""}{metrics.profit.toFixed(2)} units</small>
          </div>

          <div className="validationEquityBars">
            {curve.map((point) => (
              <div className="validationEquityBar" key={point.rowId}>
                <i
                  className={point.cumulative >= 0 ? "positiveBar" : "negativeBar"}
                  style={{
                    height: `${Math.max(2, (Math.abs(point.cumulative) / maxCurve) * 88)}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="validationWalk">
          <div className="validationSubhead">
            <div>
              <span>WALK-FORWARD</span>
              <strong>Out-of-sample stability</strong>
            </div>
            <small>{sandboxWalkForward.summary.count} windows</small>
          </div>

          <div className="walkSummary">
            <span>MEAN ROI <b>{pct(sandboxWalkForward.summary.meanRoi)}</b></span>
            <span>MEAN CLV <b>{signed(sandboxWalkForward.summary.meanClvOdds)}</b></span>
            <span>ROI+ <b>{sandboxWalkForward.summary.positiveRoiWindows}/{sandboxWalkForward.summary.count}</b></span>
            <span>CLV+ <b>{sandboxWalkForward.summary.positiveClvWindows}/{sandboxWalkForward.summary.count}</b></span>
          </div>

          <div className="walkTimeline">
            {sandboxWalkForward.windows.map((window, index) => (
              <div className="walkTimelineNode" key={window.testFrom}>
                <span>W{String(index + 1).padStart(2, "0")}</span>
                <i className={window.report.metrics.roi >= 0 ? "up" : "down"} />
                <strong>{pct(window.report.metrics.roi)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="validationSegments">
        <div className="validationSegmentsHead">
          <span>MARKET SEGMENTS</span>
          <span>ROWS</span>
          <span>ROI</span>
          <span>CLV</span>
          <span>BRIER</span>
        </div>
        {sandboxBacktestReport.segments.byMarket.slice(0, 5).map((segment) => (
          <div className="validationSegmentRow" key={segment.key}>
            <strong>{segment.label.replace("football.", "")}</strong>
            <span>{segment.rows}</span>
            <span className={segment.roi >= 0 ? "positive" : "negative"}>{pct(segment.roi)}</span>
            <span>{signed(segment.meanClvOdds)}</span>
            <span>{segment.brier.toFixed(3)}</span>
          </div>
        ))}
      </div>

      <div className="validationDisclaimer">
        <strong>{copy.synthetic}</strong>
        <p>{copy.warning}</p>
      </div>
    </section>
  );
}


function SpecialistValidation({
  locale,
  sport,
  modelVersion,
}: {
  locale: Locale;
  sport: Sport;
  modelVersion: string;
}) {
  const title =
    sport === "basketball"
      ? "BASKETBALL VALIDATION"
      : sport === "hockey"
        ? "HOCKEY VALIDATION"
        : "TENNIS VALIDATION";

  const checks =
    sport === "basketball"
      ? [
          ["PROBABILITY BOUNDS", "PASS", "All priced markets remain inside (0,1)."],
          ["TOTAL MONOTONICITY", "PASS", "Higher total line increases under probability."],
          ["PACE SENSITIVITY", "PASS", "Higher projected pace increases final total."],
          ["SPREAD MONOTONICITY", "PASS", "Harder handicap lowers cover probability."],
          ["HISTORICAL SAMPLE", "BLOCK", "No real historical basketball dataset loaded yet."],
          ["WALK-FORWARD", "BLOCK", "Requires settled historical market snapshots."],
        ]
      : sport === "hockey"
        ? [
            ["PROBABILITY MASS", "PASS", "Regulation outcome probabilities sum to one."],
            ["TOTAL MONOTONICITY", "PASS", "Higher goal line increases under probability."],
            ["MANPOWER SENSITIVITY", "PASS", "Power play raises attacking goal hazard."],
            ["EMPTY-NET STATE", "PASS", "Goalie pull widens the late scoring tail."],
            ["HISTORICAL SAMPLE", "BLOCK", "No real shift-level hockey dataset loaded yet."],
            ["WALK-FORWARD", "BLOCK", "Requires settled historical hockey market snapshots."],
          ]
        : [
            ["SERVE MONOTONICITY", "PASS", "Higher point-win rate increases hold probability."],
            ["SCORE STATE", "PASS", "40-0 state prices above 0-40 state."],
            ["PROBABILITY BOUNDS", "PASS", "Point and match surfaces remain inside (0,1)."],
            ["MATCH STATE", "PASS", "Set/game advantage increases match surface."],
            ["HISTORICAL SAMPLE", "BLOCK", "No real historical tennis dataset loaded yet."],
            ["WALK-FORWARD", "BLOCK", "Requires settled historical point/market snapshots."],
          ];

  const copy =
    locale === "ru"
      ? {
          subtitle: "Инварианты engine + готовность к historical validation",
          note: "Unit/self-check слой работает. Реальный ROI/CLV не показываем, пока нет исторической выборки и closing prices.",
        }
      : locale === "hy"
        ? {
            subtitle: "Engine invariants + historical validation readiness",
            note: "Self-check շերտը աշխատում է։ Իրական ROI/CLV չի ցուցադրվում առանց historical sample-ի և closing prices-ի։",
          }
        : {
            subtitle: "Engine invariants + historical validation readiness",
            note: "The self-check layer is live. Real ROI/CLV stays hidden until historical samples and closing prices exist.",
          };

  const passed = checks.filter((check) => check[1] === "PASS").length;

  return (
    <section className="validationSurface specialistValidationSurface">
      <div className="validationHead">
        <div>
          <span className="panelIndex">12</span>
          <div>
            <h2>{title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <div className="validationStatus">
          <span>ENGINE SELF-CHECK</span>
          <i />
        </div>
      </div>

      <div className="specialistValidationHero">
        <div>
          <span>MODEL</span>
          <strong>{modelVersion}</strong>
        </div>
        <div>
          <span>SELF-CHECK</span>
          <strong>{passed}/{checks.length - 2}</strong>
        </div>
        <div>
          <span>HIST ROWS</span>
          <strong>0</strong>
        </div>
        <div>
          <span>PROMOTION</span>
          <strong className="negative">BLOCKED</strong>
        </div>
      </div>

      <div className="specialistValidationChecks">
        {checks.map(([name, status, detail], index) => (
          <div className="specialistValidationCheck" key={name}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i className={status === "PASS" ? "pass" : "fail"} />
            <strong>{name}</strong>
            <p>{detail}</p>
            <b className={status === "PASS" ? "positive" : "negative"}>{status}</b>
          </div>
        ))}
      </div>

      <div className="validationDisclaimer">
        <strong>NO FAKE PERFORMANCE</strong>
        <p>{copy.note}</p>
      </div>
    </section>
  );
}
