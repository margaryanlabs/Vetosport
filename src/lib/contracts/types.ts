export type ContractPeriod =
  | "REGULATION"
  | "FULL_GAME";

export type ContractFamily =
  | "THREE_WAY"
  | "MONEYLINE"
  | "TOTAL"
  | "TEAM_TOTAL"
  | "HANDICAP";

export type ContractSide =
  | "HOME"
  | "DRAW"
  | "AWAY"
  | "OVER"
  | "UNDER";

export type SettlementResult =
  | "WIN"
  | "HALF_WIN"
  | "PUSH"
  | "HALF_LOSS"
  | "LOSS"
  | "VOID";

export interface MarketContractSpec {
  id: string;
  sport: string;
  family: ContractFamily;
  side: ContractSide;
  period: ContractPeriod;
  overtimeIncluded: boolean;
  line?: number;
  team?: "HOME" | "AWAY";
  voidOnAbandonment: boolean;
  minimumCompletedSeconds?: number;
}

export interface ContractState {
  regulationHomeScore: number;
  regulationAwayScore: number;
  finalHomeScore: number;
  finalAwayScore: number;
  completedSeconds: number;
  abandoned?: boolean;
}

export interface CompiledContract {
  spec: MarketContractSpec;
  semanticKey: string;
  settlementLegs: Array<{
    line?: number;
    weight: number;
  }>;
  warnings: string[];
}

export interface ContractCompatibility {
  comparable: boolean;
  reasons: string[];
  semanticDistance: number;
}
