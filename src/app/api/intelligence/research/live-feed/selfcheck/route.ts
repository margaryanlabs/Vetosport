import {NextResponse} from "next/server";
import {liveFeedPrioritySelfcheck} from "@/lib/live/feed-priority";
import {observedFreshnessSelfcheck} from "@/lib/live/freshness";
export const dynamic="force-dynamic";
export function GET(){
 const prioritization=liveFeedPrioritySelfcheck();
 const truth=observedFreshnessSelfcheck();
 const passed=prioritization.passed&&truth.passed;
 return NextResponse.json({
  model:"veto.live-feed-priority.selfcheck.v1",passed,
  checks:[...prioritization.checks,...truth.tests.map(x=>({name:x.name,passed:x.pass}))],
  syntheticOnly:true,externalProviderCalls:0,
 },{status:passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
