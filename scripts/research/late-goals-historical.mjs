#!/usr/bin/env node
/**
 * Project ZERO-S historical football late-goal frequency check.
 *
 * Inputs (download separately, subject to original dataset licence):
 * AndrewKinsman/Football-Goal-Time-Analysis minutes.csv + results.csv.
 *
 * node scripts/research/late-goals-historical.mjs minutes.csv results.csv
 *
 * Time conventions: "minute 80" means all goals logged in minute 80
 * have ALREADY happened. All goals >= 90 are recorded as 90; we cannot
 * recover exact stoppage timestamps. Outcomes are NOT betting results.
 */
import { readFileSync } from "node:fs";
const [goalsPath, resultsPath] = process.argv.slice(2);
if (!goalsPath || !resultsPath) {
  console.error("Usage: node scripts/research/late-goals-historical.mjs minutes.csv results.csv");
  process.exit(1);
}
const lines = (path) => readFileSync(path, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const fixtureKey = (date, home, away) => date + "|" + [home, away].sort().join("|");
const fixtures = new Map();
const duplicateKeys = new Set();
for (const row of lines(resultsPath).slice(1)) {
  const [home, away, homeGoals, awayGoals, date] = row.split(",");
  const key = fixtureKey(date, home, away);
  if (fixtures.has(key)) duplicateKeys.add(key);
  else fixtures.set(key, { home, away, homeGoals: Number(homeGoals), awayGoals: Number(awayGoals), date, goalEvents: [] });
}
let orphanGoalEvents = 0;
for (const row of lines(goalsPath).slice(1)) {
  const [conceder, date, minuteText, scorer] = row.split(",");
  const fixture = fixtures.get(fixtureKey(date, conceder, scorer));
  if (!fixture) { orphanGoalEvents++; continue; }
  fixture.goalEvents.push({ scorer, minute: Number(minuteText) });
}
const valid = [...fixtures.entries()].filter(([key, fixture]) => {
  if (duplicateKeys.has(key)) return false;
  if (fixture.goalEvents.some(g => !Number.isFinite(g.minute) || g.minute < 0 || g.minute > 90)) return false;
  return fixture.goalEvents.filter(g => g.scorer === fixture.home).length === fixture.homeGoals &&
    fixture.goalEvents.filter(g => g.scorer === fixture.away).length === fixture.awayGoals;
}).map(([, fixture]) => fixture);
const wilson = (hits, n) => {
  if (!n) return [null, null];
  const p = hits / n, z = 1.95996398454, denom = 1 + z*z/n;
  const center = (p + z*z/(2*n)) / denom;
  const radius = z*Math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / denom;
  return [center-radius, center+radius];
};
const observations = valid.flatMap(fixture => [77,80,83,85].flatMap(minute => {
  const home = fixture.goalEvents.filter(e => e.minute <= minute && e.scorer === fixture.home).length;
  const away = fixture.goalEvents.filter(e => e.minute <= minute && e.scorer === fixture.away).length;
  if (home !== 1 || away !== 1) return [];
  const remaining = fixture.goalEvents.filter(e => e.minute > minute).length;
  const year = Number(fixture.date.slice(0,4));
  const month = Number(fixture.date.slice(5,7));
  const earlierGoals = fixture.goalEvents.filter(e => e.minute <= minute);
  const lastGoalMinute = Math.max(...earlierGoals.map(e => e.minute));
  return [{ minute, remaining, lastGoalMinute, season: month < 7 ? year-1 : year }];
}));
const stats = (subset) => {
  const n = subset.length, twoPlus = subset.filter(r => r.remaining >= 2).length;
  const threePlus = subset.filter(r => r.remaining >= 3).length;
  const fourPlus = subset.filter(r => r.remaining >= 4).length;
  return { n, twoPlus, threePlus, fourPlus,
    probabilityTwoPlus: n ? twoPlus/n : null,
    under45: n ? {wins:n-threePlus, losses:threePlus, successRate:(n-threePlus)/n, wilson95ForWin:wilson(n-threePlus,n)} : null,
    under55: n ? {wins:n-fourPlus, losses:fourPlus, successRate:(n-fourPlus)/n, wilson95ForWin:wilson(n-fourPlus,n)} : null,
    wilson95: wilson(twoPlus, n),
    successProbabilityUnder35: n ? 1-twoPlus/n : null };
};
const byMinute = Object.fromEntries([77,80,83,85].map(m => [m, stats(observations.filter(r => r.minute === m))]));
const bySeason = Object.fromEntries([2012,2013,2014].map(s => [s, stats(observations.filter(r => r.minute === 80 && r.season === s))]));
const minute80 = observations.filter(row=>row.minute===80);
const cascadeHypothesis = {
  lastGoalMinutes76To80: stats(minute80.filter(row=>row.lastGoalMinute>=76)),
  lastGoalBefore76: stats(minute80.filter(row=>row.lastGoalMinute<76)),
  warning: "Exploratory association only; not a causal cascade effect, no bookmaker odds and no modern football calibration"
};
const holdout2024 = (() => {
  // Forward validation: train on 2012 and 2013 seasonal starts; test strictly
  // on the unseen 2014 season. One observation per match at minute 80.
  const train = observations.filter(x=>x.minute===80&&x.season<=2013);
  const test = observations.filter(x=>x.minute===80&&x.season===2014);
  if(!train.length||!test.length)return {status:"INSUFFICIENT_ROWS"};
  const trainTailCount=train.filter(x=>x.remaining>=2).length;
  const testTailCount=test.filter(x=>x.remaining>=2).length;
  // Jeffreys Beta(0.5,0.5) smoothing avoids 0/1 forecast probabilities.
  const probabilityTwoPlus=(trainTailCount+.5)/(train.length+1);
  const brier=test.reduce((sum,row)=>{
    const y=Number(row.remaining>=2);
    return sum+(probabilityTwoPlus-y)**2;
  },0)/test.length;
  const logLoss=test.reduce((sum,row)=>{
    const y=Number(row.remaining>=2);
    return sum-(y*Math.log(probabilityTwoPlus)+(1-y)*Math.log1p(-probabilityTwoPlus));
  },0)/test.length;
  return {
    status:"OUT_OF_TIME_RESEARCH_BASELINE_NOT_A_BETTING_MODEL",
    trainSeasons:[2012,2013],testSeason:2014,
    trainN:train.length,trainRareEvents:trainTailCount,
    predictedRareEventProbability:probabilityTwoPlus,
    testN:test.length,testRareEvents:testTailCount,
    realizedRareEventRate:testTailCount/test.length,
    brier,logLoss,
    validation:"One observation per match at minute 80, no lookahead into 2014, not a full competition adjustment.",
    warning:"Old sample and 2014 regime drift invalidate use as modern 2026 price advantage."
  };
})();
const p80 = byMinute[80].successProbabilityUnder35;
console.log(JSON.stringify({
  source: "AndrewKinsman/Football-Goal-Time-Analysis (2012-2015)",
  sourceFixtures: fixtures.size,
  validFixtures: valid.length,
  excludedFixtures: fixtures.size-valid.length,
  orphanGoalEvents,
  convention: "Conditioned on completed minute; goals labeled 90 include stoppage time with no precise clock",
  byMinute, bySeason, cascadeHypothesis, holdout2024,
  illustrativeConstantOdds: {
    odds: 1.05, breakEvenSuccess: 1/1.05,
    hypotheticalExpectedReturnPer200: p80 === null ? null : 200*(1.05*p80-1),
    NOT_A_BACKTEST: "No historical executable odds or fee/slippage data; NOT real betting ROI"
  }
}, null, 2));
