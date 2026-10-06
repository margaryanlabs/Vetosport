import { NextResponse } from "next/server";
import { runTruthPlaneSelfCheck } from "@/lib/truth/selfcheck";

export function GET() {
  const report = runTruthPlaneSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
