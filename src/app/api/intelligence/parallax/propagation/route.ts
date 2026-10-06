import { NextResponse } from "next/server";
import { analyzeCrossMarketPropagation } from "@/lib/parallax/propagation";
import type { MarketFamilyTrace } from "@/lib/parallax/propagation-types";

interface Body {
  traces: MarketFamilyTrace[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!Array.isArray(body?.traces) || body.traces.length < 2) {
      return NextResponse.json(
        {
          error:
            "at least two synchronized linked-market traces are required",
        },
        { status: 400 },
      );
    }

    const invalid = body.traces.find(
      (trace) =>
        !trace.familyId ||
        !trace.label ||
        !Number.isFinite(trace.baselineProbability) ||
        !Number.isFinite(trace.targetProbability) ||
        trace.baselineProbability <= 0 ||
        trace.baselineProbability >= 1 ||
        trace.targetProbability <= 0 ||
        trace.targetProbability >= 1 ||
        !Array.isArray(trace.quotes) ||
        trace.quotes.length < 3 ||
        trace.quotes.some(
          (quote) =>
            !Number.isFinite(quote.tMs) ||
            !Number.isFinite(quote.probability) ||
            quote.probability <= 0 ||
            quote.probability >= 1,
        ),
    );

    if (invalid) {
      return NextResponse.json(
        {
          error:
            "each family requires valid baseline/target probabilities and at least three synchronized quotes",
          familyId: invalid.familyId,
        },
        { status: 400 },
      );
    }

    const analysis = analyzeCrossMarketPropagation(body.traces);

    return NextResponse.json({
      model: "veto.parallax.cross-market.v1",
      version: "0.1.0",
      generatedAt: new Date().toISOString(),
      researchWarning:
        "STALE-CANDIDATE is a structural lag label, not proof of executable value. Real deployment requires synchronized contract semantics, executable quotes, limits, suspensions and OOS validation.",
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cross-market propagation analysis failed",
      },
      { status: 422 },
    );
  }
}
