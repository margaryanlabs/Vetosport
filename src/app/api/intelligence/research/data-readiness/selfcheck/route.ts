import {NextResponse} from "next/server";
import {evidenceCoverageSelfcheck} from "@/lib/research/evidence-coverage";
export const dynamic="force-dynamic";
export function GET(){
 const result=evidenceCoverageSelfcheck();
 return NextResponse.json({model:"veto.evidence-coverage.selfcheck.v1",...result},
  {status:result.passed?200:503,headers:{"Cache-Control":"no-store"}});
}