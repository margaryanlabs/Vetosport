import { NextResponse } from "next/server";
import { runAlphaMemorySelfCheck } from "@/lib/alpha/selfcheck";

export function GET() {
  const report = runAlphaMemorySelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
