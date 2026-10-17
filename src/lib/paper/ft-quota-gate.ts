import type {ProviderHealthSample} from "@/lib/persistence/contracts";

/** The Odds API /scores?daysFrom=3 consumes 2 credits.
 *
 * Daily FT cron at 07:00 UTC legitimately follows the provider's previous
 * 08:00 odds quote sampling (~23h earlier). A 6h credit-freshness gate would
 * permanently prevent the first real paper settlement even with 442 credits.
 *
 * Fail closed after 30h of unknown spending and require 100 remaining credits
 * at the last certified provider observation. Never call scores when zero
 * previously committed, eligible research fixtures are due.
 */
export const FT_SCORE_COST_CREDITS=2 as const;
export const FT_SCORE_MIN_PROVEN_CREDITS=100 as const;
export const FT_SCORE_QUOTA_MAX_AGE_MS=30*60*60_000;
export const FT_SCORE_REPEAT_COOLDOWN_MS=20*60*60_000;
export const FT_SCORE_CRON_UTC_HOUR=7 as const;

export type FtBudgetDecision={
 allowed:boolean;reason:"OK"|"NO_DUE_PAPER_FIXTURES"|"QUOTA_STATUS_UNAVAILABLE"|
  "QUOTA_PROOF_EXPIRED"|"QUOTA_LOW_OR_INVALID"|"RECENT_SCORES_CALL";
 sourceAgeHours:number|null;
 quotaRemaining:number|null;
 costCredits:typeof FT_SCORE_COST_CREDITS;
 minimumProvenCredits:typeof FT_SCORE_MIN_PROVEN_CREDITS;
};
/** Pure gate: no secrets, time travel, external HTTP, wagers or writes. */
export function assessFtScoreBudget(input:{
 dueFixtures:number;asOf:string;
 quota:ProviderHealthSample|null;
 lastScoresCall:ProviderHealthSample|null;
}):FtBudgetDecision{
 const now=Date.parse(input.asOf);
 const q=input.quota,checked=q?Date.parse(q.checkedAt):NaN;
 const age=now-checked;
 const remaining=q?.quotaRemaining;
 const sourceAgeHours=Number.isFinite(now)&&Number.isFinite(age)&&age>=0?
  Number((age/3_600_000).toFixed(2)):null;
 const make=(reason:FtBudgetDecision["reason"]):FtBudgetDecision=>({
  allowed:reason==="OK",reason,sourceAgeHours,
  quotaRemaining:typeof remaining==="number"&&Number.isSafeInteger(remaining)?
   remaining:null,costCredits:FT_SCORE_COST_CREDITS,
  minimumProvenCredits:FT_SCORE_MIN_PROVEN_CREDITS,
 });
 if(!Number.isFinite(now)||input.dueFixtures<=0)return make("NO_DUE_PAPER_FIXTURES");
 if(!q)return make("QUOTA_STATUS_UNAVAILABLE");
 if(!Number.isFinite(age)||age<0||age>FT_SCORE_QUOTA_MAX_AGE_MS)
  return make("QUOTA_PROOF_EXPIRED");
 if(!Number.isSafeInteger(remaining)||remaining!<FT_SCORE_MIN_PROVEN_CREDITS)
  return make("QUOTA_LOW_OR_INVALID");
 const last=input.lastScoresCall;
 const checkedScores=last?Date.parse(last.checkedAt):NaN;
 const recent=Number.isFinite(checkedScores)&&checkedScores<=now&&
  now-checkedScores<FT_SCORE_REPEAT_COOLDOWN_MS&&
  (last?.metadata?.costCredits===2||last?.metadata?.providerCalls===1);
 if(recent)return make("RECENT_SCORES_CALL");
 return make("OK");
}
export function nextFtScoreCronUtc(asOf:string):string|null{
 const date=new Date(asOf),now=date.getTime();
 if(!Number.isFinite(now))return null;
 date.setUTCHours(FT_SCORE_CRON_UTC_HOUR,0,0,0);
 if(date.getTime()<=now)date.setUTCDate(date.getUTCDate()+1);
 return date.toISOString();
}
export function ftQuotaGateSelfcheck(){
 const asOf="2026-10-18T07:00:00Z";
 const quota:ProviderHealthSample={providerId:"the-odds-api",status:"healthy",
  checkedAt:"2026-10-17T08:00:00Z",quotaRemaining:442};
 const base={dueFixtures:3,asOf,quota,lastScoresCall:null};
 const expected=assessFtScoreBudget(base);
 const checks=[
  {name:"A real 23h-old market credit report can safely fund the daily FT lookup",
   passed:expected.allowed&&expected.sourceAgeHours===23},
  {name:"No paper fixtures, zero paid provider lookup",passed:assessFtScoreBudget({
   ...base,dueFixtures:0}).reason==="NO_DUE_PAPER_FIXTURES"},
  {name:"Fail closed after more than 30 hours of unknown spending",
   passed:assessFtScoreBudget({...base,quota:{...quota,
    checkedAt:"2026-10-16T23:00:00Z"}}).reason==="QUOTA_PROOF_EXPIRED"},
  {name:"Never consume last 100 known credits",passed:assessFtScoreBudget({
   ...base,quota:{...quota,quotaRemaining:99}}).reason==="QUOTA_LOW_OR_INVALID"},
  {name:"Do not repeat paid score checks in the same research window",
   passed:assessFtScoreBudget({...base,lastScoresCall:{
    providerId:"the-odds-api-scores",status:"healthy",
    checkedAt:"2026-10-18T06:00:00Z",metadata:{costCredits:2},
   }}).reason==="RECENT_SCORES_CALL"},
  {name:"Never accept source timestamps in the future",passed:assessFtScoreBudget({
   ...base,quota:{...quota,checkedAt:"2026-10-18T07:01:00Z"}}).reason==="QUOTA_PROOF_EXPIRED"},
  {name:"Invalid remaining quota cannot become paid check",passed:assessFtScoreBudget({
   ...base,quota:{...quota,quotaRemaining:NaN}}).reason==="QUOTA_LOW_OR_INVALID"},
  {name:"Exactly next 07 UTC is shown, not a guessed real provider update",
   passed:nextFtScoreCronUtc("2026-10-17T10:00:00Z")==="2026-10-18T07:00:00.000Z"},
 ];
 return{passed:checks.every(c=>c.passed),checks};
}
