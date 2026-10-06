import type {
  ContractState,
  MarketContractSpec,
} from "@/lib/contracts/types";
import {
  compareContractSemantics,
  compileContract,
  settleContract,
} from "@/lib/contracts/compiler";

export const sandboxContractState: ContractState = {
  regulationHomeScore: 1,
  regulationAwayScore: 1,
  finalHomeScore: 2,
  finalAwayScore: 1,
  completedSeconds: 60 * 60 + 5 * 60,
  abandoned: false,
};

export const sandboxContracts: MarketContractSpec[] = [
  {
    id: "football-u225-reg",
    sport: "football",
    family: "TOTAL",
    side: "UNDER",
    period: "REGULATION",
    overtimeIncluded: false,
    line: 2.25,
    voidOnAbandonment: true,
    minimumCompletedSeconds: 80 * 60,
  },
  {
    id: "football-o225-reg",
    sport: "football",
    family: "TOTAL",
    side: "OVER",
    period: "REGULATION",
    overtimeIncluded: false,
    line: 2.25,
    voidOnAbandonment: true,
    minimumCompletedSeconds: 80 * 60,
  },
  {
    id: "hockey-u55-reg",
    sport: "hockey",
    family: "TOTAL",
    side: "UNDER",
    period: "REGULATION",
    overtimeIncluded: false,
    line: 5.5,
    voidOnAbandonment: true,
    minimumCompletedSeconds: 55 * 60,
  },
  {
    id: "hockey-u55-full",
    sport: "hockey",
    family: "TOTAL",
    side: "UNDER",
    period: "FULL_GAME",
    overtimeIncluded: true,
    line: 5.5,
    voidOnAbandonment: true,
    minimumCompletedSeconds: 55 * 60,
  },
  {
    id: "football-home-plus025",
    sport: "football",
    family: "HANDICAP",
    side: "HOME",
    period: "REGULATION",
    overtimeIncluded: false,
    line: 0.25,
    voidOnAbandonment: true,
    minimumCompletedSeconds: 80 * 60,
  },
];

export const sandboxCompiledContracts = sandboxContracts.map(
  compileContract,
);

export const sandboxSettlementExamples = {
  under225: settleContract(
    sandboxContracts[0],
    sandboxContractState,
  ),
  over225: settleContract(
    sandboxContracts[1],
    sandboxContractState,
  ),
  homePlus025: settleContract(
    sandboxContracts[4],
    sandboxContractState,
  ),
};

export const sandboxSemanticComparison =
  compareContractSemantics(
    sandboxContracts[2],
    sandboxContracts[3],
  );
