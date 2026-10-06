import { NextResponse } from "next/server";
import { runCouncilSelfCheck } from "@/lib/council/selfcheck";

export function GET() {
  const report = runCouncilSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
