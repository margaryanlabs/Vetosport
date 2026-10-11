import { NextResponse } from "next/server";
import { runStatsBombReplaySelfcheck } from "@/lib/research/replay/statsbomb-selfcheck";
export function GET(){
 const report=runStatsBombReplaySelfcheck();
 return NextResponse.json({source:"StatsBomb-style synthetic period events for invariants",...report,
  productionDecisionAuthorized:false}, {status:report.passed?200:500,headers:{"Cache-Control":"no-store"}});
}
