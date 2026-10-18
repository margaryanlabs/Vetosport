import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Live upstream error categories stay explicit but private",()=>{
 const provider=read("src/lib/providers/api-football.ts");
 const cron=read("src/app/api/cron/api-football-live/route.ts");
 const health=read("src/lib/research/source-health.ts");
 assert.match(provider,/classifyApiFootballLiveFailure/);
 assert.match(provider,/UPSTREAM_SUBSCRIPTION/);
 assert.match(provider,/UPSTREAM_DAILY_QUOTA/);
 assert.match(provider,/UPSTREAM_MINUTE_QUOTA/);
 assert.match(provider,/UPSTREAM_AUTH/);
 assert.match(provider,/UPSTREAM_TIMEOUT/);
 assert.match(provider,/try\{failureBody=await response.json\(\);\}catch/);
 assert.match(provider,/apiFootballLiveFailureSelfcheck/);
 assert.match(cron,/safeCodes.has\(message\)\?message/);
 assert.match(cron,/getPersistence\(\)\.appendProviderHealth/);
 assert.match(cron,/providerId:"api-football",status:"degraded"/);
 assert.match(cron,/metadata:\{failureCode,upstreamAttempted:true,stored:0/);
 assert.match(health,/"UPSTREAM_TIMEOUT"/);
 assert.doesNotMatch(cron,/error:error\.message|response\.text\(\)/);
});
test("Live-source failure selfcheck never polls public or private sporting APIs",()=>{
 const file=read("src/app/api/intelligence/research/live-source/selfcheck/route.ts");
 assert.match(file,/apiFootballLiveFailureSelfcheck/);
 assert.match(file,/providerRequests:0/);
 assert.match(file,/rawProviderErrorExposed:false/);
});
