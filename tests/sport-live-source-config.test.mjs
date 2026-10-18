import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Missing Sportmonks production token overrides stale successes with safe actionable state",()=>{
 const x=read("src/lib/research/source-health.ts");
 const r=read("src/app/api/intelligence/research/source-health/route.ts");
 assert.match(x,/SPORTMONKS_NOT_CONFIGURED/);
 assert.match(x,/applySafeSportmonksRuntimeConfiguration/);
 assert.match(x,/sportmonksConfigurationSelfcheck/);
 assert.match(x,/state:"waiting",lastRunCode:"SPORTMONKS_NOT_CONFIGURED"/);
 assert.match(x,/upstreamAttempted:false/);
 assert.match(x,/receivedRecords:null,scannedRecords:null/);
 assert.match(r,/providerConfiguration\(\)\.sportmonks.configured/);
 assert.match(r,/applySafeSportmonksRuntimeConfiguration/);
 assert.match(r,/secretsExposed:false/);
 assert.match(r,/PERSISTED_AND_SAFE_RUNTIME_CONFIG/);
 assert.doesNotMatch(r,/SPORTMONKS_API_TOKEN|process\.env\./);
});
test("Unconfigured five-minute cron records bounded hourly skip without using sports API",()=>{
 const cron=read("src/app/api/cron/live-football-state/route.ts");
 assert.match(cron,/if \(!providers\.sportmonks\.configured \|\| !persistence\.supabaseConfigured\)/);
 assert.match(cron,/SPORTMONKS_NOT_CONFIGURED/);
 assert.match(cron,/Date\.now\(\)-since>=60\*60_000/);
 assert.match(cron,/upstreamAttempted:false/);
 assert.match(cron,/store.appendProviderHealth/);
 assert.match(cron,/externalProviderCalls:0/);
 assert.match(cron,/realMoneyBets:0/);
 assert.match(cron,/return NextResponse\.json/);
 assert.doesNotMatch(cron,/Bearer .+\btoken\b/i);
});
test("Central UI shows exact operator fix for missing token without falsely showing running source",()=>{
 const ui=read("src/components/PredictionsConsole.tsx");
 assert.match(ui,/SPORTMONKS_NOT_CONFIGURED/);
 assert.match(ui,/SPORTMONKS_API_TOKEN/);
 assert.match(ui,/Environment Variables/);
 assert.match(ui,/Production/);
 assert.match(ui,/PERSISTED_AND_SAFE_RUNTIME_CONFIG/);
 assert.match(ui,/secretsExposed===true/);
});
test("Public deterministic configuration selfcheck never calls sports providers",()=>{
 const self=read("src/app/api/intelligence/research/source-configuration/selfcheck/route.ts");
 assert.match(self,/sportmonksConfigurationSelfcheck/);
 assert.match(self,/status:report.passed\?200:503/);
 assert.match(self,/externalProviderCalls:0/);
 assert.match(self,/secretsExposed:false/);
 assert.doesNotMatch(self,/fetch\(|process\.env\./);
});
