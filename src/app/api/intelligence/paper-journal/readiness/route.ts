import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
export const dynamic="force-dynamic";
export const maxDuration=20;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
const check=(x:Promise<unknown>)=>x.then(()=>({state:"OK" as const})).catch((error:unknown)=>{
 const details=error instanceof Error?error.message:"";
 // Server errors can contain sensitive provider/internal information.
 // Only return a fixed, non-sensitive machine-readable failure class.
 const reason=/Resource is not allowed/i.test(details)?"BRIDGE_RESOURCE_DENIED":
 / 401| 403|Unauthorized|JWT/i.test(details)?"STORAGE_AUTH_FAILED":
 /relation|schema|PGRST205|PGRST116|table .*not found/i.test(details)?"TABLE_UNAVAILABLE":
 /timeout|abort/i.test(details)?"STORAGE_TIMEOUT":
 "STORAGE_READ_ERROR";
 return{state:"FAILED" as const,reason};
});
/** Read-only source and schema probe for human-readable failure diagnostics.
 * No secret values, provider fetches, virtual writes, real money or user IDs.
 */
export async function GET(){
 const conf=persistenceConfiguration();
 if(!conf.supabaseConfigured)return NextResponse.json({
  ok:false,reason:"STORAGE_NOT_CONFIGURED",checks:{},
  providerKeys:"NOT_REQUIRED_FOR_STORED_PAPER_VIEW",requiresRealMoney:false},
  {status:503,headers});
 const store=getPersistence();
 const [ordinary,highTickets,ordinaryFinals,highFinals,events,quotes,health]=await Promise.all([
  check(store.listPaperDailyPicks(1)),
  check(store.listHighOddsPaperTickets(1)),
  check(store.listPaperDailySettlements(1)),
  check(store.listHighOddsPaperSettlements(1)),
  check(store.listRecentEvents({
   from:new Date(Date.now()+30*60_000).toISOString(),
   to:new Date(Date.now()+48*3_600_000).toISOString(),
   statuses:["scheduled"],canonicalKeyPrefix:"football::epl::",limit:1,
  })),
  check(store.listRecentQuotesForEvents({eventIds:["00000000-0000-0000-0000-000000000001"],
   provider:"the-odds-api",marketKey:"soccer_epl.h2h",limit:1,
   capturedSince:new Date(Date.now()-4*3_600_000).toISOString()})),
  check(store.listRecentProviderHealth({providerId:"veto-paper-high-odds",limit:1})),
 ]);
 const checks={ordinary,highTickets,ordinaryFinals,highFinals,events,quotes,health};
 const issues=Object.entries(checks).filter(([,result])=>result.state==="FAILED")
  .map(([scope,result])=>({scope,reason:"reason" in result?result.reason:"STORAGE_READ_ERROR"}));
 return NextResponse.json({
  ok:issues.length===0,
  storage:"EXISTING_SERVER_SIDE_BRIDGE",
  sourceCallsThisRequest:0,
  providerKeys:"NOT_REQUIRED_FOR_STORED_PAPER_VIEW",
  checks,issues,
  suggestion:issues.some(x=>x.reason==="BRIDGE_RESOURCE_DENIED")?
   "Server-side bridge allowlist must include four paper tables.":
   issues.some(x=>x.reason==="STORAGE_AUTH_FAILED")?
   "Verify existing VETO storage bridge access, not sports API keys.":
   issues.length?"Inspect paper schema and storage bridge runtime.":
   "Storage ready. A zero paper ledger means scheduled research has not committed real observations.",
  requiresRealMoney:false,
 },{status:issues.length?503:200,headers});
}
