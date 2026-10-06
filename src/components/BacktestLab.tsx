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
          title: "BACKTEST LAB",
          subtitle: "Калибровка, closing line и устойчивость вне выборки",
          synthetic: "SYNTHETIC BACKTEST",
          roi: "ROI",
          clv: "Средний CLV",
          brier: "Brier",
          close: "Closing Brier",
          ece: "Calibration error",
          drawdown: "Max drawdown",
          calibration: "Калибровка",
          equity: "Equity curve",
          walk: "Walk-forward",
          rows: "решений",
        }
      : locale === "hy"
        ? {
            title: "BACKTEST LAB",
            subtitle: "Կալիբրացիա, closing line և out-of-sample կայունություն",
            synthetic: "SYNTHETIC BACKTEST",
            roi: "ROI",
            clv: "Միջին CLV",
            brier: "Brier",
            close: "Closing Brier",
            ece: "Calibration error",
            drawdown: "Max drawdown",
            calibration: "Կալիբրացիա",
            equity: "Equity curve",
            walk: "Walk-forward",
            rows: "որոշումներ",
          }
        : {
            title: "BACKTEST LAB",
            subtitle: "Calibration, closing line and out-of-sample stability",
            synthetic: "SYNTHETIC BACKTEST",
            roi: "ROI",
            clv: "Mean CLV",
            brier: "Brier",
            close: "Closing Brier",
            ece: "Calibration error",
            drawdown: "Max drawdown",
            calibration: "Calibration",
            equity: "Equity curve",
            walk: "Walk-forward",
            rows: "decisions",
          };

  return (
    <section className="panel backtestLab">
      <div className="panelHeader">
        <div>
          <span className="panelIndex">09</span>
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span className="syntheticBadge">{copy.synthetic}</span>
      </div>

      <div className="backtestMetrics">
        <BacktestMetric label={copy.roi} value={pct(metrics.roi)} tone={metrics.roi >= 0 ? "good" : "bad"} />
        <BacktestMetric label={copy.clv} value={signed(metrics.meanClvOdds)} tone={(metrics.meanClvOdds ?? 0) >= 0 ? "good" : "bad"} />
        <BacktestMetric label={copy.brier} value={metrics.brier.toFixed(3)} detail={`Δ entry +${metrics.brierDeltaVsEntry.toFixed(3)}`} />
        <BacktestMetric label={copy.close} value={metrics.closingMarketBrier?.toFixed(3) ?? "—"} detail={metrics.brierDeltaVsClose == null ? "no close" : `Δ close ${metrics.brierDeltaVsClose >= 0 ? "+" : ""}${metrics.brierDeltaVsClose.toFixed(3)}`} />
        <BacktestMetric label={copy.ece} value={pct(metrics.expectedCalibrationError)} />
        <BacktestMetric label={copy.drawdown} value={metrics.maxDrawdown.toFixed(2)} detail={`${metrics.actionableRows} ${copy.rows}`} />
      </div>

      <div className="backtestVisualGrid">
        <div className="calibrationPanel">
          <div className="miniSectionHead">
            <span>{copy.calibration}</span>
            <small>Observed vs predicted</small>
          </div>
          <div className="calibrationChart">
            <div className="perfectCalibration" />
            {calibration.map((bucket) => (
              <div className="calibrationBucket" key={`${bucket.from}-${bucket.to}`}>
                <div
                  className="calibrationObserved"
                  style={{ height: `${Math.max(3, bucket.observedRate * 100)}%` }}
                />
                <i
                  className="calibrationPredicted"
                  style={{ bottom: `${bucket.meanProbability * 100}%` }}
                />
                <span>{Math.round(bucket.meanProbability * 100)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="equityPanel">
          <div className="miniSectionHead">
            <span>{copy.equity}</span>
            <small>{metrics.profit >= 0 ? "+" : ""}{metrics.profit.toFixed(2)} units</small>
          </div>
          <div className="equityBars">
            {curve.map((point) => (
              <div className="equityBarWrap" key={point.rowId}>
                <i
                  className={point.cumulative >= 0 ? "positiveBar" : "negativeBar"}
                  style={{
                    height: `${Math.max(2, (Math.abs(point.cumulative) / maxCurve) * 88)}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="walkForwardPanel">
          <div className="miniSectionHead">
            <span>{copy.walk}</span>
            <small>{sandboxWalkForward.summary.count} windows</small>
          </div>
          <div className="walkStats">
            <div><span>Mean ROI</span><strong>{pct(sandboxWalkForward.summary.meanRoi)}</strong></div>
            <div><span>Mean CLV</span><strong>{signed(sandboxWalkForward.summary.meanClvOdds)}</strong></div>
            <div><span>Positive ROI</span><strong>{sandboxWalkForward.summary.positiveRoiWindows}/{sandboxWalkForward.summary.count}</strong></div>
            <div><span>Positive CLV</span><strong>{sandboxWalkForward.summary.positiveClvWindows}/{sandboxWalkForward.summary.count}</strong></div>
          </div>
          <div className="walkWindows">
            {sandboxWalkForward.windows.map((window, index) => (
              <div className="walkWindow" key={window.testFrom}>
                <span>W{index + 1}</span>
                <i className={window.report.metrics.roi >= 0 ? "up" : "down"} />
                <strong>{pct(window.report.metrics.roi)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="backtestSegments">
        {sandboxBacktestReport.segments.byMarket.slice(0, 5).map((segment) => (
          <div className="segmentRow" key={segment.key}>
            <div>
              <strong>{segment.label.replace("football.", "")}</strong>
              <span>{segment.rows} rows</span>
            </div>
            <span>ROI <b className={segment.roi >= 0 ? "positive" : "negative"}>{pct(segment.roi)}</b></span>
            <span>CLV <b>{signed(segment.meanClvOdds)}</b></span>
            <span>Brier <b>{segment.brier.toFixed(3)}</b></span>
          </div>
        ))}
      </div>

      <div className="backtestWarning">
        <strong>{copy.synthetic}</strong>
        <p>
          {locale === "ru"
            ? "Эти результаты генерируются детерминированным sandbox-набором и ничего не доказывают о реальной доходности. Настоящие выводы появятся только после загрузки исторических odds/outcomes и walk-forward проверки."
            : locale === "hy"
              ? "Այս արդյունքները սինթետիկ sandbox տվյալներից են և չեն ապացուցում իրական եկամտաբերություն։ Իրական եզրակացությունները կլինեն միայն historical odds/outcomes և walk-forward validation-ից հետո։"
              : "These results come from a deterministic synthetic sandbox and do not prove real profitability. Real conclusions require historical odds/outcomes and walk-forward validation."}
        </p>
      </div>
    </section>
  );
}

function BacktestMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="backtestMetric">
      <span>{label}</span>
      <strong className={tone === "good" ? "positive" : tone === "bad" ? "negative" : ""}>{value}</strong>
      <small>{detail ?? " "}</small>
    </div>
  );
}
