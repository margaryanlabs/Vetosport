import { evaluateLateTail, poissonCdf } from "./engine";

export function runLateTailSelfcheck() {
  const checks: Array<{ name: string; passed: boolean }> = [];
  const base = {
    elapsedMinutes: 80, scoreHome: 1, scoreAway: 1,
    underLine: 3.5, decimalOdds: 1.05,
    hypotheticalStake: 200, baselineGoalRatePerMinute: .025,
  };
  const add = (name: string, passed: boolean) => checks.push({ name, passed });
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-10;
  add("Poisson identity", near(poissonCdf(.4, 1), Math.exp(-.4) * 1.4));
  add("Impossible already-lost Under", poissonCdf(.1, -1) === 0);
  const result = evaluateLateTail(base);
  add("Two more goals needed to lose Under 3.5 at 1-1", result.goalsToLoseUnder === 2);
  add("Win pays 10 on a 200 notional at 1.05", near(result.hypotheticalProfitOnWin, 10));
  add("Weights sum to one", near(result.scenarios.reduce((sum, row) => sum + row.weight, 0), 1));
  add("Scenario range contains mixture", result.scenarioUnderRange.low <= result.probabilityUnder && result.probabilityUnder <= result.scenarioUnderRange.high);
  const late = evaluateLateTail({ ...base, elapsedMinutes: 94 });
  add("After 90: still has time to finish", late.scenarios.length > 0 && late.scenarios.every(s => s.remainingMinutes > 0));
  add("No automatic bet approval", result.verdict === "PASS_RESEARCH_ONLY" && late.verdict === "PASS_RESEARCH_ONLY");
  let invalid = false;
  try { evaluateLateTail({ ...base, underLine: 3 }); } catch { invalid = true; }
  add("Rejects incorrect push semantics", invalid);
  let expired = false;
  try { evaluateLateTail({ ...base, elapsedMinutes: 106 }); } catch { expired = true; }
  add("Rejects empty late-duration support", expired);
  return { passed: checks.every(x => x.passed), checks };
}
