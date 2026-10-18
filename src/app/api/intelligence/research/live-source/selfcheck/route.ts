import {NextResponse} from "next/server";
import {apiFootballLiveFailureSelfcheck} from "@/lib/providers/api-football";
export const dynamic="force-dynamic";
export function GET(){
 const result=apiFootballLiveFailureSelfcheck();
 return NextResponse.json({...result,model:"veto.api-football.failure.selfcheck.v1",
  providerRequests:0,rawProviderErrorExposed:false},
  {status:result.passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
