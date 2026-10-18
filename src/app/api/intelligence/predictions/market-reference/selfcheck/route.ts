import {NextResponse} from "next/server";
import {marketReferenceSelfcheck} from "@/lib/research/market-reference";
export const dynamic="force-dynamic";
export function GET(){
 const check=marketReferenceSelfcheck();
 return NextResponse.json({model:"veto.market-reference.selfcheck.v1",
  ...check,externalProviderCalls:0,automaticBettingEnabled:false,
  independentVetoModel:false},{status:check.passed?200:503,
   headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
