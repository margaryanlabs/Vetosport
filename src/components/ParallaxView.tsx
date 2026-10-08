"use client";

import type { ProbabilityPoint } from "@/lib/sandbox/live";

type XY = { x: number; y: number };

const W = 760;
const H = 250;
const PAD_Y = 26;

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
}: {
  points: ProbabilityPoint[];
  label: string;
}) {
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
  const gap = latest ? latest.veto - latest.market : 0;

  return (
    <div className="parallaxView">
      <div className="parallaxViewHead">
        <div>
          <span>VETO PARALLAX</span>
          <strong>{label}</strong>
        </div>
        <div className="parallaxGap">
          <small>DIVERGENCE</small>
          <b>{gap >= 0 ? "+" : ""}{(gap * 100).toFixed(1)} pp</b>
        </div>
      </div>

      <div className="parallaxCanvas">
        <div className="parallaxLegend">
          <span><i className="reality" /> REALITY / VETO</span>
          <span><i className="market" /> MARKET</span>
        </div>

        <svg viewBox={`0 0 ${W} ${H + 28}`} role="img" aria-label="Reality and market probability divergence">
          <defs>
            <linearGradient id="parallaxGapFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff2d2d" stopOpacity=".12" />
              <stop offset="100%" stopColor="#ff2d2d" stopOpacity=".01" />
            </linearGradient>
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
              r="4.5"
              className="parallaxRealityDot"
            />
          )}
          {market.length > 0 && (
            <circle
              cx={market[market.length - 1].x}
              cy={market[market.length - 1].y}
              r="4.5"
              className="parallaxMarketDot"
            />
          )}

          {points.map((point, index) => (
            <text
              key={point.label}
              x={24 + (index / Math.max(1, points.length - 1)) * (W - 48)}
              y={H + 20}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              className="parallaxAxisLabel"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="parallaxReadout">
        <div><span>REALITY</span><strong>{latest ? (latest.veto * 100).toFixed(1) : "—"}%</strong></div>
        <div><span>MARKET</span><strong>{latest ? (latest.market * 100).toFixed(1) : "—"}%</strong></div>
        <p>
          The visible space between these lines is the core VETO object: the distance between the evidence-led state and the price-implied world.
        </p>
      </div>
    </div>
  );
}
