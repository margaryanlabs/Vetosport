import type { ScorelineProbability } from "./types";

export type Settlement =
  | "win"
  | "half_win"
  | "push"
  | "half_loss"
  | "loss";

export interface AsianSettlementDistribution {
  win: number;
  halfWin: number;
  push: number;
  halfLoss: number;
  loss: number;
  fairOdds: number | null;
}

type ReturnTerms = { oddsCoefficient: number; fixedReturn: number };

const splitQuarterLine = (line: number) => {
  const scaled = line * 2;
  const isHalfStep = Math.abs(scaled - Math.round(scaled)) < 1e-9;

  if (isHalfStep) return [line];

  const lower = Math.floor(scaled) / 2;
  const upper = Math.ceil(scaled) / 2;
  return [lower, upper];
};

const settleSingle = (margin: number): ReturnTerms => {
  if (margin > 1e-9) return { oddsCoefficient: 1, fixedReturn: 0 };
  if (margin < -1e-9) return { oddsCoefficient: 0, fixedReturn: 0 };
  return { oddsCoefficient: 0, fixedReturn: 1 };
};

const classifyTerms = (terms: ReturnTerms): Settlement => {
  const a = Math.round(terms.oddsCoefficient * 2) / 2;
  const b = Math.round(terms.fixedReturn * 2) / 2;

  if (a === 1 && b === 0) return "win";
  if (a === 0.5 && b === 0.5) return "half_win";
  if (a === 0 && b === 1) return "push";
  if (a === 0 && b === 0.5) return "half_loss";
  return "loss";
};

const aggregateAsian = (
  scorelines: ScorelineProbability[],
  termsForLine: (scoreline: ScorelineProbability, splitLine: number) => ReturnTerms,
  line: number,
): AsianSettlementDistribution => {
  const splitLines = splitQuarterLine(line);
  const probabilities: Record<Settlement, number> = {
    win: 0,
    half_win: 0,
    push: 0,
    half_loss: 0,
    loss: 0,
  };

  let expectedOddsCoefficient = 0;
  let expectedFixedReturn = 0;

  for (const scoreline of scorelines) {
    const combined = splitLines.reduce<ReturnTerms>(
      (acc, splitLine) => {
        const terms = termsForLine(scoreline, splitLine);
        return {
          oddsCoefficient:
            acc.oddsCoefficient + terms.oddsCoefficient / splitLines.length,
          fixedReturn:
            acc.fixedReturn + terms.fixedReturn / splitLines.length,
        };
      },
      { oddsCoefficient: 0, fixedReturn: 0 },
    );

    probabilities[classifyTerms(combined)] += scoreline.probability;
    expectedOddsCoefficient +=
      scoreline.probability * combined.oddsCoefficient;
    expectedFixedReturn += scoreline.probability * combined.fixedReturn;
  }

  const fairOdds =
    expectedOddsCoefficient > 1e-12
      ? (1 - expectedFixedReturn) / expectedOddsCoefficient
      : null;

  return {
    win: probabilities.win,
    halfWin: probabilities.half_win,
    push: probabilities.push,
    halfLoss: probabilities.half_loss,
    loss: probabilities.loss,
    fairOdds:
      fairOdds != null && Number.isFinite(fairOdds) && fairOdds > 1
        ? fairOdds
        : null,
  };
};

export const priceAsianTotal = (
  scorelines: ScorelineProbability[],
  side: "over" | "under",
  line: number,
) =>
  aggregateAsian(
    scorelines,
    (scoreline, splitLine) => {
      const total = scoreline.homeGoals + scoreline.awayGoals;
      const margin = side === "over" ? total - splitLine : splitLine - total;
      return settleSingle(margin);
    },
    line,
  );

export const priceAsianHandicap = (
  scorelines: ScorelineProbability[],
  side: "home" | "away",
  handicap: number,
) =>
  aggregateAsian(
    scorelines,
    (scoreline, splitLine) => {
      const rawDifference =
        side === "home"
          ? scoreline.homeGoals - scoreline.awayGoals
          : scoreline.awayGoals - scoreline.homeGoals;
      return settleSingle(rawDifference + splitLine);
    },
    handicap,
  );

export const settlementProbabilityMass = (
  distribution: AsianSettlementDistribution,
) =>
  distribution.win +
  distribution.halfWin +
  distribution.push +
  distribution.halfLoss +
  distribution.loss;
