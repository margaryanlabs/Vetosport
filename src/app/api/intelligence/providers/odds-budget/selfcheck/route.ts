import {NextResponse} from "next/server";
import {oddsBudgetSelfcheck} from "@/lib/providers/odds-budget";
export const dynamic="force-dynamic";
export function GET(){
 const result=oddsBudgetSelfcheck();
 return NextResponse.json({model:"veto.provider-odds-budget.selfcheck.v1",...result},{
  status:result.passed?200:503,headers:{"Cache-Control":"no-store"}
 });
}
