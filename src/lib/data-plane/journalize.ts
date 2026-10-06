import type { MarketQuote } from "@/lib/domain/types";
import type {
  DataPlaneJournalInput,
  PreparedJournalRecord,
} from "@/lib/data-plane/types";
import { prepareJournalRecord } from "@/lib/data-plane/engine";

const validIsoOr = (value: string | undefined, fallback: string) => {
  if (!value) return new Date(fallback).toISOString();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms)
    ? new Date(ms).toISOString()
    : new Date(fallback).toISOString();
};

const quoteSourceRecordId = (quote: MarketQuote) => {
  const providerQuoteId = quote.raw?.providerQuoteId;
  if (
    typeof providerQuoteId === "string" ||
    typeof providerQuoteId === "number"
  ) {
    return String(providerQuoteId);
  }

  return [
    quote.bookmaker,
    quote.marketId,
    quote.selection.id,
    quote.providerLastUpdate ?? quote.capturedAt,
  ].join("|");
};

export const journalizeMarketQuotes = (input: {
  canonicalEventId: string;
  sourceProvider: string;
  gatewayReceivedAt: string;
  normalizedAt?: string;
  acquisitionMode?: "LIVE" | "HISTORICAL_BACKFILL";
  historicalKnowledgeAt?: string;
  quotes: MarketQuote[];
}): PreparedJournalRecord[] => {
  const normalizedAt =
    input.normalizedAt ?? new Date().toISOString();
  const acquisitionMode = input.acquisitionMode ?? "LIVE";

  return input.quotes.map((quote) => {
    const sourceTime = validIsoOr(
      quote.providerLastUpdate ?? quote.capturedAt,
      input.gatewayReceivedAt,
    );

    const knowledgeAvailableAt =
      acquisitionMode === "HISTORICAL_BACKFILL"
        ? validIsoOr(
            input.historicalKnowledgeAt ?? sourceTime,
            sourceTime,
          )
        : new Date(input.gatewayReceivedAt).toISOString();

    return prepareJournalRecord({
      eventId: input.canonicalEventId,
      sourceProvider:
        quote.sourceProvider ?? input.sourceProvider,
      sourceRecordId: quoteSourceRecordId(quote),
      stream: "MARKET_QUOTE",
      schemaVersion: "veto.market-quote.v2",
      eventOccurredAt: sourceTime,
      sourceEmittedAt: sourceTime,
      gatewayReceivedAt: new Date(
        input.gatewayReceivedAt,
      ).toISOString(),
      normalizedAt,
      knowledgeAvailableAt,
      acquisitionMode,
      sourceClockOffsetMs: 0,
      sourceTimeUncertaintyMs:
        acquisitionMode === "HISTORICAL_BACKFILL"
          ? 1000
          : 250,
      lateArrival:
        new Date(input.gatewayReceivedAt).getTime() -
          new Date(sourceTime).getTime() >
        30_000,
      semanticKey: [
        quote.marketId,
        quote.selection.id,
        quote.selection.line ?? "NA",
      ].join("|"),
      payload: {
        eventId: input.canonicalEventId,
        marketId: quote.marketId,
        selection: quote.selection,
        bookmaker: quote.bookmaker,
        decimalOdds: quote.decimalOdds,
        capturedAt: quote.capturedAt,
        providerLastUpdate: quote.providerLastUpdate,
        suspended: quote.suspended ?? false,
        liquidity: quote.liquidity,
        raw: quote.raw,
      },
    });
  });
};

export const journalizeEventState = <T>(input: {
  canonicalEventId: string;
  sourceProvider: string;
  sourceRecordId: string;
  gatewayReceivedAt: string;
  sourceEmittedAt?: string;
  eventOccurredAt?: string;
  normalizedAt?: string;
  knowledgeAvailableAt?: string;
  acquisitionMode?: "LIVE" | "HISTORICAL_BACKFILL";
  providerSequence?: string;
  sourceTimeUncertaintyMs?: number;
  lateArrival?: boolean;
  payload: T;
}): PreparedJournalRecord<T> => {
  const gateway = new Date(input.gatewayReceivedAt).toISOString();
  const emitted = validIsoOr(input.sourceEmittedAt, gateway);
  const occurred = validIsoOr(input.eventOccurredAt, emitted);
  const acquisitionMode = input.acquisitionMode ?? "LIVE";

  const record: DataPlaneJournalInput<T> = {
    eventId: input.canonicalEventId,
    sourceProvider: input.sourceProvider,
    sourceRecordId: input.sourceRecordId,
    stream: "EVENT_STATE",
    schemaVersion: "veto.event-state.v2",
    providerSequence: input.providerSequence,
    eventOccurredAt: occurred,
    sourceEmittedAt: emitted,
    gatewayReceivedAt: gateway,
    normalizedAt:
      input.normalizedAt ?? new Date().toISOString(),
    knowledgeAvailableAt:
      input.knowledgeAvailableAt ??
      (acquisitionMode === "LIVE" ? gateway : emitted),
    acquisitionMode,
    sourceClockOffsetMs: 0,
    sourceTimeUncertaintyMs:
      input.sourceTimeUncertaintyMs ?? 1000,
    lateArrival: input.lateArrival ?? false,
    payload: input.payload,
  };

  return prepareJournalRecord(record);
};
