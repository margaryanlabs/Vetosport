"use client";

import { useEffect, useState } from "react";

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
  provenance,
}: {
  points: ProbabilityPoint[];
  label: string;
  provenance?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, points.length - 1));

  useEffect(() => {
    setSelectedIndex(Math.max(0, points.length - 1));
  }, [points]);

  if (points.length === 0) {
    return (
      <section className="parallaxView parallaxEmpty">
        <div className="parallaxViewHead"><div><span>VETO PARALLAX</span><strong>{label}</strong></div></div>
        <div className="parallaxNoData"><strong>История вероятности ещё не получена.</strong><p>VETO не рисует линию, пока нет сохранённых точек состояния.</p></div>
      </section>
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
  const inspected = points[Math.min(selectedIndex, points.length - 1)] ?? latest;
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
            <linearGradient id="parallaxGapFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff2d2d" stopOpacity=".18" />
              <stop offset="100%" stopColor="#ff2d2d" stopOpacity=".015" />
            </linearGradient>
            <filter id="parallaxGlow">
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

          <path d={area} className="parallaxGapArea" />
          <path d={path(reality)} className="parallaxRealityPath" />
          <path d={path(market)} className="parallaxMarketPath" />

          {reality.length > 0 && (
            <circle
              cx={reality[reality.length - 1].x}
              cy={reality[reality.length - 1].y}
              r="5"
              className="parallaxRealityDot"
              filter="url(#parallaxGlow)"
            />
          )}
          {market.length > 0 && (
            <circle
              cx={market[market.length - 1].x}
              cy={market[market.length - 1].y}
              r="5"
              className="parallaxMarketDot"
              filter="url(#parallaxGlow)"
            />
          )}

          {points.map((point, index) => (
            <g
              className={`parallaxPoint ${selectedIndex === index ? "active" : ""}`}
              key={point.label}
              onClick={() => setSelectedIndex(index)}
              onFocus={() => setSelectedIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedIndex(index);
                }
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              role="button"
              tabIndex={0}
            >
              <circle cx={reality[index]?.x} cy={reality[index]?.y} r="12" className="parallaxPointTarget" />
              <circle cx={market[index]?.x} cy={market[index]?.y} r="12" className="parallaxPointTarget" />
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

      {inspected && (
        <div className="parallaxPointDetail" aria-live="polite">
          <span>ВЫБРАННЫЙ МОМЕНТ · {inspected.label}</span>
          <strong>VETO {(inspected.veto * 100).toFixed(1)}%</strong>
          <strong>РЫНОК {(inspected.market * 100).toFixed(1)}%</strong>
          <em>{provenance ?? "ИСТОЧНИК НЕ УКАЗАН"}</em>
        </div>
      )}

      <div className="parallaxReadout parallaxReadoutV2">
        <div>
          <span>VETO СЕЙЧАС</span>
          <strong>{latest ? (latest.veto * 100).toFixed(1) : "—"}%</strong>
        </div>
        <div>
          <span>РЫНОК СЕЙЧАС</span>
          <strong>{latest ? (latest.market * 100).toFixed(1) : "—"}%</strong>
        </div>
        <div>
          <span>PRICE RESPONSE</span>
          <strong>{response}</strong>
          <small>{gapDelta >= 0 ? "+" : ""}{(gapDelta * 100).toFixed(1)} pp gap change</small>
        </div>
        <p>
          The visible space between these lines is the VETO object: the distance between evidence-led reality and the price-implied world.
        </p>
      </div>
    </div>
  );
}
