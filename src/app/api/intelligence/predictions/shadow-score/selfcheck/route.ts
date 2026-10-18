import {NextResponse} from "next/server";
import {scoreOnlyShadowSelfcheck} from "@/lib/live/score-only-shadow";
export const dynamic="force-dynamic";
/** No sporting API, persistence read, user data, trade or bookmaker request. */
export function GET(){
 const report=scoreOnlyShadowSelfcheck();
 return NextResponse.json({model:"veto.score-only-shadow.selfcheck.v1",
  ...report,externalProviderCalls:0,externalBookmakerCalls:0,
  automaticBettingEnabled:false,liveExecutionVerified:false,
  priorCalibrationVerified:false},
  {status:report.passed?200:503,
   headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
