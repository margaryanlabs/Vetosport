import {NextResponse} from "next/server";
import {paperJournalSelfcheck} from "@/lib/paper/paper-ledger";
import {paperFinalVerificationSelfcheck} from "@/lib/paper/paper-verification";
import {strategyValidationSelfcheck} from "@/lib/paper/strategy-validation";
import {autonomousReplaySelfcheck} from "@/lib/paper/autonomous-replay";
import {dailyPaperSelfcheck} from "@/lib/paper/daily-research";
import {oddsScoresSelfcheck} from "@/lib/paper/odds-score-certification";
import {highOddsSelfcheck} from "@/lib/paper/high-odds-research";
export const dynamic="force-dynamic";
export function GET(){
 const journal=paperJournalSelfcheck();
 const finals=paperFinalVerificationSelfcheck();
 const strategies=strategyValidationSelfcheck();
 const autonomous=autonomousReplaySelfcheck();
 const daily=dailyPaperSelfcheck();
 const oddsScores=oddsScoresSelfcheck();
 const highOdds=highOddsSelfcheck();
 const passed=journal.passed&&finals.passed&&strategies.passed&&autonomous.passed&&daily.passed&&oddsScores.passed&&highOdds.passed;
 return NextResponse.json({model:"veto.paper.forward-daily-lab.v5",passed,
  checks:{journal,finals,strategies,autonomous,daily,oddsScores,highOdds},tests:[...journal.tests,...finals.tests,...strategies.checks,...autonomous.tests,...daily.tests,...oddsScores.checks,...highOdds.tests]},
  {status:passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
