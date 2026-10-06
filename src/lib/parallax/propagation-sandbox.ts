import type { MarketFamilyTrace } from "@/lib/parallax/propagation-types";
import { analyzeCrossMarketPropagation } from "@/lib/parallax/propagation";

export const sandboxPropagationTraces: MarketFamilyTrace[] = [
  {
    familyId: "total-u35",
    label: "TOTAL · U3.5",
    baselineProbability: 0.699,
    targetProbability: 0.758,
    quotes: [
      { tMs: 0, probability: 0.699, executable: true },
      { tMs: 900, probability: 0.708, executable: true },
      { tMs: 1900, probability: 0.722, executable: true },
      { tMs: 3400, probability: 0.74, executable: true },
      { tMs: 6200, probability: 0.752, executable: true },
      { tMs: 11000, probability: 0.757, executable: true },
    ],
  },
  {
    familyId: "total-u45",
    label: "TOTAL · U4.5",
    baselineProbability: 0.86,
    targetProbability: 0.902,
    quotes: [
      { tMs: 0, probability: 0.86, executable: true },
      { tMs: 1200, probability: 0.864, executable: true },
      { tMs: 2600, probability: 0.875, executable: true },
      { tMs: 4300, probability: 0.886, executable: true },
      { tMs: 7200, probability: 0.897, executable: true },
      { tMs: 11800, probability: 0.901, executable: true },
    ],
  },
  {
    familyId: "draw",
    label: "1X2 · DRAW",
    baselineProbability: 0.47,
    targetProbability: 0.505,
    quotes: [
      { tMs: 0, probability: 0.47, executable: true },
      { tMs: 1800, probability: 0.472, executable: true },
      { tMs: 3500, probability: 0.478, executable: true },
      { tMs: 5600, probability: 0.488, executable: true },
      { tMs: 9000, probability: 0.498, executable: true },
      { tMs: 13500, probability: 0.503, executable: true },
    ],
  },
  {
    familyId: "home-tt-u15",
    label: "HOME TT · U1.5",
    baselineProbability: 0.55,
    targetProbability: 0.63,
    quotes: [
      { tMs: 0, probability: 0.55, executable: true },
      { tMs: 2600, probability: 0.55, executable: true },
      { tMs: 4900, probability: 0.557, executable: true },
      { tMs: 7600, probability: 0.57, executable: true },
      { tMs: 11100, probability: 0.586, executable: true },
      { tMs: 15800, probability: 0.602, executable: true },
    ],
  },
  {
    familyId: "away-tt-u15",
    label: "AWAY TT · U1.5",
    baselineProbability: 0.6,
    targetProbability: 0.685,
    quotes: [
      { tMs: 0, probability: 0.6, executable: true },
      { tMs: 3000, probability: 0.6, executable: true },
      { tMs: 5700, probability: 0.605, executable: true },
      { tMs: 8700, probability: 0.617, executable: true },
      { tMs: 12400, probability: 0.632, executable: true },
      { tMs: 17000, probability: 0.646, executable: true },
    ],
  },
];

export const sandboxPropagationAnalysis =
  analyzeCrossMarketPropagation(sandboxPropagationTraces);
