import type {
  Evidence,
  MarketQuote,
  Sport,
  SportEvent,
} from "@/lib/domain/types";

export interface SportsDataProvider {
  id: string;
  listEvents(input: {
    sport: Sport;
    from: string;
    to: string;
  }): Promise<SportEvent[]>;
  getEvent(eventId: string): Promise<SportEvent | null>;
  getEvidence(eventId: string): Promise<Evidence[]>;
}

export interface OddsProvider {
  id: string;
  getQuotes(eventId: string): Promise<MarketQuote[]>;
}

export interface RealtimeSportsProvider {
  id: string;
  subscribe(eventIds: string[], onEvent: (event: SportEvent) => void): () => void;
}

export interface IntelligenceRepository {
  appendDecision(entry: {
    id: string;
    eventId: string;
    marketId: string;
    selectionId: string;
    capturedAt: string;
    decision: "EDGE" | "WATCH" | "PASS";
    modelVersionSet: string[];
    featureSnapshotId: string;
    marketOdds: number;
    fairProbability: number;
    opportunityScore: number;
  }): Promise<void>;
}
