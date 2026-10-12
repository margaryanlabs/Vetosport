import {NextResponse} from "next/server";
import {paperJournalSelfcheck} from "@/lib/paper/paper-ledger";
export const dynamic="force-dynamic";
export function GET(){
 const result=paperJournalSelfcheck();
 return NextResponse.json({model:"veto.paper.verified-manual-accounting.v1",...result},
  {status:result.passed?200:503,headers:{"Cache-Control":"no-store"}});
}
