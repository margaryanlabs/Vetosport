import {NextResponse} from "next/server";
import {observedScoreHistorySelfcheck} from "@/lib/live/score-observations";
export const dynamic="force-dynamic";
export function GET(){
 const result=observedScoreHistorySelfcheck();
 return NextResponse.json({model:"veto.match-studio.score-history.selfcheck.v1",...result},{
  status:result.passed?200:503,headers:{"Cache-Control":"no-store"}
 });
}
