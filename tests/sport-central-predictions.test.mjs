import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Predictions are a first-class section, not a side link only in the lab",()=>{
 const nav=read("src/components/WorkspaceChrome.tsx");
 const today=read("src/components/TodayExperience.tsx");
 const front=read("src/app/predictions/page.tsx");
 assert.match(nav,/href="\/predictions"/);
 assert.match(today,/Главные прогнозы VETO/);
 assert.match(front,/PredictionsConsole/);
});
test("Autonomous discovery to current fixtures never makes uncontrolled model or betting claims",()=>{
 const discovery=read("src/app/api/intelligence/research/discovery/route.ts");
 const engine=read("src/lib/research/hypothesis-live-matches.ts");
 assert.match(discovery,/buildHypothesisLiveMatches/);
 assert.match(discovery,/maxPatterns:200/);
 assert.match(discovery,/quotesCapped=realQuotes.length>=1000/);
 assert.match(engine,/observedPatternKeyFor/);
 assert.match(engine,/p.settled>0/);
 assert.match(engine,/sourceProvider!=="api-football"/);
 assert.match(engine,/executablePriceVerified:false/);
 assert.match(engine,/validatedEdge:false/);
 assert.match(engine,/upstreamAt<stateAt\|\|priceAt<stateAt/);
 assert.match(engine,/quotesCapped/);
 assert.match(engine,/hypothesisLiveMatchesSelfcheck/);
 assert.doesNotMatch(engine,/https:\/\/|fetch\(|placeBet|process\.env/);
});
test("Real model forecast pipeline needs persisted state and verified model provenance",()=>{
 const route=read("src/app/api/intelligence/predictions/shadow/route.ts");
 assert.match(route,/getPersistence/);
 assert.match(route,/at!==Date.parse\(state.capturedAt\)/);
 assert.match(route,/state.sourceProvider==="api-football"/);
 assert.match(route,/state.sourceProvider==="sportmonks-football"/);
 assert.match(route,/matching.providerRefs\?\.\[state.sourceProvider\]/);
 assert.match(route,/signal.mode==="SHADOW"/);
 assert.match(route,/decisionAuthority:false/);
 assert.doesNotMatch(route,/sandboxEventSummaries|Math\.random|api-sports\.io|the-odds-api\.com/);
});
test("Live hypotheses are displayed as unvalidated research, not claimed profitable picks",()=>{
 const client=read("src/components/PredictionsConsole.tsx");
 assert.match(client,/Гипотезы на реальных матчах/);
 assert.match(client,/liveHypotheses/);
 assert.match(client,/Date.parse\(x.observedAt\)<=now/);
 assert.match(client,/не являются вероятностью отдельного матча/);
 assert.match(client,/историческая/i);
 assert.match(client,/quoteReadFailed/);
 assert.match(client,/Нет доступа к источнику/);
});
test("Live matching selfcheck does not call provider or private storage",()=>{
 const endpoint=read("src/app/api/intelligence/research/hypothesis-match/selfcheck/route.ts");
 assert.match(endpoint,/hypothesisLiveMatchesSelfcheck/);
 assert.match(endpoint,/status:result.passed\?200:503/);
 assert.match(endpoint,/externalProviderCalls:0/);
});
