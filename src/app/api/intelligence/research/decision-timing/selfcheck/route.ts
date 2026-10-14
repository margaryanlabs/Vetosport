import {NextResponse} from "next/server";
import {temporalDataSafetySelfcheck} from "@/lib/live/temporal-data-safety";
export const dynamic="force-dynamic";
export function GET(){
 const checks=temporalDataSafetySelfcheck();
 return NextResponse.json({
  model:"veto.decision-timing.selfcheck.v1",...checks,
  verifiedBettingEdgeCount:0,externalProviderCalls:0,
 },{status:checks.passed?200:503,
  headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
