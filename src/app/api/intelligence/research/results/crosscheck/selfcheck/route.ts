import {NextResponse} from "next/server";
import {sourceComparisonSelfcheck} from "@/lib/research/result-corroboration";
export const dynamic="force-dynamic";
export function GET(){
 const r=sourceComparisonSelfcheck();
 return NextResponse.json({model:"veto.cross-source.selfcheck.v1",...r},
  {status:r.passed?200:503,headers:{"Cache-Control":"no-store"}});
}
