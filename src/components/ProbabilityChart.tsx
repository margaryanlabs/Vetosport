"use client";

import type { ProbabilityPoint } from "@/lib/sandbox/live";

const pathFrom = (points: ProbabilityPoint[], key: "market" | "veto") => {
  const width = 620;
  const height = 190;
  const min = 0.45;
  const max = 0.9;

  return points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const value = point[key];
      const y = height - ((value - min) / (max - min)) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

export function ProbabilityChart({ points }: { points: ProbabilityPoint[] }) {
  const veto = pathFrom(points, "veto");
  const market = pathFrom(points, "market");

  return (
    <div className="probChart" aria-label="VETO and market probability history">
      <div className="probLegend">
        <span><i className="lineSwatch vetoLine" /> VETO probability</span>
        <span><i className="lineSwatch marketLine" /> Market implied</span>
      </div>
      <svg viewBox="0 0 620 210" role="img" preserveAspectRatio="none">
        <defs>
          <linearGradient id="vetoFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((row) => (
          <line key={row} x1="0" x2="620" y1={20 + row * 48} y2={20 + row * 48} className="chartGrid" />
        ))}
        <path d={`${veto} L620,210 L0,210 Z`} className="vetoArea" />
        <path d={market} className="marketPath" />
        <path d={veto} className="vetoPath" />
        {points.map((point, index) => {
          const x = (index / Math.max(1, points.length - 1)) * 620;
          return (
            <text key={point.label} x={x} y="207" textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} className="chartLabel">
              {point.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
