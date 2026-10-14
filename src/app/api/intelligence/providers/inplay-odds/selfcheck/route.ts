import {storageFailureSelfcheck} from "@/lib/persistence/failure-codes";
import {marketQuotePayloadSelfcheck} from "@/lib/persistence/market-quote-rows";
import {NextResponse} from "next/server";
import {oddsMatchIndexSelfcheck} from "@/lib/providers/api-football-odds-join";
import {inPlayProviderFailureSelfcheck,targetedInplayProbeSelfcheck} from "@/lib/providers/api-football-inplay";
export const dynamic="force-dynamic";
export function GET(){
 const matches=oddsMatchIndexSelfcheck();
 const provider=inPlayProviderFailureSelfcheck();
 const targeted=targetedInplayProbeSelfcheck();
 const insert=marketQuotePayloadSelfcheck();
 const storage=storageFailureSelfcheck();
 const checks=[...matches.checks.map(x=>({name:x.name,passed:x.pass})),
  ...provider.checks.map(x=>({name:x.name,passed:x.pass})),
  ...targeted.checks.map(x=>({name:x.name,passed:x.pass})),
  ...insert.checks,...storage.checks];
 const passed=checks.every(x=>x.passed);
 return NextResponse.json({model:"veto.inplay-odds-integrity.selfcheck.v1",
  passed,checks,syntheticOnly:true,externalProviderCalls:0,
  bookmakerExecutionVerified:false},{
  status:passed?200:503,
  headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"},
 });
}
