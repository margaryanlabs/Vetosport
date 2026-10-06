import { NextResponse } from "next/server";
import { analyzeTemporalMarketResponse } from "@/lib/parallax/temporal";
import type {
  BookmakerResponseSeries,
  MarketShock,
} from "@/lib/parallax/temporal-types";

interface Body {
  shock: MarketShock;
  series: BookmakerResponseSeries[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body?.shock || !Array.isArray(body.series) || body.series.length < 2) {
      return NextResponse.json(
        {
          error:
            "shock and at least two synchronized bookmaker response series are required",
        },
        { status: 400 },
      );
    }

    const invalidSeries = body.series.find(
      (series) =>
        !series.bookId ||
        !series.label ||
        !Array.isArray(series.quotes) ||
        series.quotes.length < 3 ||
        series.quotes.some(
          (quote) =>
            !Number.isFinite(quote.tMs) ||
            !Number.isFinite(quote.probability) ||
            quote.probability <= 0 ||
            quote.probability >= 1,
        ),
    );

    if (invalidSeries) {
      return NextResponse.json(
        {
          error:
            "each bookmaker series requires at least three valid probability quotes",
          bookId: invalidSeries.bookId,
        },
        { status: 400 },
      );
    }

    const analysis = analyzeTemporalMarketResponse(
      body.shock,
      body.series,
    );

    return NextResponse.json({
      model: "veto.parallax.temporal-response.v1",
      version: "0.1.0",
      generatedAt: new Date().toISOString(),
      researchWarning:
        "Leader/follower and half-life estimates require synchronized executable quotes. Unsynchronized displayed odds can create false latency.",
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Temporal response analysis failed",
      },
      { status: 422 },
    );
  }
}
