import {NextResponse} from "next/server";
import {apiFootballAdapterSelfcheck} from "@/lib/providers/api-football";
export const dynamic="force-dynamic";
export function GET(){
  const report=apiFootballAdapterSelfcheck();
  return NextResponse.json({model:"veto.api-football-adapter.selfcheck.v1",...report},{
    status:report.passed?200:503,headers:{"Cache-Control":"no-store"}
  });
}
