import { NextResponse } from "next/server";
import type { MarketQuote, ModelSignal } from "@/lib/domain/types";
import { aggregateCouncil } from "@/lib/intelligence/council";
import { evaluateOpportunity, type OpportunityContext } from "@/lib/intelligence/opportunity";

interface EvaluateBody {
  quote?: MarketQuote;
  signals?: ModelSignal[];
  context?: OpportunityContext;
}

export async function POST(request: Request) {
  const body = (await request.json()) as EvaluateBody;

  if (!body.quote || !Array.isArray(body.signals) || body.signals.length === 0 || !body.context) {
    return NextResponse.json(
      { error: "quote, signals[] and context are required" },
      { status: 400 },
    );
  }

  try {
    const estimate = aggregateCouncil(body.signals);
    const opportunity = evaluateOpportunity(body.quote, estimate, body.context);
    return NextResponse.json({ estimate, opportunity });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evaluation failed" },
      { status: 422 },
    );
  }
}
