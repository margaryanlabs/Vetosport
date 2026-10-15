import {captureLagSpectrumSelfcheck} from "@/lib/research/capture-lag-spectrum";
import {NextResponse} from "next/server";
import {evidenceCoverageSelfcheck} from "@/lib/research/evidence-coverage";
export const dynamic="force-dynamic";
export function GET(){
 const result=evidenceCoverageSelfcheck();
 const lag=captureLagSpectrumSelfcheck();
 const checks=[...result.checks,...lag.checks];
 const passed=result.passed&&lag.passed;
 return NextResponse.json({model:"veto.evidence-coverage.selfcheck.v2",...result,passed,checks},
  {status:passed?200:503,headers:{"Cache-Control":"no-store"}});
}