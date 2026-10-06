import { NextResponse } from "next/server";
import { runContractSemanticsSelfCheck } from "@/lib/contracts/selfcheck";

export function GET() {
  const report = runContractSemanticsSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
