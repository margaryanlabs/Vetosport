import type { BacktestRow } from "./types";

export interface LeakageIssue {
  rowId: string;
  severity: "error" | "warning";
  code:
    | "INVALID_TIMESTAMPS"
    | "POST_SETTLEMENT_PREDICTION"
    | "PREMATCH_AFTER_START"
    | "CLOSING_PRICE_INVALID"
    | "PROBABILITY_INVALID"
    | "ENTRY_ODDS_INVALID";
  message: string;
}

export const detectBacktestLeakage = (rows: BacktestRow[]) => {
  const issues: LeakageIssue[] = [];

  for (const row of rows) {
    const prediction = new Date(row.predictionAt).getTime();
    const start = new Date(row.eventStartsAt).getTime();
    const settled = new Date(row.settledAt).getTime();

    if (![prediction, start, settled].every(Number.isFinite)) {
      issues.push({
        rowId: row.id,
        severity: "error",
        code: "INVALID_TIMESTAMPS",
        message: "Prediction/event/settlement timestamps must be valid ISO dates.",
      });
      continue;
    }

    if (prediction >= settled) {
      issues.push({
        rowId: row.id,
        severity: "error",
        code: "POST_SETTLEMENT_PREDICTION",
        message: "Prediction timestamp is at or after settlement.",
      });
    }

    if (row.liveMinute == null && prediction > start) {
      issues.push({
        rowId: row.id,
        severity: "error",
        code: "PREMATCH_AFTER_START",
        message: "Prematch prediction was recorded after event start.",
      });
    }

    if (!(row.fairProbability > 0 && row.fairProbability < 1)) {
      issues.push({
        rowId: row.id,
        severity: "error",
        code: "PROBABILITY_INVALID",
        message: "fairProbability must be between 0 and 1.",
      });
    }

    if (!(row.entryOdds > 1)) {
      issues.push({
        rowId: row.id,
        severity: "error",
        code: "ENTRY_ODDS_INVALID",
        message: "entryOdds must be greater than 1.",
      });
    }

    if (row.closingOdds != null && !(row.closingOdds > 1)) {
      issues.push({
        rowId: row.id,
        severity: "warning",
        code: "CLOSING_PRICE_INVALID",
        message: "closingOdds is invalid and will be excluded from CLV metrics.",
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
};
