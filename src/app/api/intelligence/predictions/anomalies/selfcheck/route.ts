import {NextResponse} from "next/server";
import {priceDispersionSelfcheck} from "@/lib/research/price-dispersion";
export const dynamic="force-dynamic";
export function GET(){
 const report=priceDispersionSelfcheck();
 return NextResponse.json({...report,automaticBettingEnabled:false,externalProviderCalls:0},
  {status:report.passed?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
