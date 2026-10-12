/**
 * Conservative forecast guard for scheduled odds polling.
 * It does not prove the actual provider bill: verify x-requests-last/remaining.
 * Production polling is OFF unless operator explicitly opts in and specifies a budget.
 */
export type OddsBudgetInput={
 sportKeys:string[];
 markets:string[];
 regions:string[];
 enabled:boolean;
 dailyBudget:number;
 runsPerDay:number;
 monthlyBudget?:number;
};
export function evaluateOddsBudget(input:OddsBudgetInput){
 const keys=[...new Set(input.sportKeys.filter(Boolean))];
 const markets=[...new Set(input.markets.filter(Boolean))];
 const regions=[...new Set(input.regions.filter(Boolean))];
 const valid = keys.length>0&&markets.length>0&&regions.length>0&&
   Number.isSafeInteger(input.dailyBudget)&&input.dailyBudget>0&&
   Number.isSafeInteger(input.runsPerDay)&&input.runsPerDay>0;
 const creditsPerRun=keys.length*markets.length*regions.length;
 const estimatedDailyCredits=creditsPerRun*input.runsPerDay;
 const estimatedMonthlyCredits31d=estimatedDailyCredits*31;
 const monthlyBudget=input.monthlyBudget ?? Number.POSITIVE_INFINITY;
 const withinBudget=valid&&estimatedDailyCredits<=input.dailyBudget&&estimatedMonthlyCredits31d<=monthlyBudget;
 const allowed=Boolean(input.enabled&&withinBudget);
 return{
  allowed,enabled:input.enabled,creditsPerRun,estimatedDailyCredits,
  estimatedMonthlyCredits30d:estimatedDailyCredits*30,
  estimatedMonthlyCredits31d,
  monthlyBudget:Number.isFinite(monthlyBudget)?monthlyBudget:null,
  dailyBudget:input.dailyBudget,
  reason:!input.enabled?"CRON_NOT_OPTED_IN":!valid?"MISSING_ALLOWLIST_OR_BUDGET":
    !withinBudget?"EXCEEDS_ESTIMATED_DAILY_BUDGET":"ESTIMATED_BUDGET_ACCEPTED",
  actualChargesNotMeasured:true as const,
 };
}
export function currentOddsBudgetConfig(input:{sportKeys:string[];markets:string[];regions:string[]}){
 const raw=process.env.VETO_ODDS_CRON_MAX_ESTIMATED_DAILY_CREDITS;
 const dailyBudget=raw&&/^\d+$/.test(raw)?Number(raw):0;
 const monthlyRaw=process.env.VETO_ODDS_CRON_MAX_ESTIMATED_MONTHLY_CREDITS;
 const monthlyBudget=monthlyRaw&&/^\d+$/.test(monthlyRaw)?Number(monthlyRaw):0;
 return evaluateOddsBudget({
  ...input,
  enabled:process.env.VETO_ODDS_CRON_ENABLED==="true",
  dailyBudget,
  monthlyBudget,
  runsPerDay:6, // Vercel schedule 0 */4 * * * : 6 polls/day.
 });
}
export function oddsBudgetSelfcheck(){
 const base={sportKeys:["soccer_epl"],markets:["h2h","totals"],regions:["eu"],enabled:true,dailyBudget:12,monthlyBudget:400,runsPerDay:6};
 const checks=[
  {name:"Default opt-out blocks polling",pass:!evaluateOddsBudget({...base,enabled:false}).allowed},
  {name:"Missing explicit budget blocks polling",pass:!evaluateOddsBudget({...base,dailyBudget:0}).allowed},
  {name:"One sport x two markets forecasts 12 daily",pass:evaluateOddsBudget(base).estimatedDailyCredits===12},
  {name:"Forecast below user budget permits polling",pass:evaluateOddsBudget(base).allowed},
  {name:"Three markets exceed explicit daily budget",pass:!evaluateOddsBudget({...base,markets:["h2h","totals","spreads"]}).allowed},
  {name:"More regions increase cost",pass:evaluateOddsBudget({...base,regions:["eu","uk"]}).estimatedDailyCredits===24},
  {name:"Empty sport allowlist blocks polling",pass:!evaluateOddsBudget({...base,sportKeys:[]}).allowed},
  {name:"Duplicate allowlist entries do not inflate cost",pass:evaluateOddsBudget({...base,sportKeys:["soccer_epl","soccer_epl"]}).creditsPerRun===2},
  {name:"No negative or non-integer budget accepted",pass:!evaluateOddsBudget({...base,dailyBudget:-1}).allowed&&!evaluateOddsBudget({...base,dailyBudget:1.5}).allowed},
  {name:"31-day forecast fits monthly free-tier budget",pass:evaluateOddsBudget(base).estimatedMonthlyCredits31d===372},
  {name:"Month cap blocks budget-overrun",pass:!evaluateOddsBudget({...base,monthlyBudget:371}).allowed},
  {name:"Missing explicit monthly budget blocks schedule",pass:!evaluateOddsBudget({...base,monthlyBudget:0}).allowed},
 ];
 return{passed:checks.every(x=>x.pass),checks};
}
