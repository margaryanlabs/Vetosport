import { NextResponse } from "next/server";
import { runSourceObservatorySelfcheck } from "@/lib/research/mission-control/source-observatory";

export function GET() {
  const result = runSourceObservatorySelfcheck();
  return NextResponse.json(result, {
    status: result.passed ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
