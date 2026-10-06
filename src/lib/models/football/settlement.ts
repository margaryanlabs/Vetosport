import type { MarketSelection } from "@/lib/domain/types";
import type { BacktestResult } from "@/lib/backtest/types";

const splitQuarterLine = (line: number) => {
  const doubled = line * 2;
  if (Math.abs(doubled - Math.round(doubled)) < 1e-9) return [line];
  return [Math.floor(doubled) / 2, Math.ceil(doubled) / 2];
};

const single = (margin: number): "win" | "push" | "loss" => {
  if (margin > 1e-9) return "win";
  if (margin < -1e-9) return "loss";
  return "push";
};

const combineSplit = (
  outcomes: Array<"win" | "push" | "loss">,
): BacktestResult => {
  if (outcomes.length === 1) return outcomes[0];

  const sorted = [...outcomes].sort();
  if (sorted.every((outcome) => outcome === "win")) return "win";
  if (sorted.every((outcome) => outcome === "loss")) return "loss";
  if (sorted.every((outcome) => outcome === "push")) return "push";
  if (sorted.includes("win") && sorted.includes("push")) return "half_win";
  if (sorted.includes("loss") && sorted.includes("push")) return "half_loss";

  // Defensive fallback for unusual split lines that straddle both win/loss.
  if (sorted.includes("win") && sorted.includes("loss")) return "push";
  return "void";
};

const settleLine = (
  value: number,
  line: number,
  side: "over" | "under",
): BacktestResult =>
  combineSplit(
    splitQuarterLine(line).map((part) =>
      single(side === "over" ? value - part : part - value),
    ),
  );

const settleHandicap = (
  goalDifference: number,
  handicap: number,
): BacktestResult =>
  combineSplit(
    splitQuarterLine(handicap).map((part) =>
      single(goalDifference + part),
    ),
  );

export interface FootballSettlementInput {
  marketId: string;
  selectionId: string;
  selectionLine?: number;
  selectionSide?: MarketSelection["side"];
  finalScore: { home: number; away: number };
}

export const settleFootballDecision = (
  input: FootballSettlementInput,
): BacktestResult => {
  const { home, away } = input.finalScore;
  const side = input.selectionSide;
  const line = input.selectionLine;

  if (input.marketId === "football.1x2") {
    const outcome = home > away ? "home" : home < away ? "away" : "draw";
    return side === outcome || input.selectionId === outcome ? "win" : "loss";
  }

  if (input.marketId === "football.btts") {
    const yes = home > 0 && away > 0;
    const wantsYes = side === "yes" || input.selectionId === "yes";
    return yes === wantsYes ? "win" : "loss";
  }

  if (input.marketId === "football.total_goals") {
    if (line == null || (side !== "over" && side !== "under")) return "void";
    return settleLine(home + away, line, side);
  }

  if (input.marketId === "football.team_total") {
    if (line == null || (side !== "over" && side !== "under")) return "void";

    const team =
      input.selectionId.startsWith("home")
        ? home
        : input.selectionId.startsWith("away")
          ? away
          : null;

    return team == null ? "void" : settleLine(team, line, side);
  }

  if (
    input.marketId === "football.handicap" ||
    input.marketId === "football.asian_handicap"
  ) {
    if (line == null || (side !== "home" && side !== "away")) return "void";
    const difference = side === "home" ? home - away : away - home;
    return settleHandicap(difference, line);
  }

  return "void";
};
