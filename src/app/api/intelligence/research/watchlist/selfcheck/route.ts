import {NextResponse} from "next/server";
import {researchWatchlistSelfcheck} from "@/lib/research/watchlist/engine";

export const dynamic = "force-dynamic";
export function GET(){
 const result=researchWatchlistSelfcheck();
 return NextResponse.json({model:"veto.zero-s.watchlist.selfcheck.v1",...result},{
  status:result.passed?200:503,
  headers:{"Cache-Control":"no-store"}
 });
}
