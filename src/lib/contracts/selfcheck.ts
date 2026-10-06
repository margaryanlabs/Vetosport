import {
  compareContractSemantics,
  compileContract,
  settleContract,
} from "@/lib/contracts/compiler";
import {
  sandboxContractState,
  sandboxContracts,
  sandboxSemanticComparison,
  sandboxSettlementExamples,
} from "@/lib/contracts/sandbox";
import type { MarketContractSpec } from "@/lib/contracts/types";

export const runContractSemanticsSelfCheck = () => {
  const sameA: MarketContractSpec = {
    ...sandboxContracts[2],
    id: "same-a",
  };
  const sameB: MarketContractSpec = {
    ...sandboxContracts[2],
    id: "same-b",
  };

  const abandonedState = {
    ...sandboxContractState,
    completedSeconds: 40 * 60,
    abandoned: true,
  };

  const invalidSpec: MarketContractSpec = {
    id: "bad-reg-ot",
    sport: "hockey",
    family: "TOTAL",
    side: "UNDER",
    period: "REGULATION",
    overtimeIncluded: true,
    line: 5.5,
    voidOnAbandonment: true,
  };

  const checks = [
    {
      name: "under 2.25 settles half-win at total two",
      passed: sandboxSettlementExamples.under225 === "HALF_WIN",
    },
    {
      name: "over 2.25 settles half-loss at total two",
      passed: sandboxSettlementExamples.over225 === "HALF_LOSS",
    },
    {
      name: "home plus 0.25 settles half-win on draw",
      passed:
        sandboxSettlementExamples.homePlus025 === "HALF_WIN",
    },
    {
      name: "regulation and overtime contracts are incompatible",
      passed:
        !sandboxSemanticComparison.comparable &&
        sandboxSemanticComparison.reasons.some(
          (reason) =>
            reason.includes("period") ||
            reason.includes("overtime"),
        ),
    },
    {
      name: "identical semantics are comparable",
      passed: compareContractSemantics(sameA, sameB).comparable,
    },
    {
      name: "abandoned market voids under registered rule",
      passed:
        settleContract(sandboxContracts[0], abandonedState) ===
        "VOID",
    },
    {
      name: "conflicting regulation overtime semantics warn",
      passed: compileContract(invalidSpec).warnings.length > 0,
    },
    {
      name: "quarter line compiles into two equal legs",
      passed: (() => {
        const legs = compileContract(sandboxContracts[0]).settlementLegs;
        return (
          legs.length === 2 &&
          legs.every((leg) => leg.weight === 0.5) &&
          legs[0].line === 2 &&
          legs[1].line === 2.5
        );
      })(),
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: {
      settlements: sandboxSettlementExamples,
      incompatible: sandboxSemanticComparison,
      compiled: sandboxContracts.map(compileContract),
    },
  };
};
