import { NextResponse } from "next/server";
import { runParallaxSelfCheck } from "@/lib/parallax/selfcheck";

export function GET() {
  const report = runParallaxSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
