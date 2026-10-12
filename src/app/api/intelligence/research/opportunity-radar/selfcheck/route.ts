import {NextResponse} from "next/server";
import {radarSelfcheck} from "@/lib/research/opportunity-radar";
import {oddsMatchIndexSelfcheck} from "@/lib/providers/api-football-odds-join";
export const dynamic="force-dynamic";
export function GET(){
 const radar=radarSelfcheck();
 const matching=oddsMatchIndexSelfcheck();
 const passed=radar.passed&&matching.passed;
 return NextResponse.json({model:"veto.source-truth-radar.selfcheck.v1",passed,
  suites:[{name:"research-only radar",...radar},{name:"exact-match joins",...matching}]},
  {status:passed?200:503,headers:{"Cache-Control":"no-store"}});
}
