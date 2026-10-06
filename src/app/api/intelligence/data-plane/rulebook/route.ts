import { NextResponse } from "next/server";
import {
  prepareJournalRecord,
  prepareRulebookVersion,
} from "@/lib/data-plane/engine";
import { getPersistence } from "@/lib/persistence/factory";

interface Body {
  providerId?: string;
  versionId?: string;
  sport?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  capturedAt?: string;
  sourceRef?: string;
  rules?: Record<string, unknown>;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.INGESTION_SECRET;
  const providedSecret = request.headers.get(
    "x-veto-ingestion-secret",
  );

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as Body;

  if (
    !body.providerId ||
    !body.versionId ||
    !body.effectiveFrom ||
    !body.rules
  ) {
    return NextResponse.json(
      {
        error:
          "providerId, versionId, effectiveFrom and rules are required",
      },
      { status: 400 },
    );
  }

  try {
    const capturedAt =
      body.capturedAt ?? new Date().toISOString();
    const version = prepareRulebookVersion({
      providerId: body.providerId,
      versionId: body.versionId,
      sport: body.sport,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
      capturedAt,
      sourceRef: body.sourceRef,
      rules: body.rules,
    });

    const persistence = getPersistence();
    await persistence.appendRulebookVersion(version);

    const journal = prepareJournalRecord({
      sourceProvider: body.providerId,
      sourceRecordId: body.versionId,
      stream: "RULEBOOK",
      schemaVersion: "veto.provider-rulebook.v1",
      eventOccurredAt: version.effectiveFrom,
      sourceEmittedAt: capturedAt,
      gatewayReceivedAt: capturedAt,
      normalizedAt: new Date().toISOString(),
      knowledgeAvailableAt: capturedAt,
      acquisitionMode: "LIVE",
      semanticKey: [
        body.providerId,
        body.sport ?? "all",
        body.versionId,
      ].join("|"),
      payload: {
        providerId: version.providerId,
        versionId: version.versionId,
        sport: version.sport,
        effectiveFrom: version.effectiveFrom,
        effectiveTo: version.effectiveTo,
        sourceRef: version.sourceRef,
        contentHash: version.contentHash,
        rules: version.rules,
      },
    });

    await persistence.appendTruthJournal([journal]);

    return NextResponse.json({
      stored: true,
      providerId: version.providerId,
      versionId: version.versionId,
      contentHash: version.contentHash,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Rulebook ingestion failed",
      },
      { status: 422 },
    );
  }
}
