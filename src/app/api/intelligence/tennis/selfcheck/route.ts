import { NextResponse } from "next/server";
import { runTennisSelfCheck } from "@/lib/models/tennis/selfcheck";

export function GET() {
  const report = runTennisSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
