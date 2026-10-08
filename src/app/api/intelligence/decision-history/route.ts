import { NextResponse } from "next/server";
import { getPersistence } from "@/lib/persistence/factory";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  const marketKey = url.searchParams.get("marketKey") ?? undefined;
  const selectionKey = url.searchParams.get("selectionKey") ?? undefined;
  const rawLimit = Number(url.searchParams.get("limit") ?? "80");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(250, Math.max(1, Math.trunc(rawLimit)))
    : 80;

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId is required" },
      { status: 400 },
    );
  }

  if (!uuidPattern.test(eventId)) {
    return NextResponse.json({
      model: "veto.decision-history.v1",
      generatedAt: new Date().toISOString(),
      source: "unavailable",
      rows: [],
      note:
        "This event id is not a persisted UUID. The client may use an explicitly labelled reconstruction instead.",
    });
  }

  try {
    const persistence = getPersistence();
    const rows = await persistence.listDecisionHistory({
      eventId,
      marketKey,
      selectionKey,
      limit,
    });

    return NextResponse.json({
      model: "veto.decision-history.v1",
      generatedAt: new Date().toISOString(),
      source: "decision_ledger",
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        model: "veto.decision-history.v1",
        generatedAt: new Date().toISOString(),
        source: "unavailable",
        rows: [],
        error:
          error instanceof Error
            ? error.message
            : "Decision history unavailable",
      },
      { status: 503 },
    );
  }
}
