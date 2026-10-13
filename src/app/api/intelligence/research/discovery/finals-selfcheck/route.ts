import {NextResponse} from "next/server";
import {finalResultBackfillSelfcheck} from "@/lib/providers/api-football-finals";
export const dynamic="force-dynamic";
export function GET(){
 const result=finalResultBackfillSelfcheck();
 return NextResponse.json({model:"veto.football-finals.selfcheck.v1",...result},
   {status:result.passed?200:503,headers:{"Cache-Control":"no-store"}});
}
