import { NextResponse } from "next/server";
import {
 DATASET_META, HISTORICAL_BY_MINUTE,
 describeCohort, evaluateCascadeHypothesis, runCascadeEvidenceSelfcheck
} from "@/lib/research/goal-cascade/evidence";

export function GET() {
 const verification = runCascadeEvidenceSelfcheck();
 return NextResponse.json({
   status: "RESEARCH_ONLY",
   dataset: DATASET_META,
   byMinute: HISTORICAL_BY_MINUTE.map(describeCohort),
   cascade: evaluateCascadeHypothesis(),
   verification,
   productionDecisionAuthorized: false,
   note: "Historical descriptive statistics, NOT live model probabilities, betting advice, or ROI."
 }, { status: verification.passed ? 200 : 500, headers: { "Cache-Control": "no-store" } });
}
