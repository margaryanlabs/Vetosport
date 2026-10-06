import { createHash } from "node:crypto";
import type {
  DataPlaneJournalInput,
  DataPlaneReplay,
  DataPlaneRuntimeStatus,
  PersistedJournalRecord,
  PreparedJournalRecord,
} from "@/lib/data-plane/types";

const canonicalize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${canonicalize(item)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const normalizedIso = (value: string) =>
  new Date(value).toISOString();

export const prepareJournalRecord = <T>(
  input: DataPlaneJournalInput<T>,
): PreparedJournalRecord<T> => {
  const normalized = {
    ...input,
    eventOccurredAt: normalizedIso(input.eventOccurredAt),
    sourceEmittedAt: normalizedIso(input.sourceEmittedAt),
    gatewayReceivedAt: normalizedIso(input.gatewayReceivedAt),
    normalizedAt: normalizedIso(input.normalizedAt),
    sourceClockOffsetMs: input.sourceClockOffsetMs ?? 0,
    sourceTimeUncertaintyMs: input.sourceTimeUncertaintyMs ?? 0,
    lateArrival: input.lateArrival ?? false,
  };

  const payloadHash = sha256(canonicalize(normalized.payload));
  const dedupeKey = sha256(
    [
      normalized.sourceProvider,
      normalized.sourceRecordId,
      normalized.stream,
      normalized.schemaVersion,
      normalized.providerSequence ?? "",
      normalized.sourceEmittedAt,
      normalized.semanticKey ?? "",
      payloadHash,
    ].join("|"),
  );

  const recordHash = sha256(
    canonicalize({
      ...normalized,
      payloadHash,
      dedupeKey,
    }),
  );

  return {
    ...normalized,
    dedupeKey,
    payloadHash,
    recordHash,
  };
};

const correctionMap = <T>(
  records: PersistedJournalRecord<T>[],
) => {
  const map = new Map<string, PersistedJournalRecord<T>>();

  for (const record of records) {
    if (!record.correctionOf) continue;

    const existing = map.get(record.correctionOf);
    if (
      !existing ||
      new Date(record.gatewayReceivedAt).getTime() >
        new Date(existing.gatewayReceivedAt).getTime()
    ) {
      map.set(record.correctionOf, record);
    }
  }

  return map;
};

export const buildDataPlaneReplay = <T>(
  allRecords: PersistedJournalRecord<T>[],
  input: { eventId: string; asOf: string },
): DataPlaneReplay<T> => {
  const asOfMs = new Date(input.asOf).getTime();
  if (!Number.isFinite(asOfMs)) {
    throw new Error("Replay asOf must be a valid ISO timestamp.");
  }

  const eventRows = allRecords.filter(
    (record) => record.eventId === input.eventId,
  );

  const visible = eventRows
    .filter(
      (record) =>
        new Date(record.gatewayReceivedAt).getTime() <= asOfMs,
    )
    .sort(
      (a, b) =>
        new Date(a.gatewayReceivedAt).getTime() -
        new Date(b.gatewayReceivedAt).getTime(),
    );

  const corrections = correctionMap(visible);
  const replacedIds = new Set(corrections.keys());

  const active = visible.filter((record) => {
    if (record.correctionOf) {
      return corrections.get(record.correctionOf)?.id === record.id;
    }
    return (
      !replacedIds.has(record.id) &&
      !replacedIds.has(record.recordHash)
    );
  });

  const excludedFutureCount = eventRows.filter(
    (record) =>
      new Date(record.gatewayReceivedAt).getTime() > asOfMs,
  ).length;

  const appliedCorrections = [...corrections.entries()].map(
    ([replacesId, correction]) => ({
      correctionId: correction.id,
      replacesId,
    }),
  );

  const lookaheadSafe = active.every(
    (record) =>
      new Date(record.gatewayReceivedAt).getTime() <= asOfMs,
  );

  return {
    eventId: input.eventId,
    asOf: new Date(asOfMs).toISOString(),
    visible,
    active,
    excludedFutureCount,
    appliedCorrections,
    lookaheadSafe,
  };
};

export const getDataPlaneRuntimeStatus = (): DataPlaneRuntimeStatus => {
  const persistenceConfigured = Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const sportmonksConfigured = Boolean(
    process.env.SPORTMONKS_API_TOKEN,
  );
  const oddsConfigured = Boolean(process.env.THE_ODDS_API_KEY);
  const ingestionSecretConfigured = Boolean(
    process.env.INGESTION_SECRET,
  );

  const blockers: string[] = [];
  if (!persistenceConfigured)
    blockers.push("Supabase persistence is not configured.");
  if (!sportmonksConfigured)
    blockers.push("SPORTMONKS_API_TOKEN is not configured.");
  if (!oddsConfigured)
    blockers.push("THE_ODDS_API_KEY is not configured.");
  if (!ingestionSecretConfigured)
    blockers.push("INGESTION_SECRET is not configured.");

  const feedCount =
    Number(sportmonksConfigured) + Number(oddsConfigured);

  const mode: DataPlaneRuntimeStatus["mode"] =
    !persistenceConfigured
      ? "OFFLINE"
      : feedCount === 0
        ? "STORAGE_ONLY"
        : feedCount < 2 || !ingestionSecretConfigured
          ? "PARTIAL_FEEDS"
          : "LIVE_READY";

  return {
    persistenceConfigured,
    sportmonksConfigured,
    oddsConfigured,
    ingestionSecretConfigured,
    mode,
    blockers,
  };
};
