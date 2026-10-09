import { NextResponse } from "next/server";
import {
  ingestCanonicalLivePayload,
  normalizeCanonicalLivePayload,
} from "@/lib/ingestion/canonical-live";
import { runFootballShadowPrediction } from "@/lib/live/shadow-football";

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
          shadowFastPathEligible:
            payload.event.sport === "football" &&
            payload.event.status === "live" &&
            Boolean(payload.state) &&
            payload.quotes.length > 0,
        },
      });
    }

    const result = await ingestCanonicalLivePayload(payload);

    let shadow:
      | Awaited<ReturnType<typeof runFootballShadowPrediction>>
      | {
          ok: false;
          skipped: false;
          eventId: string;
          error: string;
        }
      | {
          ok: true;
          skipped: true;
          eventId: string;
          reason: string;
        };

    const shadowFastPathEligible =
      payload.event.sport === "football" &&
      payload.event.status === "live" &&
      Boolean(payload.state) &&
      payload.quotes.length > 0;

    if (shadowFastPathEligible) {
      try {
        shadow = await runFootballShadowPrediction(
          result.canonicalEventId,
        );
      } catch (error) {
        shadow = {
          ok: false,
          skipped: false,
          eventId: result.canonicalEventId,
          error:
            error instanceof Error
              ? error.message
              : "Shadow prediction fast path failed.",
        };
      }
    } else {
      shadow = {
        ok: true,
        skipped: true,
        eventId: result.canonicalEventId,
        reason:
          "Shadow fast path requires a live football event with state and market quotes.",
      };
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      model: "veto.canonical-live-gateway.v2",
      result,
      shadow,
      guarantees: {
        ingestionIndependentOfShadow: true,
        shadowDecisionWrites: 0,
        cronBackup: "/api/cron/shadow-football",
      },
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
