import { NextResponse } from "next/server";
import { buildParallaxShadowDecision } from "@/lib/parallax/shadow-ledger";
import { sandboxParallaxAnalysis } from "@/lib/parallax/sandbox";

export const dynamic = "force-dynamic";

export function GET() {
  const record = buildParallaxShadowDecision({
    analysis: sandboxParallaxAnalysis,
    eventId: "ars-liv",
    stateId: "#18429",
    modelVersion: "veto.parallax.football.v1",
    marketSnapshotId: "sandbox-market-ars-liv-64-18",
  });

  return NextResponse.json({
    mode: "preview",
    persistence: "not-connected",
    warning:
      "This response demonstrates the append-only record contract and hash. It is not persisted until a dedicated VETO ledger store is connected.",
    record,
  });
}
