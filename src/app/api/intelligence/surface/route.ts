import { NextResponse } from "next/server";
import type { Opportunity } from "@/lib/domain/types";
import {
  rankProbabilitySurface,
  surfaceSummary,
} from "@/lib/intelligence/surface";
import type { DecisionMode } from "@/lib/intelligence/policy";

interface SurfaceBody {
  opportunities?: Opportunity[];
  mode?: DecisionMode;
}

const modes: DecisionMode[] = [
  "MICRO_EDGE",
  "BALANCED",
  "VALUE",
  "HIGH_CONVICTION",
  "LIVE_PULSE",
];

export async function POST(request: Request) {
  const body = (await request.json()) as SurfaceBody;

  if (!Array.isArray(body.opportunities)) {
    return NextResponse.json(
      { error: "opportunities[] is required" },
      { status: 400 },
    );
  }

  const mode = body.mode ?? "BALANCED";
  if (!modes.includes(mode)) {
    return NextResponse.json(
      { error: "Unsupported decision mode", supportedModes: modes },
      { status: 400 },
    );
  }

  const entries = rankProbabilitySurface(body.opportunities, mode);

  return NextResponse.json({
    mode,
    summary: surfaceSummary(entries),
    entries,
  });
}
