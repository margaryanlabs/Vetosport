import {NextResponse} from "next/server";
import {paperJournalSelfcheck} from "@/lib/paper/paper-ledger";
import {paperFinalVerificationSelfcheck} from "@/lib/paper/paper-verification";
import {strategyValidationSelfcheck} from "@/lib/paper/strategy-validation";
import {autonomousReplaySelfcheck} from "@/lib/paper/autonomous-replay";
export const dynamic="force-dynamic";
export function GET(){
 const journal=paperJournalSelfcheck();
 const finals=paperFinalVerificationSelfcheck();
 const strategies=strategyValidationSelfcheck();
 const autonomous=autonomousReplaySelfcheck();
 const passed=journal.passed&&finals.passed&&strategies.passed&&autonomous.passed;
 return NextResponse.json({model:"veto.paper.autonomous-replay.v4",passed,
  checks:{journal,finals,strategies,autonomous},tests:[...journal.tests,...finals.tests,...strategies.checks,...autonomous.tests]},
  {status:passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
