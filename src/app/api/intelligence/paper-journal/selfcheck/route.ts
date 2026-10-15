import {NextResponse} from "next/server";
import {paperJournalSelfcheck} from "@/lib/paper/paper-ledger";
import {paperFinalVerificationSelfcheck} from "@/lib/paper/paper-verification";
export const dynamic="force-dynamic";
export function GET(){
 const journal=paperJournalSelfcheck();
 const finals=paperFinalVerificationSelfcheck();
 const passed=journal.passed&&finals.passed;
 return NextResponse.json({model:"veto.paper.verified-ft-reconciliation.v2",passed,
  checks:{journal,finals},tests:[...journal.tests,...finals.tests]},
  {status:passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
