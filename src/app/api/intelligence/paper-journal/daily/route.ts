import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {accountFromPaper,DAILY_PROTOCOL} from "@/lib/paper/daily-research";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex"};
export async function GET(){
 if(!persistenceConfiguration().supabaseConfigured)return NextResponse.json({
  ok:false,source:"NO_PAPER_STORAGE",reason:"SPORT_PERSISTENCE_DISABLED",
  noFabricatedReturns:true},{status:503,headers});
 try{
  const store=getPersistence();
  const [picks,settlements,health]=await Promise.all([
   store.listPaperDailyPicks(900),
   store.listPaperDailySettlements(900),
   store.listRecentProviderHealth({providerId:"veto-paper-forward",limit:1}),
  ]);
  const account=accountFromPaper(picks,settlements);
  const lastHeartbeat=health[0]?.checkedAt??null;
  return NextResponse.json({ok:true,source:"SERVER_PERSISTED_FORWARD_ONLY",
   generatedAt:new Date().toISOString(),account,
   scheduler:{configuredInRepo:true,lastHeartbeat,
    health:lastHeartbeat&&(Date.now()-Date.parse(lastHeartbeat)<90*60_000)?"OBSERVED_RECENTLY":"NOT_RECENTLY_OBSERVED",
    note:"Existing shadow-football cron can run paper observation. No picks are invented on days with insufficient evidence."},
   coverage:{historyLimit:900,historyMayBeCapped:picks.length>=900||settlements.length>=900,
    providerCalls:0,realBetsPlaced:0,prospectiveProfitabilityProven:false,
    caveat:"Shared VETO research account; not a private user wallet or actual money."},
  },{headers});
 }catch{
  return NextResponse.json({ok:false,source:"NO_PAPER_STORAGE",
   reason:"TABLE_NOT_READY_OR_READ_FAILED",noFabricatedReturns:true},
   {status:503,headers});
 }
}
