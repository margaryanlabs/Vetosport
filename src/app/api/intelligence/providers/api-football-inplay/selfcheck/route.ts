import {NextResponse} from "next/server";
import {inPlayNormalizerSelfcheck} from "@/lib/providers/api-football-inplay";
export const dynamic="force-dynamic";
export function GET(){
 const report=inPlayNormalizerSelfcheck();
 return NextResponse.json({model:"veto.api-football.inplay.selfcheck.v1",...report},{
   status:report.passed?200:503,headers:{"Cache-Control":"no-store"}
 });
}