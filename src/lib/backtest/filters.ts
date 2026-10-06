import type { BacktestFilters, BacktestRow } from "./types";

const inDateRange = (row: BacktestRow, filters: BacktestFilters) => {
  const at = new Date(row.predictionAt).getTime();

  if (filters.from && at < new Date(filters.from).getTime()) return false;
  if (filters.to && at > new Date(filters.to).getTime()) return false;
  return true;
};

export const filterBacktestRows = (
  rows: BacktestRow[],
  filters?: BacktestFilters,
) => {
  if (!filters) return rows;

  return rows.filter((row) => {
    if (filters.sports && !filters.sports.includes(row.sport)) return false;
    if (
      filters.competitions &&
      !filters.competitions.includes(row.competition)
    ) return false;
    if (filters.marketIds && !filters.marketIds.includes(row.marketId)) return false;
    if (
      filters.decisionModes &&
      !filters.decisionModes.includes(row.decisionMode)
    ) return false;
    if (filters.decisions && !filters.decisions.includes(row.decision)) return false;
    if (
      filters.modelVersions &&
      !filters.modelVersions.includes(row.modelVersion)
    ) return false;
    if (filters.minOdds != null && row.entryOdds < filters.minOdds) return false;
    if (filters.maxOdds != null && row.entryOdds > filters.maxOdds) return false;
    if (!inDateRange(row, filters)) return false;

    return true;
  });
};
