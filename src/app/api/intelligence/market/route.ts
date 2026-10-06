import { NextResponse } from "next/server";
import type { MarketQuote } from "@/lib/domain/types";
import {
  attachNoVigConsensus,
  buildSelectionConsensus,
} from "@/lib/intelligence/market-brain";

interface MarketBody {
  quotes?: MarketQuote[];
}

export async function POST(request: Request) {
  const body = (await request.json()) as MarketBody;

  if (!Array.isArray(body.quotes) || body.quotes.length === 0) {
    return NextResponse.json(
      { error: "quotes[] is required" },
      { status: 400 },
    );
  }

  try {
    const rawConsensus = buildSelectionConsensus(body.quotes);
    const consensus = attachNoVigConsensus(rawConsensus);

    return NextResponse.json({
      quotes: body.quotes.length,
      markets: new Set(body.quotes.map((quote) => quote.marketId)).size,
      consensus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Market analysis failed" },
      { status: 422 },
    );
  }
}
