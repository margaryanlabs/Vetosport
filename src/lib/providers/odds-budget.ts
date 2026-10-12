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
 const withinBudget=valid&&estimatedDailyCredits<=input.dailyBudget;
 const allowed=Boolean(input.enabled&&withinBudget);
 return{
  allowed,enabled:input.enabled,creditsPerRun,estimatedDailyCredits,
  estimatedMonthlyCredits30d:estimatedDailyCredits*30,
  dailyBudget:input.dailyBudget,
  reason:!input.enabled?"CRON_NOT_OPTED_IN":!valid?"MISSING_ALLOWLIST_OR_BUDGET":
    !withinBudget?"EXCEEDS_ESTIMATED_DAILY_BUDGET":"ESTIMATED_BUDGET_ACCEPTED",
  actualChargesNotMeasured:true as const,
 };
}
export function currentOddsBudgetConfig(input:{sportKeys:string[];markets:string[];regions:string[]}){
 const raw=process.env.VETO_ODDS_CRON_MAX_ESTIMATED_DAILY_CREDITS;
 const dailyBudget=raw&&/^\d+$/.test(raw)?Number(raw):0;
 return evaluateOddsBudget({
  ...input,
  enabled:process.env.VETO_ODDS_CRON_ENABLED==="true",
  dailyBudget,
  runsPerDay:288, // Vercel schedule */5 per hour * 24.
 });
}
export function oddsBudgetSelfcheck(){
 const base={sportKeys:["soccer_epl"],markets:["h2h"],regions:["eu"],enabled:true,dailyBudget:300,runsPerDay:288};
 const checks=[
  {name:"Default opt-out blocks polling",pass:!evaluateOddsBudget({...base,enabled:false}).allowed},
  {name:"Missing explicit budget blocks polling",pass:!evaluateOddsBudget({...base,dailyBudget:0}).allowed},
  {name:"One sport x one market forecasts 288 daily",pass:evaluateOddsBudget(base).estimatedDailyCredits===288},
  {name:"Forecast below user budget permits polling",pass:evaluateOddsBudget(base).allowed},
  {name:"Three markets cannot spend above 300 budget",pass:!evaluateOddsBudget({...base,markets:["h2h","totals","spreads"]}).allowed},
  {name:"More regions increase cost",pass:evaluateOddsBudget({...base,regions:["eu","uk"]}).estimatedDailyCredits===576},
  {name:"Empty sport allowlist blocks polling",pass:!evaluateOddsBudget({...base,sportKeys:[]}).allowed},
  {name:"Duplicate allowlist entries do not inflate cost",pass:evaluateOddsBudget({...base,sportKeys:["soccer_epl","soccer_epl"]}).creditsPerRun===1},
  {name:"No negative or non-integer budget accepted",pass:!evaluateOddsBudget({...base,dailyBudget:-1}).allowed&&!evaluateOddsBudget({...base,dailyBudget:1.5}).allowed},
 ];
 return{passed:checks.every(x=>x.pass),checks};
}
