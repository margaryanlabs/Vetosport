import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Live fixture polling failure cannot disappear silently from source health",()=>{
 const route=read("src/app/api/cron/api-football-live/route.ts");
 assert.match(route,/getPersistence\(\)\.appendProviderHealth/);
 assert.match(route,/providerId:"api-football",status:"degraded"/);
 assert.match(route,/metadata:\{failureCode,upstreamAttempted:true,stored:0/);
 assert.match(route,/LIVE_SOURCE_UNAVAILABLE/);
 assert.doesNotMatch(route,/message:error\.message|error:\s*error\.message/);
});
test("Main prediction console explains why actual models and FT are unavailable",()=>{
 const ui=read("src/components/PredictionsConsole.tsx");
 const style=read("src/app/predictions/predictions.css");
 assert.match(ui,/api\/intelligence\/research\/source-health/);
 assert.match(ui,/Почему прогнозы могут отсутствовать/);
 assert.match(ui,/lastRunCode==="UPSTREAM_SUBSCRIPTION"/);
 assert.match(ui,/Это нельзя исправить формулой прогноза/);
 assert.match(style,/predReadinessGrid/);
});
