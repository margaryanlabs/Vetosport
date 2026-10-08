import { NextResponse } from "next/server";
import { getPersistedObservation } from "@/lib/live/persisted-observation";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId");

  if (!eventId || !uuidPattern.test(eventId)) {
    return NextResponse.json(
      { error: "A valid eventId UUID is required." },
      { status: 400 },
    );
  }

  try {
    const observation = await getPersistedObservation(eventId);
    if (!observation) {
      return NextResponse.json(
        { error: "Persisted event not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      model: "veto.live-decision-preflight.v1",
      generatedAt: new Date().toISOString(),
      eventId,
      eventStatus: observation.summary.status,
      quoteCount: observation.quoteCount,
      existingDecision: Boolean(observation.latestDecision),
      readiness: observation.summary.decisionReadiness,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Live decision preflight failed.",
      },
      { status: 503 },
    );
  }
}
