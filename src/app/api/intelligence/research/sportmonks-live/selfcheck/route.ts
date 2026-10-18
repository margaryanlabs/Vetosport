import {NextResponse} from "next/server";
import {sportmonksLiveAdapterSelfcheck} from "@/lib/providers/sportmonks";
export const dynamic="force-dynamic";
export function GET(){
 const report=sportmonksLiveAdapterSelfcheck();
 return NextResponse.json({model:"veto.sportmonks-live.adapter.selfcheck.v1",...report,
  providerCalls:0,bookmakerCalls:0,realBetsPlaced:0,profitabilityVerified:false},
  {status:report.passed?200:503,
   headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
