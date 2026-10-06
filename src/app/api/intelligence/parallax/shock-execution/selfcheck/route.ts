import { NextResponse } from "next/server";
import { runShockExecutionSelfCheck } from "@/lib/parallax/shock-execution-selfcheck";

export function GET() {
  const report = runShockExecutionSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
