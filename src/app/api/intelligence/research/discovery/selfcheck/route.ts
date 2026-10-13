import {NextResponse} from "next/server";
import {observedPatternDiscoverySelfcheck} from "@/lib/research/auto-discovery";
export const dynamic="force-dynamic";
export function GET(){
  const result=observedPatternDiscoverySelfcheck();
  return NextResponse.json({model:"veto.pattern-discovery.selfcheck.v1",...result},
    {status:result.passed?200:503,headers:{"Cache-Control":"no-store"}});
}