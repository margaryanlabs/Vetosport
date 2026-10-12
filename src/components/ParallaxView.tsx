"use client";

import { useEffect, useId, useState } from "react";
import type { ProbabilityPoint } from "@/lib/sandbox/live";

type XY = { x: number; y: number };

const W = 760;
const H = 260;
const PAD_Y = 28;

const coords = (
  points: ProbabilityPoint[],
  key: "market" | "veto",
  min: number,
  max: number,
): XY[] =>
  points.map((point, index) => ({
    x: 24 + (index / Math.max(1, points.length - 1)) * (W - 48),
    y: PAD_Y + (1 - (point[key] - min) / Math.max(.001, max - min)) * (H - PAD_Y * 2),
  }));

const path = (points: XY[]) =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

export function ParallaxView({
  points,
  label,
  sourceLabel = "Сохранённая шкала вероятностей",
}: {
  points: ProbabilityPoint[];
  label: string;
  sourceLabel?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, points.length - 1));
  const chartId = useId().replace(/:/g, "");
  useEffect(() => {
    setSelectedIndex(Math.max(0, points.length - 1));
  }, [points.length, label]);

  if (!points.length) {
    return (
      <div className="parallaxEmpty" role="status">
        <span>ШКАЛА ПОКА ПУСТА</span>
        <p>VETO покажет движение вероятности, когда появятся подтверждённые снимки данных.</p>
      </div>
    );
  }

  const values = points.flatMap((point) => [point.market, point.veto]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max(.025, (rawMax - rawMin) * .35);
  const min = Math.max(0, rawMin - pad);
  const max = Math.min(1, rawMax + pad);

  const reality = coords(points, "veto", min, max);
  const market = coords(points, "market", min, max);
  const area = [
    path(reality),
    ...[...market].reverse().map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    "Z",
  ].join(" ");

  const latest = points.at(-1);
  const previous = points.at(-2);
  const gap = latest ? latest.veto - latest.market : 0;
  const previousGap = previous ? previous.veto - previous.market : gap;
  const gapDelta = Math.abs(gap) - Math.abs(previousGap);
  const absGap = Math.abs(gap);

  const state =
    absGap >= 0.06
      ? "DISLOCATED"
      : absGap >= 0.025
        ? "DIVERGING"
        : "ALIGNED";

  const response =
    gapDelta > 0.002
      ? "OPENING"
      : gapDelta < -0.002
        ? "CLOSING"
        : "HOLDING";

  const intensity = Math.min(1, absGap / 0.1);
  const selectedPoint = points[Math.min(selectedIndex, points.length - 1)] ?? latest;
  const selectPoint = (index: number) => setSelectedIndex(index);

  return (
    <div className={`parallaxView parallaxState-${state.toLowerCase()}`} style={{ "--parallax-intensity": intensity } as React.CSSProperties}>
      <div className="parallaxViewHead parallaxViewHeadV2">
        <div>
          <span>VETO PARALLAX</span>
          <strong>{label}</strong>
        </div>

        <div className="parallaxStateRail" aria-label={`Parallax state: ${state}`}>
          {["ALIGNED","DIVERGING","DISLOCATED"].map((item) => (
            <span className={state===item?"active":""} key={item}>{item}</span>
          ))}
        </div>

        <div className="parallaxGap">
          <small>DIVERGENCE</small>
          <b>{gap >= 0 ? "+" : ""}{(gap * 100).toFixed(1)} pp</b>
        </div>
      </div>

      <div className="parallaxCanvas parallaxCanvasV2">
        <div className="parallaxLegend">
          <span><i className="reality" /> REALITY / VETO</span>
          <span><i className="market" /> MARKET</span>
        </div>

        <div className="parallaxNowRail" aria-hidden>
          <span>NOW</span>
        </div>

        <svg viewBox={`0 0 ${W} ${H + 28}`} role="img" aria-label="Reality and market probability divergence">
          <defs>
            <linearGradient id={`parallaxGapFill-${chartId}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff2d2d" stopOpacity=".18" />
              <stop offset="100%" stopColor="#ff2d2d" stopOpacity=".015" />
            </linearGradient>
            <filter id={`parallaxGlow-${chartId}`}>
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[.25,.5,.75].map((fraction) => (
            <line
              key={fraction}
              x1="24"
              x2={W-24}
              y1={PAD_Y + fraction * (H-PAD_Y*2)}
              y2={PAD_Y + fraction * (H-PAD_Y*2)}
              className="parallaxGrid"
            />
          ))}

          <path d={area} className="parallaxGapArea" fill={`url(#parallaxGapFill-${chartId})`} />
          <path d={path(reality)} className="parallaxRealityPath" />
          <path d={path(market)} className="parallaxMarketPath" />

          {reality.length > 0 && (
            <circle
              cx={reality[reality.length - 1].x}
              cy={reality[reality.length - 1].y}
              r="5"
              className="parallaxRealityDot"
              filter={`url(#parallaxGlow-${chartId})`}
            />
          )}
          {market.length > 0 && (
            <circle
              cx={market[market.length - 1].x}
              cy={market[market.length - 1].y}
              r="5"
              className="parallaxMarketDot"
              filter={`url(#parallaxGlow-${chartId})`}
            />
          )}

          {points.map((point, index) => (
            <g key={`${point.label}-${index}`} className={`parallaxPoint ${index === selectedIndex ? "active" : ""}`}>
              <circle
                aria-label={`Выбрать снимок ${point.label}`}
                cx={reality[index].x}
                cy={reality[index].y}
                onClick={() => selectPoint(index)}
                onFocus={() => selectPoint(index)}
                onMouseEnter={() => selectPoint(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectPoint(index);
                  }
                }}
                r={index === selectedIndex ? 7 : 5}
                role="button"
                tabIndex={0}
              />
              <text
                x={24 + (index / Math.max(1, points.length - 1)) * (W - 48)}
                y={H + 20}
                textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                className="parallaxAxisLabel"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="parallaxReadout parallaxReadoutV2">
        <div>
          <span>REALITY</span>
          <strong>{latest ? (latest.veto * 100).toFixed(1) : "—"}%</strong>
        </div>
        <div>
          <span>MARKET</span>
          <strong>{latest ? (latest.market * 100).toFixed(1) : "—"}%</strong>
        </div>
        <div>
          <span>PRICE RESPONSE</span>
          <strong>{response}</strong>
          <small>{gapDelta >= 0 ? "+" : ""}{(gapDelta * 100).toFixed(1)} pp gap change</small>
        </div>
        <p>
          Разрыв показывает разницу между оценкой VETO и ценой рынка. Нажмите на точку графика, чтобы увидеть сохранённый момент.
        </p>
      </div>
      <div className="parallaxSnapshot" aria-live="polite">
        <span>ВЫБРАННЫЙ МОМЕНТ · {sourceLabel}</span>
        <strong>{selectedPoint.label}</strong>
        <div><b>VETO {((selectedPoint.veto ?? 0) * 100).toFixed(1)}%</b><b>РЫНОК {((selectedPoint.market ?? 0) * 100).toFixed(1)}%</b><b>РАЗНИЦА {((selectedPoint.veto - selectedPoint.market) * 100 >= 0 ? "+" : "")}{((selectedPoint.veto - selectedPoint.market) * 100).toFixed(1)} п.п.</b></div>
      </div>
    </div>
  );
}
