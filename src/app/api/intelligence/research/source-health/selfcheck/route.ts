import {NextResponse} from "next/server";
import {sourceHealthSelfcheck} from "@/lib/research/source-health";
export const dynamic="force-dynamic";
export function GET(){
 const result=sourceHealthSelfcheck();
 return NextResponse.json({model:"veto.source-health.selfcheck.v1",...result},{
  status:result.passed?200:503,headers:{"Cache-Control":"no-store"}
 });
}
