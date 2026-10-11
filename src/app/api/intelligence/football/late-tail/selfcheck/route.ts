import { NextResponse } from "next/server";
import { runLateTailSelfcheck } from "@/lib/research/late-tail/selfcheck";

export function GET() {
  const result = runLateTailSelfcheck();
  return NextResponse.json({
    model: "veto.zero-s.late-tail.v0.2", ...result,
  }, { status: result.passed ? 200 : 500, headers: { "Cache-Control": "no-store" } });
}
