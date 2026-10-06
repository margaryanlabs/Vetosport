import { NextResponse } from "next/server";
import type { LiveTwinRepriceRequest } from "@/lib/live-twin/types";
import { applyLiveDeltas } from "@/lib/live-twin/reducer";
import {
  repricePriority,
  shouldReprice,
} from "@/lib/live-twin/materiality";
import { explainLiveChange } from "@/lib/live-twin/explain";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<LiveTwinRepriceRequest>;

  if (!body.state || !Array.isArray(body.deltas)) {
    return NextResponse.json(
      { error: "state and deltas[] are required" },
      { status: 400 },
    );
  }

  const nextState = applyLiveDeltas(body.state, body.deltas);
  const reprice = shouldReprice(body.deltas);
  const priority = repricePriority(body.deltas);
  const explanation = explainLiveChange(body.deltas);

  return NextResponse.json({
    reprice,
    priority,
    affectedMarketIds: body.affectedMarketIds ?? [],
    previousVersion: body.state.version,
    nextVersion: nextState.version,
    nextState,
    explanation,
  });
}
