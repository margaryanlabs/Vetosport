import {NextResponse} from "next/server";
import {hypothesisLiveMatchesSelfcheck} from "@/lib/research/hypothesis-live-matches";
export const dynamic="force-dynamic";
/** Deterministic safety invariants; no secrets, storage calls, or provider requests. */
export function GET(){
 const result=hypothesisLiveMatchesSelfcheck();
 return NextResponse.json({model:"veto.hypothesis-live-match.selfcheck.v1",...result,
  externalProviderCalls:0,automaticBettingEnabled:false},
  {status:result.passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
