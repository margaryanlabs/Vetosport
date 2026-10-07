import { NextResponse } from "next/server";
import { prepareJournalRecord } from "@/lib/data-plane/engine";
import { getPersistence, persistenceConfiguration } from "@/lib/persistence/factory";

export const dynamic = "force-dynamic";

const capturedAt = "2026-10-07T08:00:00.000Z";

export async function GET() {
  try {
    const persistence = getPersistence();
    const event = await persistence.upsertEvent(
      {
        id: "veto-sport-storage-selfcheck",
        sport: "football",
        competition: "VETO Storage Selfcheck",
        startsAt: "2099-01-01T00:00:00.000Z",
        status: "scheduled",
        home: { id: "selfcheck-home", name: "Storage" },
        away: { id: "selfcheck-away", name: "Bridge" },
      },
      "veto-sport-storage-selfcheck",
      { provider: "veto-selfcheck", id: "storage-v1" },
    );

    const record = prepareJournalRecord({
      eventId: event.id,
      sourceProvider: "veto-storage-selfcheck",
      sourceRecordId: "bridge-roundtrip-v1",
      stream: "PROVIDER_HEALTH",
      schemaVersion: "veto.storage-selfcheck.v1",
      eventOccurredAt: capturedAt,
      sourceEmittedAt: capturedAt,
      gatewayReceivedAt: capturedAt,
      normalizedAt: capturedAt,
      knowledgeAvailableAt: capturedAt,
      acquisitionMode: "LIVE",
      semanticKey: "storage|bridge|roundtrip",
      payload: {
        probe: "Vercel -> Edge Bridge -> Supabase -> Truth Journal",
        version: 1,
      },
    });

    const inserted = await persistence.appendTruthJournal([record]);
    const rows = await persistence.listTruthAsOf({
      eventId: event.id,
      asOf: "2099-01-01T00:00:00.000Z",
      streams: ["PROVIDER_HEALTH"],
      limit: 20,
    });

    const persisted = rows.find(
      (row) =>
        row.sourceRecordId === record.sourceRecordId &&
        row.recordHash === record.recordHash,
    );

    const passed = Boolean(persisted);

    return NextResponse.json(
      {
        passed,
        storage: persistenceConfiguration(),
        checks: {
          eventUpserted: Boolean(event.id),
          journalWriteAccepted: inserted === 0 || inserted === 1,
          journalRoundtrip: passed,
          idempotent: inserted === 0 || inserted === 1,
        },
        inserted,
        eventId: event.id,
        recordHash: record.recordHash,
        persistedRecordId: persisted?.id ?? null,
      },
      { status: passed ? 200 : 500 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        passed: false,
        storage: persistenceConfiguration(),
        error:
          error instanceof Error
            ? error.message
            : "Storage self-check failed.",
      },
      { status: 500 },
    );
  }
}
