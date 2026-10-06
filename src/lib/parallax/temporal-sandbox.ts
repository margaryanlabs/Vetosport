import type {
  BookmakerResponseSeries,
  MarketShock,
} from "@/lib/parallax/temporal-types";
import { analyzeTemporalMarketResponse } from "@/lib/parallax/temporal";

export const sandboxTemporalShock: MarketShock = {
  id: "ars-liv-u35-shock",
  label: "Under 3.5 repricing shock",
  t0Ms: 0,
  baselineProbability: 0.699,
  targetProbability: 0.758,
};

export const sandboxBookmakerSeries: BookmakerResponseSeries[] = [
  {
    bookId: "mm-a",
    label: "MM-A",
    marketFamily: "TOTAL / U3.5",
    quotes: [
      { tMs: 0, probability: 0.699, executable: true },
      { tMs: 800, probability: 0.707, executable: true },
      { tMs: 1700, probability: 0.719, executable: true },
      { tMs: 2900, probability: 0.733, executable: true },
      { tMs: 4700, probability: 0.747, executable: true },
      { tMs: 8100, probability: 0.755, executable: true },
    ],
  },
  {
    bookId: "book-b",
    label: "BOOK-B",
    marketFamily: "TOTAL / U3.5",
    quotes: [
      { tMs: 0, probability: 0.699, executable: true },
      { tMs: 1500, probability: 0.701, executable: true },
      { tMs: 2700, probability: 0.711, executable: true },
      { tMs: 4300, probability: 0.724, executable: true },
      { tMs: 6700, probability: 0.741, executable: true },
      { tMs: 10800, probability: 0.753, executable: true },
    ],
  },
  {
    bookId: "book-c",
    label: "BOOK-C",
    marketFamily: "TOTAL / U3.5",
    quotes: [
      { tMs: 0, probability: 0.699, executable: true },
      { tMs: 2500, probability: 0.699, executable: true },
      { tMs: 4200, probability: 0.705, executable: true },
      { tMs: 6500, probability: 0.716, executable: true },
      { tMs: 9300, probability: 0.734, executable: true },
      { tMs: 14200, probability: 0.75, executable: true },
    ],
  },
  {
    bookId: "book-d",
    label: "BOOK-D",
    marketFamily: "TOTAL / U3.5",
    quotes: [
      { tMs: 0, probability: 0.699, executable: true },
      { tMs: 3300, probability: 0.699, executable: false, suspended: true },
      { tMs: 5700, probability: 0.702, executable: false },
      { tMs: 8900, probability: 0.711, executable: true },
      { tMs: 12800, probability: 0.728, executable: true },
      { tMs: 17800, probability: 0.746, executable: true },
    ],
  },
];

export const sandboxTemporalAnalysis = analyzeTemporalMarketResponse(
  sandboxTemporalShock,
  sandboxBookmakerSeries,
);
