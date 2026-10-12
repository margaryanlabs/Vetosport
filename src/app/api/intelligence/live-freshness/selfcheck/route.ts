import {NextResponse} from "next/server";
import {observedFreshnessSelfcheck} from "@/lib/live/freshness";
export const dynamic="force-dynamic";
export function GET(){
 const result=observedFreshnessSelfcheck();
 return NextResponse.json({model:"veto.sport.observed-freshness.v1",...result},{
  status:result.passed?200:503,headers:{"Cache-Control":"no-store"}
 });
}
