import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Real source-only shadow model forecasts do not need bookmaker quotes or fake team features",()=>{
 const model=read("src/lib/live/score-only-shadow.ts");
 assert.match(model,/SCORE_ONLY_MODEL_VERSION="football.score-clock-prior.v1"/);
 assert.match(model,/SCORE_ONLY_PRIOR=\{home:1\.35,away:1\.15\}/);
 assert.match(model,/state.sourceProvider!=="api-football"/);
 assert.match(model,/state\.state\.source!=="api-football\.fixtures\.live"/);
 assert.match(model,/String\(stateId\)!==providerRef/);
 assert.match(model,/now-observed>MAX_STATE_AGE_MS/);
 assert.match(model,/observedScore\.minute>89/);
 assert.match(model,/buildFootballProbabilitySurface/);
 assert.match(model,/bookmakerPriceVerified:false/);
 assert.match(model,/quoteFeaturesUsed:false/);
 assert.match(model,/uncertainty:1/);
 assert.match(model,/decisionWrites:0/);
 assert.match(model,/scoreOnlyShadowSelfcheck/);
 assert.doesNotMatch(model,/https:\/\/|Math\.random\(|THE_ODDS_API_KEY|API_FOOTBALL_KEY|placeBet/);
});
test("Existing aligned-quote research remains available, while score-only shadow now writes forward snapshots",()=>{
 const cron=read("src/app/api/cron/shadow-football/route.ts");
 const engine=read("src/lib/live/score-only-shadow.ts");
 assert.match(cron,/runScoreOnlyShadowPrediction/);
 assert.match(cron,/runFootballShadowPrediction/);
 assert.match(cron,/scoreOnlyPredictionsPersisted/);
 assert.match(cron,/veto-shadow-score-only/);
 assert.match(cron,/externalProviderCalls:0/);
 assert.match(cron,/noOldUnverifiedLiveMatches:true/);
 assert.match(engine,/findFeatureSnapshot/);
 assert.match(engine,/appendFeatureSnapshot/);
 assert.match(engine,/appendPrediction/);
 assert.match(engine,/FINISHED_CERTIFICATE_PRESENT/);
 assert.match(engine,/SNAPSHOT_ALREADY_WRITTEN/);
});
test("Prediction cards display fixed assumptions, source-only uncertainty and no fake bookie price",()=>{
 const api=read("src/app/api/intelligence/predictions/shadow/route.ts");
 const page=read("src/components/PredictionsConsole.tsx");
 const source=read("src/lib/research/source-health.ts");
 assert.match(api,/SCORE_ONLY_MODEL_VERSION/);
 assert.match(api,/FIXED_UNCALIBRATED_GOAL_PRIORS/);
 assert.match(api,/bookmakerQuoteRequired/);
 assert.match(api,/independentCalibrationVerified:false/);
 assert.match(page,/1,35 \/ 1,15 гола на матч/);
 assert.match(page,/Котировка и прибыльность не подтверждены/);
 assert.match(page,/не проверенную силу конкретных команд/);
 assert.match(source,/veto-shadow-score-only/);
 assert.match(source,/noModelSamples/);
 assert.match(source,/source-only shadow оценки/);
});
test("Deterministic source-only selfcheck exposes no external provider or trade permissions",()=>{
 const api=read("src/app/api/intelligence/predictions/shadow-score/selfcheck/route.ts");
 assert.match(api,/scoreOnlyShadowSelfcheck/);
 assert.match(api,/status:report.passed\?200:503/);
 assert.match(api,/externalProviderCalls:0/);
 assert.match(api,/automaticBettingEnabled:false/);
});
