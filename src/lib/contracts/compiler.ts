import type {
  CompiledContract,
  ContractCompatibility,
  ContractState,
  MarketContractSpec,
  SettlementResult,
} from "@/lib/contracts/types";

const roundLine = (value: number) =>
  Math.round(value * 4) / 4;

const quarterLegs = (line: number) => {
  const rounded = roundLine(line);
  const quarter = Math.round((rounded % 1) * 4) / 4;

  if (quarter === 0.25) {
    return [
      { line: Math.floor(rounded), weight: 0.5 },
      { line: Math.floor(rounded) + 0.5, weight: 0.5 },
    ];
  }

  if (quarter === 0.75) {
    return [
      { line: Math.floor(rounded) + 0.5, weight: 0.5 },
      { line: Math.floor(rounded) + 1, weight: 0.5 },
    ];
  }

  return [{ line: rounded, weight: 1 }];
};

export const compileContract = (
  spec: MarketContractSpec,
): CompiledContract => {
  const warnings: string[] = [];

  if (
    ["TOTAL", "TEAM_TOTAL", "HANDICAP"].includes(spec.family) &&
    typeof spec.line !== "number"
  ) {
    warnings.push("Line-based market requires a numeric line.");
  }

  if (
    spec.family === "THREE_WAY" &&
    spec.overtimeIncluded
  ) {
    warnings.push(
      "Three-way market with overtime included requires provider-specific draw semantics.",
    );
  }

  if (
    spec.period === "REGULATION" &&
    spec.overtimeIncluded
  ) {
    warnings.push(
      "Regulation period cannot include overtime; semantics conflict.",
    );
  }

  const settlementLegs =
    typeof spec.line === "number"
      ? quarterLegs(spec.line)
      : [{ weight: 1 }];

  const semanticKey = [
    spec.sport,
    spec.family,
    spec.side,
    spec.period,
    spec.overtimeIncluded ? "OT" : "NO_OT",
    spec.team ?? "NA",
    typeof spec.line === "number"
      ? roundLine(spec.line).toFixed(2)
      : "NA",
    spec.voidOnAbandonment ? "VOID_ABANDON" : "SETTLE_ABANDON",
    spec.minimumCompletedSeconds ?? 0,
  ].join("|");

  return {
    spec,
    semanticKey,
    settlementLegs,
    warnings,
  };
};

const scoresFor = (
  spec: MarketContractSpec,
  state: ContractState,
) =>
  spec.period === "REGULATION" || !spec.overtimeIncluded
    ? {
        home: state.regulationHomeScore,
        away: state.regulationAwayScore,
      }
    : {
        home: state.finalHomeScore,
        away: state.finalAwayScore,
      };

const settleBinaryLine = (
  value: number,
  line: number,
  side: "OVER" | "UNDER",
): "WIN" | "PUSH" | "LOSS" => {
  if (Math.abs(value - line) < 1e-9) return "PUSH";
  if (side === "OVER") return value > line ? "WIN" : "LOSS";
  return value < line ? "WIN" : "LOSS";
};

const settleHandicapLine = (
  home: number,
  away: number,
  line: number,
  side: "HOME" | "AWAY",
): "WIN" | "PUSH" | "LOSS" => {
  const adjusted =
    side === "HOME"
      ? home + line - away
      : away + line - home;
  if (Math.abs(adjusted) < 1e-9) return "PUSH";
  return adjusted > 0 ? "WIN" : "LOSS";
};

const combineLegs = (
  legs: Array<"WIN" | "PUSH" | "LOSS">,
): SettlementResult => {
  if (legs.length === 1) return legs[0];

  const wins = legs.filter((leg) => leg === "WIN").length;
  const pushes = legs.filter((leg) => leg === "PUSH").length;
  const losses = legs.filter((leg) => leg === "LOSS").length;

  if (wins === legs.length) return "WIN";
  if (losses === legs.length) return "LOSS";
  if (pushes === legs.length) return "PUSH";
  if (wins > 0 && pushes > 0 && losses === 0)
    return "HALF_WIN";
  if (losses > 0 && pushes > 0 && wins === 0)
    return "HALF_LOSS";

  // A theoretical mixed WIN/LOSS split is economically neutral at even
  // settlement weight, but provider rules can differ. Treat as PUSH.
  return "PUSH";
};

export const settleContract = (
  spec: MarketContractSpec,
  state: ContractState,
): SettlementResult => {
  if (
    state.abandoned &&
    spec.voidOnAbandonment &&
    state.completedSeconds <
      (spec.minimumCompletedSeconds ?? Number.POSITIVE_INFINITY)
  ) {
    return "VOID";
  }

  const { home, away } = scoresFor(spec, state);

  if (spec.family === "THREE_WAY") {
    if (spec.side === "HOME")
      return home > away ? "WIN" : "LOSS";
    if (spec.side === "AWAY")
      return away > home ? "WIN" : "LOSS";
    return home === away ? "WIN" : "LOSS";
  }

  if (spec.family === "MONEYLINE") {
    if (home === away) return "PUSH";
    if (spec.side === "HOME")
      return home > away ? "WIN" : "LOSS";
    return away > home ? "WIN" : "LOSS";
  }

  const compiled = compileContract(spec);
  const lineLegs = compiled.settlementLegs;

  if (spec.family === "TOTAL") {
    const total = home + away;
    const side = spec.side === "OVER" ? "OVER" : "UNDER";
    return combineLegs(
      lineLegs.map((leg) =>
        settleBinaryLine(total, leg.line ?? 0, side),
      ),
    );
  }

  if (spec.family === "TEAM_TOTAL") {
    const teamScore =
      spec.team === "AWAY" ? away : home;
    const side = spec.side === "OVER" ? "OVER" : "UNDER";
    return combineLegs(
      lineLegs.map((leg) =>
        settleBinaryLine(teamScore, leg.line ?? 0, side),
      ),
    );
  }

  if (spec.family === "HANDICAP") {
    const side = spec.side === "AWAY" ? "AWAY" : "HOME";
    return combineLegs(
      lineLegs.map((leg) =>
        settleHandicapLine(
          home,
          away,
          leg.line ?? 0,
          side,
        ),
      ),
    );
  }

  return "VOID";
};

export const compareContractSemantics = (
  a: MarketContractSpec,
  b: MarketContractSpec,
): ContractCompatibility => {
  const reasons: string[] = [];
  let differences = 0;
  let dimensions = 0;

  const compare = (
    label: string,
    left: unknown,
    right: unknown,
    critical = true,
  ) => {
    dimensions += 1;
    if (left === right) return;
    differences += 1;
    if (critical)
      reasons.push(`${label} differs: ${String(left)} vs ${String(right)}.`);
  };

  compare("sport", a.sport, b.sport);
  compare("family", a.family, b.family);
  compare("side", a.side, b.side);
  compare("period", a.period, b.period);
  compare("overtime", a.overtimeIncluded, b.overtimeIncluded);
  compare("line", a.line ?? null, b.line ?? null);
  compare("team", a.team ?? null, b.team ?? null);
  compare(
    "abandonment rule",
    a.voidOnAbandonment,
    b.voidOnAbandonment,
  );
  compare(
    "minimum completed seconds",
    a.minimumCompletedSeconds ?? 0,
    b.minimumCompletedSeconds ?? 0,
  );

  return {
    comparable: reasons.length === 0,
    reasons,
    semanticDistance:
      dimensions === 0 ? 0 : differences / dimensions,
  };
};
