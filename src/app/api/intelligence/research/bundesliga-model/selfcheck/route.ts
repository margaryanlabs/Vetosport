import {NextResponse} from "next/server";
import {openLigaDataSelfcheck} from "@/lib/providers/openligadb";
import {bundesligaPrematchSelfcheck} from "@/lib/research/bundesliga-prematch";
export const dynamic="force-dynamic";
/** A deterministic test with synthetic fixture inputs, no upstream requests. */
export function GET(){
 const adapter=openLigaDataSelfcheck(),model=bundesligaPrematchSelfcheck();
 const passed=adapter.passed&&model.passed;
 return NextResponse.json({modelVersion:"football.bundesliga.team-poisson.v1",
  passed,checks:[...adapter.checks,...model.checks],
  adapterTests:adapter.checks.length,modelTests:model.checks.length,
  externalPublicProviderCalls:0,bookmakerProviderCalls:0,automaticBets:0,
  independentFtCertification:false,independentCalibration:false},
  {status:passed?200:503,headers:{
   "Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
