import { NextResponse } from "next/server";
import { runBacktestSelfCheck } from "@/lib/backtest/selfcheck";

export function GET() {
  const report = runBacktestSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
