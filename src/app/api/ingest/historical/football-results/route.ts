import { NextResponse } from "next/server";
import { importHistoricalFootballResults } from "@/lib/ingestion/historical-football-results";

interface Body {
  startDate?: string;
  endDate?: string;
  maxPages?: number;
  execute?: boolean;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedSecret = process.env.INGESTION_SECRET;
  const providedSecret = request.headers.get("x-veto-ingestion-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    !body.startDate ||
    !body.endDate ||
    !datePattern.test(body.startDate) ||
    !datePattern.test(body.endDate)
  ) {
    return NextResponse.json(
      { error: "startDate and endDate must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  if (!body.execute) {
    return NextResponse.json({
      dryRun: true,
      message:
        "Historical result import not executed. Send execute=true after reviewing the requested range.",
      plan: {
        startDate: body.startDate,
        endDate: body.endDate,
        maxPages: body.maxPages ?? 20,
        pageSize: 50,
      },
    });
  }

  try {
    const result = await importHistoricalFootballResults({
      startDate: body.startDate,
      endDate: body.endDate,
      maxPages: body.maxPages,
    });

    return NextResponse.json({ dryRun: false, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Historical results import failed" },
      { status: 502 },
    );
  }
}
