import { NextResponse } from "next/server";
import { runPropagationSelfCheck } from "@/lib/parallax/propagation-selfcheck";

export function GET() {
  const report = runPropagationSelfCheck();
  return NextResponse.json(report, {
    status: report.passed ? 200 : 500,
  });
}
