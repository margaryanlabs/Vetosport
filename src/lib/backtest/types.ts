import type { DecisionMode } from "@/lib/intelligence/policy";

export type BacktestResult = "win" | "half_win" | "push" | "half_loss" | "loss" | "void";

export interface BacktestRow {
  id: string;
  eventId: string;
  sport: string;
  competition: string;
  marketId: string;
  selectionId: string;

  predictionAt: string;
  eventStartsAt: string;
  settledAt: string;

  modelVersion: string;
  decisionMode: DecisionMode;
  decision: "EDGE" | "WATCH" | "PASS";

  fairProbability: number;
  entryOdds: number;
  closingOdds?: number;
  stake?: number;
  result: BacktestResult;

  liveMinute?: number;
  tags?: string[];
}

export interface BacktestFilters {
  sports?: string[];
  competitions?: string[];
  marketIds?: string[];
  decisionModes?: DecisionMode[];
  decisions?: Array<BacktestRow["decision"]>;
  modelVersions?: string[];
  minOdds?: number;
  maxOdds?: number;
  from?: string;
  to?: string;
}

export interface BacktestRunOptions {
  filters?: BacktestFilters;
  includeWatch?: boolean;
  defaultStake?: number;
  calibrationBuckets?: number;
}

export interface BacktestSegment {
  key: string;
  label: string;
  rows: number;
  staked: number;
  profit: number;
  roi: number;
  yield: number;
  hitRate: number;
  brier: number;
  logLoss: number;
  meanClvOdds?: number;
  meanClvProbability?: number;
  maxDrawdown: number;
}
