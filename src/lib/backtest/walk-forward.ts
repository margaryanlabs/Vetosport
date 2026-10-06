import type { BacktestRow } from "./types";
import { runBacktest } from "./runner";

export interface WalkForwardOptions {
  trainDays: number;
  testDays: number;
  stepDays?: number;
  minimumTrainRows?: number;
  minimumTestRows?: number;
}

const DAY = 86_400_000;

export const buildWalkForwardWindows = (
  rows: BacktestRow[],
  options: WalkForwardOptions,
) => {
  if (rows.length === 0) return [];

  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.predictionAt).getTime() - new Date(b.predictionAt).getTime(),
  );
  const first = new Date(sorted[0].predictionAt).getTime();
  const last = new Date(sorted[sorted.length - 1].predictionAt).getTime();
  const stepDays = options.stepDays ?? options.testDays;

  const windows = [];
  let trainStart = first;

  while (true) {
    const trainEnd = trainStart + options.trainDays * DAY;
    const testStart = trainEnd;
    const testEnd = testStart + options.testDays * DAY;

    if (testStart > last) break;

    const trainRows = sorted.filter((row) => {
      const at = new Date(row.predictionAt).getTime();
      return at >= trainStart && at < trainEnd;
    });
    const testRows = sorted.filter((row) => {
      const at = new Date(row.predictionAt).getTime();
      return at >= testStart && at < testEnd;
    });

    const minimumTrainRows = options.minimumTrainRows ?? 30;
    const minimumTestRows = options.minimumTestRows ?? 10;

    if (
      trainRows.length >= minimumTrainRows &&
      testRows.length >= minimumTestRows
    ) {
      windows.push({
        trainFrom: new Date(trainStart).toISOString(),
        trainTo: new Date(trainEnd).toISOString(),
        testFrom: new Date(testStart).toISOString(),
        testTo: new Date(testEnd).toISOString(),
        trainRows: trainRows.length,
        testRows: testRows.length,
        report: runBacktest(testRows),
      });
    }

    trainStart += stepDays * DAY;
  }

  return windows;
};

export const summarizeWalkForward = (
  rows: BacktestRow[],
  options: WalkForwardOptions,
) => {
  const windows = buildWalkForwardWindows(rows, options);

  if (windows.length === 0) {
    return {
      windows: [],
      summary: {
        count: 0,
        meanRoi: 0,
        meanBrier: 0,
        meanClvOdds: undefined,
        positiveRoiWindows: 0,
        positiveClvWindows: 0,
      },
    };
  }

  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const clv = windows.flatMap((window) => {
    const value = window.report.metrics.meanClvOdds;
    return value == null ? [] : [value];
  });

  return {
    windows,
    summary: {
      count: windows.length,
      meanRoi: mean(windows.map((window) => window.report.metrics.roi)),
      meanBrier: mean(windows.map((window) => window.report.metrics.brier)),
      meanClvOdds: clv.length > 0 ? mean(clv) : undefined,
      positiveRoiWindows: windows.filter(
        (window) => window.report.metrics.roi > 0,
      ).length,
      positiveClvWindows: windows.filter(
        (window) => (window.report.metrics.meanClvOdds ?? 0) > 0,
      ).length,
    },
  };
};
