import {
  brierScore,
  calibrationBuckets,
  logLoss,
  expectedCalibrationError,
  maximumCalibrationError,
  type PredictionOutcome,
} from "@/lib/intelligence/calibration";
import type { BacktestRow } from "./types";

const settledBinaryRows = (rows: BacktestRow[]) =>
  rows.filter((row) => row.result === "win" || row.result === "loss");

const resultValue = (row: BacktestRow): 0 | 1 =>
  row.result === "win" ? 1 : 0;

const stakeOf = (row: BacktestRow, defaultStake = 1) =>
  row.stake != null && row.stake > 0 ? row.stake : defaultStake;

export const rowProfit = (row: BacktestRow, defaultStake = 1) => {
  const stake = stakeOf(row, defaultStake);
  if (row.result === "win") return stake * (row.entryOdds - 1);
  if (row.result === "half_win") return stake * 0.5 * (row.entryOdds - 1);
  if (row.result === "half_loss") return -stake * 0.5;
  if (row.result === "loss") return -stake;
  return 0;
};

export const oddsClv = (row: BacktestRow) =>
  row.closingOdds != null && row.closingOdds > 1
    ? row.entryOdds / row.closingOdds - 1
    : undefined;

export const probabilityClv = (row: BacktestRow) =>
  row.closingOdds != null && row.closingOdds > 1
    ? 1 / row.closingOdds - 1 / row.entryOdds
    : undefined;

const average = (values: number[]) =>
  values.length === 0
    ? undefined
    : values.reduce((sum, value) => sum + value, 0) / values.length;

export const equityCurve = (rows: BacktestRow[], defaultStake = 1) => {
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.predictionAt).getTime() - new Date(b.predictionAt).getTime(),
  );

  let cumulative = 0;
  return sorted.map((row) => {
    cumulative += rowProfit(row, defaultStake);
    return {
      rowId: row.id,
      at: row.predictionAt,
      profit: rowProfit(row, defaultStake),
      cumulative,
    };
  });
};

export const maxDrawdown = (rows: BacktestRow[], defaultStake = 1) => {
  const curve = equityCurve(rows, defaultStake);
  let peak = 0;
  let max = 0;

  for (const point of curve) {
    peak = Math.max(peak, point.cumulative);
    max = Math.max(max, peak - point.cumulative);
  }

  return max;
};

export const backtestMetrics = (
  rows: BacktestRow[],
  options?: { defaultStake?: number; calibrationBuckets?: number },
) => {
  const defaultStake = options?.defaultStake ?? 1;
  const binary = settledBinaryRows(rows);
  const predictionRows: PredictionOutcome[] = binary.map((row) => ({
    probability: row.fairProbability,
    outcome: resultValue(row),
  }));

  const entryBenchmark: PredictionOutcome[] = binary.map((row) => ({
    probability: Math.min(0.999999, 1 / row.entryOdds),
    outcome: resultValue(row),
  }));

  const closingBenchmark: PredictionOutcome[] = binary
    .filter((row) => row.closingOdds != null && row.closingOdds > 1)
    .map((row) => ({
      probability: Math.min(0.999999, 1 / row.closingOdds!),
      outcome: resultValue(row),
    }));

  const actionable = rows.filter((row) => row.decision === "EDGE");
  const staked = actionable.reduce(
    (sum, row) => sum + stakeOf(row, defaultStake),
    0,
  );
  const profit = actionable.reduce(
    (sum, row) => sum + rowProfit(row, defaultStake),
    0,
  );
  const wins = actionable.filter((row) => row.result === "win").length;
  const losses = actionable.filter((row) => row.result === "loss").length;
  const resolved = wins + losses;

  const oddsClvs = actionable.flatMap((row) => {
    const value = oddsClv(row);
    return value == null ? [] : [value];
  });
  const probabilityClvs = actionable.flatMap((row) => {
    const value = probabilityClv(row);
    return value == null ? [] : [value];
  });

  return {
    rows: rows.length,
    binaryRows: binary.length,
    actionableRows: actionable.length,
    wins,
    losses,
    halfWins: actionable.filter((row) => row.result === "half_win").length,
    pushes: actionable.filter((row) => row.result === "push").length,
    halfLosses: actionable.filter((row) => row.result === "half_loss").length,
    voids: actionable.filter((row) => row.result === "void").length,
    staked,
    profit,
    roi: staked > 0 ? profit / staked : 0,
    yield: staked > 0 ? profit / staked : 0,
    hitRate: resolved > 0 ? wins / resolved : 0,
    brier: brierScore(predictionRows),
    logLoss: logLoss(predictionRows),
    expectedCalibrationError: expectedCalibrationError(
      predictionRows,
      options?.calibrationBuckets ?? 10,
    ),
    maximumCalibrationError: maximumCalibrationError(
      predictionRows,
      options?.calibrationBuckets ?? 10,
    ),
    entryMarketBrier: brierScore(entryBenchmark),
    entryMarketLogLoss: logLoss(entryBenchmark),
    closingMarketBrier:
      closingBenchmark.length > 0 ? brierScore(closingBenchmark) : undefined,
    closingMarketLogLoss:
      closingBenchmark.length > 0 ? logLoss(closingBenchmark) : undefined,
    brierDeltaVsEntry:
      predictionRows.length > 0
        ? brierScore(entryBenchmark) - brierScore(predictionRows)
        : 0,
    brierDeltaVsClose:
      closingBenchmark.length > 0
        ? brierScore(closingBenchmark) -
          brierScore(
            binary
              .filter((row) => row.closingOdds != null && row.closingOdds > 1)
              .map((row) => ({
                probability: row.fairProbability,
                outcome: resultValue(row),
              })),
          )
        : undefined,
    meanClvOdds: average(oddsClvs),
    meanClvProbability: average(probabilityClvs),
    maxDrawdown: maxDrawdown(actionable, defaultStake),
    calibration: calibrationBuckets(
      predictionRows,
      options?.calibrationBuckets ?? 10,
    ),
    equityCurve: equityCurve(actionable, defaultStake),
  };
};
