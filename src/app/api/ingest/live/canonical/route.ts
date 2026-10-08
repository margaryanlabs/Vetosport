import { NextResponse } from "next/server";
import {
  ingestCanonicalLivePayload,
  normalizeCanonicalLivePayload,
} from "@/lib/ingestion/canonical-live";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.INGESTION_SECRET;
  const providedSecret = request.headers.get(
    "x-veto-ingestion-secret",
  );

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    const payload = normalizeCanonicalLivePayload(body);
    const dryRun =
      new URL(request.url).searchParams.get("dryRun") === "1";

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        normalized: {
          provider: payload.provider,
          sourceEventId: payload.sourceEventId,
          event: payload.event,
          hasState: Boolean(payload.state),
          quotes: payload.quotes.length,
          evidence: payload.evidence.length,
          gatewayReceivedAt: payload.gatewayReceivedAt,
        },
      });
    }

    const result = await ingestCanonicalLivePayload(payload);
    return NextResponse.json({
      ok: true,
      dryRun: false,
      model: "veto.canonical-live-gateway.v1",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Canonical live ingestion failed.",
      },
      { status: 400 },
    );
  }
}
