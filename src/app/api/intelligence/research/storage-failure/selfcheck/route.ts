import {NextResponse} from "next/server";
import {storageFailureSelfcheck} from "@/lib/persistence/failure-codes";
export const dynamic="force-dynamic";
export function GET(){
 const r=storageFailureSelfcheck();
 return NextResponse.json({model:"veto.storage-failure.selfcheck.v1",...r,
  noProviderQueries:true,noSensitiveDataReturned:true},
  {status:r.passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
