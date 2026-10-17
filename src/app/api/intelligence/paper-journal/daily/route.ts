import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {accountFromPaper,DAILY_PROTOCOL} from "@/lib/paper/daily-research";
import {assessFtScoreBudget,nextFtScoreCronUtc} from "@/lib/paper/ft-quota-gate";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex"};
export async function GET(){
 if(!persistenceConfiguration().supabaseConfigured)return NextResponse.json({
  ok:false,source:"NO_PAPER_STORAGE",reason:"SPORT_PERSISTENCE_DISABLED",
  noFabricatedReturns:true},{status:503,headers});
 try{
  const store=getPersistence();
  const [picks,settlements,health,finalsHealth,shadowHealth,oddsScoresHealth,oddsQuoteHealth]=await Promise.all([
   store.listPaperDailyPicks(900),
   store.listPaperDailySettlements(900),
   store.listRecentProviderHealth({providerId:"veto-paper-forward",limit:1}),
   store.listRecentProviderHealth({providerId:"api-football-finals",limit:1}),
   store.listRecentProviderHealth({providerId:"veto-shadow-football",limit:1}),
   store.listRecentProviderHealth({providerId:"the-odds-api-scores",limit:1}),
   store.listRecentProviderHealth({providerId:"the-odds-api",limit:1}),
  ]);
  const account=accountFromPaper(picks,settlements);
  const lastHeartbeat=health[0]?.checkedAt??null;
  const asOf=new Date().toISOString(),now=Date.parse(asOf);
  const settledSet=new Set(settlements.map(s=>s.pickId));
  const unresolved=picks.filter(p=>!settledSet.has(p.id));
  const requireFt=unresolved.filter(p=>p.lane==="PREMATCH_ODDS_CONTROL");
  const readyByKickoff=requireFt.filter(p=>{
   const kickoff=Date.parse(p.eventStartsAt);
   return Number.isFinite(kickoff)&&now>=kickoff+120*60_000&&
    now-kickoff<=3*86_400_000;
  });
  const ftBudget=assessFtScoreBudget({dueFixtures:readyByKickoff.length,asOf,
   quota:oddsQuoteHealth[0]??null,lastScoresCall:oddsScoresHealth[0]??null});
  const blockedBy=health[0]?.metadata?.blockedBy;
  const safelyBlocked=blockedBy&&typeof blockedBy==="object"&&!Array.isArray(blockedBy)?
    Object.fromEntries(Object.entries(blockedBy).filter(([key,val])=>
      /^[A-Z_]{5,52}$/.test(key)&&typeof val==="number"&&Number.isSafeInteger(val)&&val>=0)):{};
  return NextResponse.json({ok:true,source:"SERVER_PERSISTED_FORWARD_ONLY",
   generatedAt:new Date().toISOString(),account,
   scheduler:{configuredInRepo:true,lastHeartbeat,blockedBy:safelyBlocked,
    health:lastHeartbeat&&(Date.now()-Date.parse(lastHeartbeat)<90*60_000)?"OBSERVED_RECENTLY":"NOT_RECENTLY_OBSERVED",
    note:"Dedicated authorized paper-research cron captures real prospective observations. A heartbeat proves a run, not a winning result; no picks are invented without source evidence."},
   sourceHealth:{
    oddsScores:{lastCheckedAt:oddsScoresHealth[0]?.checkedAt??null,
     healthy:oddsScoresHealth[0]?.status==="healthy"},
    ftQueue:{openPrematchPicks:requireFt.length,dueAfterTwoHours:readyByKickoff.length,
     nextPlannedScoresCheckUtc:nextFtScoreCronUtc(asOf),
     quotaStatus:ftBudget.reason,canRequestIfScheduledNow:ftBudget.allowed,
     lastProvenQuotaRemaining:ftBudget.quotaRemaining,
     quotaProofAgeHours:ftBudget.sourceAgeHours,
     minimumProtectedQuota:ftBudget.minimumProvenCredits,
     nominalScoreCreditsPerSuccessfulCall:ftBudget.costCredits,
     externalRequestsForThisRead:0},
    ftProvider:{status:finalsHealth[0]?.status??"unknown",lastCheckedAt:finalsHealth[0]?.checkedAt??null,
     subscriptionBlocked:finalsHealth[0]?.metadata?.failureCode==="UPSTREAM_SUBSCRIPTION"},
    model:{recentlyProduced:shadowHealth[0]?Date.now()-Date.parse(shadowHealth[0].checkedAt)<24*60*60_000:false,
     lastRecordedAt:shadowHealth[0]?.checkedAt??null},
   },
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
