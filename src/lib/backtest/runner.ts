import type {
  BacktestRow,
  BacktestRunOptions,
} from "./types";
import { detectBacktestLeakage } from "./leakage";
import { filterBacktestRows } from "./filters";
import { backtestMetrics } from "./metrics";
import { backtestSegments } from "./segments";

export const runBacktest = (
  inputRows: BacktestRow[],
  options: BacktestRunOptions = {},
) => {
  const leakage = detectBacktestLeakage(inputRows);
  const errorRowIds = new Set(
    leakage.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.rowId),
  );

  const cleanRows = inputRows.filter((row) => !errorRowIds.has(row.id));
  const filtered = filterBacktestRows(cleanRows, options.filters);
  const selected = options.includeWatch
    ? filtered.filter((row) => row.decision === "EDGE" || row.decision === "WATCH")
    : filtered;

  return {
    generatedAt: new Date().toISOString(),
    inputRows: inputRows.length,
    excludedForLeakage: errorRowIds.size,
    leakage,
    rows: selected.length,
    metrics: backtestMetrics(selected, {
      defaultStake: options.defaultStake,
      calibrationBuckets: options.calibrationBuckets,
    }),
    segments: backtestSegments(selected),
  };
};
