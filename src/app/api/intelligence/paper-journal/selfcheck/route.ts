import {NextResponse} from "next/server";
import {paperJournalSelfcheck} from "@/lib/paper/paper-ledger";
import {paperFinalVerificationSelfcheck} from "@/lib/paper/paper-verification";
import {strategyValidationSelfcheck} from "@/lib/paper/strategy-validation";
export const dynamic="force-dynamic";
export function GET(){
 const journal=paperJournalSelfcheck();
 const finals=paperFinalVerificationSelfcheck();
 const strategies=strategyValidationSelfcheck();
 const passed=journal.passed&&finals.passed&&strategies.passed;
 return NextResponse.json({model:"veto.paper.strategy-validation.v3",passed,
  checks:{journal,finals,strategies},tests:[...journal.tests,...finals.tests,...strategies.checks]},
  {status:passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
