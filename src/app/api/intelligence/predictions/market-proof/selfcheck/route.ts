import {NextResponse} from "next/server";
import {prospectiveMarketProofSelfcheck} from "@/lib/research/prospective-market-proof";
export const dynamic="force-dynamic";
export function GET(){
 const x=prospectiveMarketProofSelfcheck();
 return NextResponse.json({model:"veto.market-proof.selfcheck.v1",...x,
  providerCalls:0,realMoneyBets:0,independentModel:false},
  {status:x.passed?200:503,
   headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
