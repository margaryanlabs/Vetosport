import {NextResponse} from "next/server";
import {sportmonksConfigurationSelfcheck} from "@/lib/research/source-health";
export const dynamic="force-dynamic";
/** Checks the sanitization contract only, not secret values or provider keys. */
export function GET(){
 const report=sportmonksConfigurationSelfcheck();
 return NextResponse.json({model:"veto.sportmonks-config.selfcheck.v1",
  ...report,externalProviderCalls:0,secretsExposed:false,
  automaticBettingEnabled:false},
  {status:report.passed?200:503,headers:{
    "Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
