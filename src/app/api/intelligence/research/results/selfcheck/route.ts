import {NextResponse} from "next/server";
import {openLigaSelfcheck} from "@/lib/providers/openligadb-results";
export const dynamic="force-dynamic";
export function GET(){
 const result=openLigaSelfcheck();
 return NextResponse.json({model:"veto.openligadb.readonly.selfcheck.v1",...result},{
  status:result.passed?200:503,headers:{"Cache-Control":"no-store"},
 });
}
