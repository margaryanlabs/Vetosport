"use client";

import type { Locale } from "@/lib/domain/types";
import {
  sandboxBacktestReport,
  sandboxWalkForward,
} from "@/lib/sandbox/backtest";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const signed = (value?: number) =>
  value == null ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;

export function BacktestLab({ locale }: { locale: Locale }) {
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
