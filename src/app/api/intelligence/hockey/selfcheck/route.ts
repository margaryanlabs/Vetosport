import { NextResponse } from "next/server";
import { runHockeySelfCheck } from "@/lib/models/hockey/selfcheck";

export function GET() {
  const report = runHockeySelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
