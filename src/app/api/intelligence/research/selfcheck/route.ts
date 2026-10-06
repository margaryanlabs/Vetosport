import { NextResponse } from "next/server";
import { runExperimentLedgerSelfCheck } from "@/lib/research/selfcheck";

export function GET() {
  const report = runExperimentLedgerSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
