import type { BacktestRow, BacktestSegment } from "./types";
import { backtestMetrics } from "./metrics";

const segment = (
  key: string,
  label: string,
  rows: BacktestRow[],
): BacktestSegment => {
  const metrics = backtestMetrics(rows);
  return {
    key,
    label,
    rows: metrics.rows,
    staked: metrics.staked,
    profit: metrics.profit,
    roi: metrics.roi,
    yield: metrics.yield,
    hitRate: metrics.hitRate,
    brier: metrics.brier,
    logLoss: metrics.logLoss,
    meanClvOdds: metrics.meanClvOdds,
    meanClvProbability: metrics.meanClvProbability,
    maxDrawdown: metrics.maxDrawdown,
  };
};

const groupBy = (
  rows: BacktestRow[],
  keyFn: (row: BacktestRow) => string,
) => {
  const map = new Map<string, BacktestRow[]>();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return map;
};

export const backtestSegments = (rows: BacktestRow[]) => {
  const byMarket = [...groupBy(rows, (row) => row.marketId).entries()]
    .map(([key, grouped]) => segment(`market:${key}`, key, grouped))
    .sort((a, b) => b.rows - a.rows);

  const byCompetition = [
    ...groupBy(rows, (row) => row.competition).entries(),
  ]
    .map(([key, grouped]) => segment(`competition:${key}`, key, grouped))
    .sort((a, b) => b.rows - a.rows);

  const byOddsBand = [
    {
      key: "1.01-1.49",
      rows: rows.filter((row) => row.entryOdds < 1.5),
    },
    {
      key: "1.50-1.99",
      rows: rows.filter((row) => row.entryOdds >= 1.5 && row.entryOdds < 2),
    },
    {
      key: "2.00-2.99",
      rows: rows.filter((row) => row.entryOdds >= 2 && row.entryOdds < 3),
    },
    {
      key: "3.00+",
      rows: rows.filter((row) => row.entryOdds >= 3),
    },
  ]
    .filter((group) => group.rows.length > 0)
    .map((group) =>
      segment(`odds:${group.key}`, `Odds ${group.key}`, group.rows),
    );

  return { byMarket, byCompetition, byOddsBand };
};
