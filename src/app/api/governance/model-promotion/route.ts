import { NextResponse } from "next/server";
import {
  evaluateModelPromotion,
  type ModelValidationSummary,
  type PromotionPolicy,
} from "@/lib/governance/promotion";

interface Body {
  champion?: ModelValidationSummary;
  challenger?: ModelValidationSummary;
  policy?: PromotionPolicy;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;

  if (!body.champion || !body.challenger) {
    return NextResponse.json(
      { error: "champion and challenger validation summaries are required" },
      { status: 400 },
    );
  }

  const result = evaluateModelPromotion(
    body.champion,
    body.challenger,
    body.policy,
  );

  return NextResponse.json(result, {
    status: result.decision === "REJECT" ? 422 : 200,
  });
}
