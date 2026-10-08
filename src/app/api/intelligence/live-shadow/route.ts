import { NextResponse } from "next/server";
import { runFootballShadowPrediction } from "@/lib/live/shadow-football";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const expectedSecret = process.env.INGESTION_SECRET;
  const providedSecret = request.headers.get("x-veto-ingestion-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { eventId?: string };
  try {
    body = (await request.json()) as { eventId?: string };
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!body.eventId || !uuidPattern.test(body.eventId)) {
    return NextResponse.json(
      { error: "A valid eventId UUID is required." },
      { status: 400 },
    );
  }

  try {
    const dryRun =
      new URL(request.url).searchParams.get("dryRun") === "1";
    const result = await runFootballShadowPrediction(body.eventId, {
      persist: !dryRun,
    });

    return NextResponse.json({
      model: "veto.shadow-football.v1",
      generatedAt: new Date().toISOString(),
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Shadow football prediction failed.",
      },
      { status: 503 },
    );
  }
}
