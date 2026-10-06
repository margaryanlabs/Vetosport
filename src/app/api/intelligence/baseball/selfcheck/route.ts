import { NextResponse } from "next/server";
import { runBaseballSelfCheck } from "@/lib/models/baseball/selfcheck";

export function GET() {
  const report = runBaseballSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
