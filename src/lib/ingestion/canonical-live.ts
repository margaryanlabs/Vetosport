import type {
  Evidence,
  EventStatus,
  MarketQuote,
  Sport,
  SportEvent,
} from "@/lib/domain/types";
import { canonicalEventKey } from "@/lib/canonical/id";
import {
  journalizeEventState,
  journalizeEvidence,
  journalizeMarketQuotes,
} from "@/lib/data-plane/journalize";
import { getPersistence } from "@/lib/persistence/factory";

const sports = new Set<Sport>([
  "football",
  "basketball",
  "tennis",
  "hockey",
  "baseball",
  "mma",
  "esports",
]);

const statuses = new Set<EventStatus>([
  "scheduled",
  "live",
  "finished",
  "suspended",
]);

const evidenceKinds = new Set<Evidence["kind"]>([
  "stat",
  "lineup",
  "injury",
  "news",
  "weather",
  "market",
  "tracking",
  "historical",
]);

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an object.");
  }
  return value as Record<string, unknown>;
};

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
};

const optionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const iso = (value: unknown, field: string, fallback?: string) => {
  const raw = value == null ? fallback : value;
  if (typeof raw !== "string" || !Number.isFinite(new Date(raw).getTime())) {
    throw new Error(`${field} must be a valid timestamp.`);
  }
  return new Date(raw).toISOString();
};

const finiteNumber = (value: unknown, field: string) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${field} must be a finite number.`);
  }
  return number;
};

const optionalFiniteNumber = (value: unknown, field: string) =>
  value == null ? undefined : finiteNumber(value, field);

const bool = (value: unknown) =>
  typeof value === "boolean" ? value : undefined;

const parseTeam = (value: unknown, field: string) => {
  if (value == null) return undefined;
  const input = record(value);
  const name = requiredString(input.name, `${field}.name`);
  return {
    id: optionalString(input.id) ?? name,
    name,
    shortName: optionalString(input.shortName),
  };
};

const parseEvent = (value: unknown): SportEvent => {
  const input = record(value);
  const sport = requiredString(input.sport, "event.sport") as Sport;
  if (!sports.has(sport)) {
    throw new Error(`Unsupported event.sport: ${sport}`);
  }

  const status = requiredString(
    input.status,
    "event.status",
  ) as EventStatus;
  if (!statuses.has(status)) {
    throw new Error(`Unsupported event.status: ${status}`);
  }

  const score =
    input.score == null
      ? undefined
      : (() => {
          const scoreInput = record(input.score);
          return {
            home: finiteNumber(scoreInput.home, "event.score.home"),
            away: finiteNumber(scoreInput.away, "event.score.away"),
          };
        })();

  const clock =
    input.clock == null
      ? undefined
      : (() => {
          const clockInput = record(input.clock);
          return {
            period: optionalString(clockInput.period),
            elapsedSeconds: optionalFiniteNumber(
              clockInput.elapsedSeconds,
              "event.clock.elapsedSeconds",
            ),
            remainingSeconds: optionalFiniteNumber(
              clockInput.remainingSeconds,
              "event.clock.remainingSeconds",
            ),
          };
        })();

  return {
    id: requiredString(input.id, "event.id"),
    sport,
    competition: requiredString(
      input.competition,
      "event.competition",
    ),
    startsAt: iso(input.startsAt, "event.startsAt"),
    status,
    home: parseTeam(input.home, "event.home"),
    away: parseTeam(input.away, "event.away"),
    score,
    clock,
  };
};

const parseQuotes = (
  value: unknown,
  provider: string,
  sourceEventId: string,
  receivedAt: string,
): MarketQuote[] => {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error("quotes must be an array.");
  if (value.length > 2000) throw new Error("quotes exceeds 2000 rows.");

  return value.map((item, index) => {
    const input = record(item);
    const selectionInput = record(input.selection);
    const decimalOdds = finiteNumber(
      input.decimalOdds,
      `quotes[${index}].decimalOdds`,
    );
    if (decimalOdds <= 1) {
      throw new Error(
        `quotes[${index}].decimalOdds must be greater than 1.`,
      );
    }

    const side = optionalString(selectionInput.side);
    if (
      side &&
      !["home", "away", "yes", "no", "over", "under", "draw"].includes(side)
    ) {
      throw new Error(`quotes[${index}].selection.side is invalid.`);
    }

    return {
      eventId: sourceEventId,
      marketId: requiredString(
        input.marketId,
        `quotes[${index}].marketId`,
      ),
      selection: {
        id: requiredString(
          selectionInput.id,
          `quotes[${index}].selection.id`,
        ),
        label: requiredString(
          selectionInput.label,
          `quotes[${index}].selection.label`,
        ),
        line: optionalFiniteNumber(
          selectionInput.line,
          `quotes[${index}].selection.line`,
        ),
        participantId: optionalString(selectionInput.participantId),
        side: side as MarketQuote["selection"]["side"],
      },
      bookmaker: requiredString(
        input.bookmaker,
        `quotes[${index}].bookmaker`,
      ),
      decimalOdds,
      capturedAt: iso(
        input.capturedAt,
        `quotes[${index}].capturedAt`,
        receivedAt,
      ),
      sourceProvider: optionalString(input.sourceProvider) ?? provider,
      providerLastUpdate:
        input.providerLastUpdate == null
          ? undefined
          : iso(
              input.providerLastUpdate,
              `quotes[${index}].providerLastUpdate`,
            ),
      suspended: bool(input.suspended),
      liquidity: optionalFiniteNumber(
        input.liquidity,
        `quotes[${index}].liquidity`,
      ),
      raw:
        input.raw && typeof input.raw === "object" && !Array.isArray(input.raw)
          ? (input.raw as Record<string, unknown>)
          : undefined,
    };
  });
};

const parseEvidence = (
  value: unknown,
  provider: string,
  receivedAt: string,
): Evidence[] => {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error("evidence must be an array.");
  if (value.length > 500) throw new Error("evidence exceeds 500 rows.");

  return value.map((item, index) => {
    const input = record(item);
    const kind = requiredString(
      input.kind,
      `evidence[${index}].kind`,
    ) as Evidence["kind"];
    if (!evidenceKinds.has(kind)) {
      throw new Error(`evidence[${index}].kind is invalid.`);
    }

    const reliability = finiteNumber(
      input.reliability,
      `evidence[${index}].reliability`,
    );
    if (reliability < 0 || reliability > 1) {
      throw new Error(
        `evidence[${index}].reliability must be between 0 and 1.`,
      );
    }

    return {
      id:
        optionalString(input.id) ??
        `${provider}:evidence:${index}:${receivedAt}`,
      kind,
      title: requiredString(
        input.title,
        `evidence[${index}].title`,
      ),
      value:
        typeof input.value === "string" ||
        typeof input.value === "number"
          ? input.value
          : undefined,
      source: optionalString(input.source) ?? provider,
      capturedAt: iso(
        input.capturedAt,
        `evidence[${index}].capturedAt`,
        receivedAt,
      ),
      reliability,
    };
  });
};

export interface CanonicalLivePayload {
  provider: string;
  sourceEventId: string;
  gatewayReceivedAt: string;
  providerSequence?: string;
  event: SportEvent;
  state?: {
    sourceRecordId: string;
    capturedAt: string;
    sourceEmittedAt: string;
    sourceLatencyMs?: number;
    fingerprint?: string;
    payload: Record<string, unknown>;
  };
  quotes: MarketQuote[];
  evidence: Evidence[];
}

export const normalizeCanonicalLivePayload = (
  value: unknown,
): CanonicalLivePayload => {
  const input = record(value);
  const provider = requiredString(input.provider, "provider");
  const sourceEventId = requiredString(
    input.sourceEventId,
    "sourceEventId",
  );
  const gatewayReceivedAt = iso(
    input.gatewayReceivedAt,
    "gatewayReceivedAt",
    new Date().toISOString(),
  );
  const event = parseEvent(input.event);
  const state =
    input.state == null
      ? undefined
      : (() => {
          const stateInput = record(input.state);
          const payload = record(stateInput.payload);
          const capturedAt = iso(
            stateInput.capturedAt,
            "state.capturedAt",
            gatewayReceivedAt,
          );
          return {
            sourceRecordId:
              optionalString(stateInput.sourceRecordId) ??
              `${sourceEventId}:${capturedAt}`,
            capturedAt,
            sourceEmittedAt: iso(
              stateInput.sourceEmittedAt,
              "state.sourceEmittedAt",
              capturedAt,
            ),
            sourceLatencyMs: optionalFiniteNumber(
              stateInput.sourceLatencyMs,
              "state.sourceLatencyMs",
            ),
            fingerprint: optionalString(stateInput.fingerprint),
            payload,
          };
        })();

  return {
    provider,
    sourceEventId,
    gatewayReceivedAt,
    providerSequence: optionalString(input.providerSequence),
    event,
    state,
    quotes: parseQuotes(
      input.quotes,
      provider,
      sourceEventId,
      gatewayReceivedAt,
    ),
    evidence: parseEvidence(
      input.evidence,
      provider,
      gatewayReceivedAt,
    ),
  };
};

export const ingestCanonicalLivePayload = async (
  input: CanonicalLivePayload,
) => {
  const persistence = getPersistence();
  const canonicalKey = canonicalEventKey({
    sport: input.event.sport,
    competition: input.event.competition,
    startsAt: input.event.startsAt,
    home: input.event.home?.name,
    away: input.event.away?.name,
    participants: input.event.participants?.map((item) => item.name),
  });

  const persisted = await persistence.upsertEvent(
    input.event,
    canonicalKey,
    {
      provider: input.provider,
      id: input.sourceEventId,
    },
  );

  let stateRows = 0;
  let quoteRows = 0;
  let evidenceRows = 0;
  let journalRows = 0;

  if (input.state) {
    await persistence.appendEventState({
      eventId: persisted.id,
      sourceProvider: input.provider,
      capturedAt: input.state.capturedAt,
      sourceLatencyMs: input.state.sourceLatencyMs,
      state: input.state.payload,
      fingerprint: input.state.fingerprint,
    });
    stateRows = 1;

    journalRows += await persistence.appendTruthJournal([
      journalizeEventState({
        canonicalEventId: persisted.id,
        sourceProvider: input.provider,
        sourceRecordId: input.state.sourceRecordId,
        gatewayReceivedAt: input.gatewayReceivedAt,
        sourceEmittedAt: input.state.sourceEmittedAt,
        eventOccurredAt: input.state.capturedAt,
        providerSequence: input.providerSequence,
        payload: input.state.payload,
      }),
    ]);
  }

  const quotes = input.quotes.map((quote) => ({
    ...quote,
    eventId: persisted.id,
    sourceProvider: quote.sourceProvider ?? input.provider,
  }));

  if (quotes.length > 0) {
    quoteRows = await persistence.appendQuotes(persisted.id, quotes);
    journalRows += await persistence.appendTruthJournal(
      journalizeMarketQuotes({
        canonicalEventId: persisted.id,
        sourceProvider: input.provider,
        gatewayReceivedAt: input.gatewayReceivedAt,
        quotes,
      }),
    );
  }

  if (input.evidence.length > 0) {
    evidenceRows = await persistence.appendEvidence(
      persisted.id,
      input.evidence,
    );
    journalRows += await persistence.appendTruthJournal(
      journalizeEvidence({
        canonicalEventId: persisted.id,
        sourceProvider: input.provider,
        gatewayReceivedAt: input.gatewayReceivedAt,
        evidence: input.evidence,
      }),
    );
  }

  const newestObservedAt =
    input.state?.capturedAt ??
    quotes.at(-1)?.capturedAt ??
    input.evidence.at(-1)?.capturedAt ??
    input.gatewayReceivedAt;
  const freshnessSeconds = Math.max(
    0,
    Math.round(
      (new Date(input.gatewayReceivedAt).getTime() -
        new Date(newestObservedAt).getTime()) /
        1000,
    ),
  );

  await persistence.appendProviderHealth({
    providerId: input.provider,
    status: freshnessSeconds <= 60 ? "healthy" : "degraded",
    checkedAt: input.gatewayReceivedAt,
    freshnessSeconds,
    message: "Canonical live gateway ingestion succeeded.",
    metadata: {
      canonicalEventId: persisted.id,
      sourceEventId: input.sourceEventId,
      stateRows,
      quoteRows,
      evidenceRows,
      journalRows,
    },
  });

  return {
    provider: input.provider,
    canonicalEventId: persisted.id,
    canonicalKey,
    sourceEventId: input.sourceEventId,
    receivedAt: input.gatewayReceivedAt,
    stateRows,
    quoteRows,
    evidenceRows,
    journalRows,
    freshnessSeconds,
  };
};
