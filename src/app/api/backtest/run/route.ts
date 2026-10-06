import { NextResponse } from "next/server";
import type {
  BacktestRow,
  BacktestRunOptions,
} from "@/lib/backtest/types";
import { runBacktest } from "@/lib/backtest/runner";

interface Body {
  rows?: BacktestRow[];
  options?: BacktestRunOptions;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  if (!Array.isArray(body.rows)) {
    return NextResponse.json(
      { error: "rows[] is required" },
      { status: 400 },
    );
  }

  try {
    const report = runBacktest(body.rows, body.options);
    return NextResponse.json(report, {
      status: report.leakage.valid ? 200 : 422,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backtest failed" },
      { status: 422 },
    );
  }
}
