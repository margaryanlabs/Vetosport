import {NextResponse} from "next/server";
import {forecastValidationSelfcheck} from "@/lib/research/forecast-validation";
export const dynamic="force-dynamic";
export function GET(){
 const result=forecastValidationSelfcheck();
 return NextResponse.json({model:"veto.forecast-proof.selfcheck.v1",...result,
  externalProviderCalls:0,automaticBettingEnabled:false},
  {status:result.passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
