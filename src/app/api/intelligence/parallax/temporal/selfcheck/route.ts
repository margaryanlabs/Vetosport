import { NextResponse } from "next/server";
import { runTemporalSelfCheck } from "@/lib/parallax/temporal-selfcheck";

export function GET() {
  const report = runTemporalSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
