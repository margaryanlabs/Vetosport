import { NextResponse } from "next/server";
import { runBasketballSelfCheck } from "@/lib/models/basketball/selfcheck";

export function GET() {
  const report = runBasketballSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
