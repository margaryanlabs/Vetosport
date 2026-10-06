import { NextResponse } from "next/server";
import { runDataPlaneSelfCheck } from "@/lib/data-plane/selfcheck";

export function GET() {
  const report = runDataPlaneSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
