import { NextResponse } from "next/server";
import type { FootballSettlementInput } from "@/lib/models/football/settlement";
import { settleFootballDecision } from "@/lib/models/football/settlement";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<FootballSettlementInput>;

  if (
    !body.marketId ||
    !body.selectionId ||
    !body.finalScore ||
    typeof body.finalScore.home !== "number" ||
    typeof body.finalScore.away !== "number"
  ) {
    return NextResponse.json(
      { error: "marketId, selectionId and finalScore are required" },
      { status: 400 },
    );
  }

  const result = settleFootballDecision(body as FootballSettlementInput);
  return NextResponse.json({ result });
}
