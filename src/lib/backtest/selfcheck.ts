import {
  sandboxBacktestReport,
  sandboxBacktestRows,
  sandboxWalkForward,
} from "@/lib/sandbox/backtest";

export const runBacktestSelfCheck = () => {
  const checks = [
    {
      name: "synthetic dataset has rows",
      passed: sandboxBacktestRows.length >= 100,
      value: sandboxBacktestRows.length,
    },
    {
      name: "no leakage errors",
      passed: sandboxBacktestReport.leakage.valid,
      value: sandboxBacktestReport.leakage.issues.length,
    },
    {
      name: "Brier score is finite",
      passed: Number.isFinite(sandboxBacktestReport.metrics.brier),
      value: sandboxBacktestReport.metrics.brier,
    },
    {
      name: "log loss is finite",
      passed: Number.isFinite(sandboxBacktestReport.metrics.logLoss),
      value: sandboxBacktestReport.metrics.logLoss,
    },
    {
      name: "calibration error is finite",
      passed: Number.isFinite(
        sandboxBacktestReport.metrics.expectedCalibrationError,
      ),
      value: sandboxBacktestReport.metrics.expectedCalibrationError,
    },
    {
      name: "walk-forward produced windows",
      passed: sandboxWalkForward.summary.count > 0,
      value: sandboxWalkForward.summary.count,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
};
