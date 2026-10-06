import { NextResponse } from "next/server";
import { buildDataPlaneReplay } from "@/lib/data-plane/engine";
import { getPersistence } from "@/lib/persistence/factory";
import type { JournalStream } from "@/lib/data-plane/types";

interface Body {
  eventId?: string;
  asOf?: string;
  streams?: JournalStream[];
  limit?: number;
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

  if (!body.eventId || !body.asOf) {
    return NextResponse.json(
      { error: "eventId and asOf are required" },
      { status: 400 },
    );
  }

  try {
    const persistence = getPersistence();
    const rows = await persistence.listTruthAsOf({
      eventId: body.eventId,
      asOf: body.asOf,
      streams: body.streams,
      limit: body.limit,
    });

    const replay = buildDataPlaneReplay(rows, {
      eventId: body.eventId,
      asOf: body.asOf,
    });

    return NextResponse.json({
      model: "veto.data-plane.replay.v1",
      generatedAt: new Date().toISOString(),
      replay,
      note:
        "Replay is filtered by knowledge_available_at. Historical backfill rows remain explicitly marked HISTORICAL_BACKFILL.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Data Plane replay failed",
      },
      { status: 422 },
    );
  }
}
