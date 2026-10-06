export type Locale = "ru" | "en" | "hy";

export type Sport =
  | "football"
  | "basketball"
  | "tennis"
  | "hockey"
  | "baseball"
  | "mma"
  | "esports";

export type EventStatus = "scheduled" | "live" | "finished" | "suspended";

export type Decision = "EDGE" | "WATCH" | "PASS";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH";

export type DataConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface TeamRef {
  id: string;
  name: string;
  shortName?: string;
}

export interface ParticipantRef {
  id: string;
  name: string;
  teamId?: string;
}

export interface SportEvent {
  id: string;
  sport: Sport;
  competition: string;
  startsAt: string;
  status: EventStatus;
  home?: TeamRef;
  away?: TeamRef;
  participants?: ParticipantRef[];
  clock?: {
    period?: string;
    elapsedSeconds?: number;
    remainingSeconds?: number;
  };
  score?: {
    home: number;
    away: number;
  };
}

export interface MarketSelection {
  id: string;
  label: string;
  line?: number;
  participantId?: string;
  side?: "home" | "away" | "yes" | "no" | "over" | "under" | "draw";
}

export interface MarketQuote {
  eventId: string;
  marketId: string;
  selection: MarketSelection;
  bookmaker: string;
  decimalOdds: number;
  capturedAt: string;
  sourceProvider?: string;
  providerLastUpdate?: string;
  suspended?: boolean;
  liquidity?: number;
  raw?: Record<string, unknown>;
}

export interface MarketDefinition {
  id: string;
  sport: Sport;
  family:
    | "moneyline"
    | "spread"
    | "total"
    | "team_total"
    | "player_prop"
    | "period"
    | "corners"
    | "cards"
    | "shots"
    | "special";
  label: string;
  live: boolean;
}

export interface ModelSignal {
  modelId: string;
  version: string;
  probability: number;
  weight: number;
  confidence: number;
  generatedAt: string;
  evidenceIds?: string[];
}

export interface Evidence {
  id: string;
  kind:
    | "stat"
    | "lineup"
    | "injury"
    | "news"
    | "weather"
    | "market"
    | "tracking"
    | "historical";
  title: string;
  value?: string | number;
  source: string;
  capturedAt: string;
  reliability: number;
}

export interface ProbabilityEstimate {
  probability: number;
  fairOdds: number;
  modelAgreement: number;
  uncertainty: number;
  generatedAt: string;
  modelSignals: ModelSignal[];
}

export interface Opportunity {
  eventId: string;
  marketId: string;
  selection: MarketSelection;
  decision: Decision;
  marketOdds: number;
  marketImpliedProbability: number;
  fairProbability: number;
  fairOdds: number;
  expectedValue: number;
  probabilityEdge: number;
  opportunityScore: number;
  risk: RiskBand;
  dataConfidence: DataConfidence;
  modelAgreement: number;
  freshnessSeconds: number;
  rationale: string[];
}

export interface DecisionLedgerEntry {
  id: string;
  eventId: string;
  marketId: string;
  selectionId: string;
  selectionLine?: number;
  selectionSide?: MarketSelection["side"];
  capturedAt: string;
  decision: Decision;
  modelVersionSet: string[];
  featureSnapshotId: string;
  marketOdds: number;
  fairProbability: number;
  opportunityScore: number;
  closingOdds?: number;
  outcome?: "win" | "loss" | "push" | "void";
}
