import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
const read=(x)=>readFileSync(new URL("../"+x,import.meta.url),"utf8");
const terminal=read("src/components/Terminal.tsx");
const today=read("src/components/TodayExperience.tsx");
const observed=read("src/components/ObservedEventRoom.tsx");
const passport=read("src/components/DecisionPassport.tsx");
const plans=read("src/app/plans/page.tsx");
test("The home screen starts without fabricated sports events",()=>{
 assert.match(terminal,/useState<LiveEventSummary\[\]>\(\[\]\)/);
 assert.match(terminal,/useState\(false\)/);
 assert.match(terminal,/demoEnabled \? sandboxEventSummaries : \[\]/);
 assert.match(today,/РЕАЛЬНЫЕ МАТЧИ НЕ ПОДТВЕРЖДЕНЫ/);
 assert.match(today,/onToggleDemo/);
});
test("Real observations never silently fall back to simulated MatchRoom",()=>{
 assert.match(terminal,/activeSummary\?\.source === "persisted" \?/);
 assert.match(terminal,/Не подменяем выбранный матч демонстрационными прогнозами/);
 assert.match(terminal,/Архив реального матча не заменяется данными симуляции/);
});
test("Observed matches have an explicit evidence passport",()=>{
 assert.match(observed,/DecisionPassport observation=\{observation\}/);
 assert.match(passport,/Цепочка доказательств/);
 assert.match(passport,/Независимая вероятность/);
 assert.match(passport,/Исполнимость коэффициента/);
 assert.match(passport,/status==="PASS"\?"Нет актуальной основы/);
 assert.match(passport,/ПОДТВЕРЖДЁННЫЙ EDGE/);
});
test("Commercial plans do not suggest working paid checkout",()=>{
 assert.match(plans,/Платные тарифы и списания не запущены/);
 assert.match(plans,/Платный доступ ещё не открыт/);
 assert.match(plans,/ДОСТУПЕН/);
 assert.doesNotMatch(plans,/checkout|createPayment|stripe\.checkout/i);
});
test("The discovery research journey is available",()=>{
 assert.match(today,/href="\/research\/discovery"/);
 assert.match(passport,/href="\/research\/discovery"/);
 assert.match(terminal,/vetoDiscoveryLanding/);
});

test("Deep-linked real fixtures remain selected and show genuine source loading/errors",()=>{
 assert.match(terminal,/current === initialEventId/);
 assert.match(terminal,/setWorkspaceStatus\("loading"\)/);
 assert.match(terminal,/setWorkspaceStatus\("error"\)/);
 assert.match(terminal,/Проверяем выбранный матч/);
 assert.match(terminal,/Реальные данные матча временно недоступны/);
 assert.match(terminal,/Читаем подтверждённую историю/);
});

test("Evidence coverage has certified FT gate, timestamp alignment and no betting promotion",()=>{
 const readiness=read("src/lib/research/evidence-coverage.ts");
 const route=read("src/app/api/intelligence/research/data-readiness/route.ts");
 const discovery=read("src/lib/research/auto-discovery.ts");
 const page=read("src/app/research/discovery/page.tsx");
 assert.match(readiness,/api-football\.fixtures\.results/);
 assert.match(readiness,/regulationTimeOnly===true/);
 assert.match(readiness,/freshScoreAndPriceEvents/);
 assert.match(readiness,/researchReadyForRealMoney:false/);
 assert.match(discovery,/certifiedRegulationFinal\(row,event\)/);
 assert.match(route,/sampleMayBeCapped/);
 assert.doesNotMatch(route,/v3\.football\.api-sports\.io|the-odds-api\.com/);
 assert.match(page,/Что мешает доказать преимущество/);
 assert.match(page,/Отложенная ретроспективная часть/);
});

test("Discovery covers bounded week-old certified results without provider requests",()=>{
 const route=read("src/app/api/intelligence/research/discovery/route.ts");
 const engine=read("src/lib/research/auto-discovery.ts");
 assert.match(route,/lookbackHours:168/);
 assert.match(route,/historicalRangeDays:7/);
 assert.match(route,/statuses:\["finished"\]/);
 assert.match(route,/maxArchived=220/);
 assert.match(route,/statesCapped/);
 assert.match(route,/externalProviderCalls:0/);
 assert.match(engine,/Certified 6-day-old historical result/);
 assert.match(engine,/Observations older than the seven-day boundary/);
});

test("Final-score ingestion spends no additional provider calls and cannot settle guesses",()=>{
 const cron=read("src/app/api/cron/api-football-finals/route.ts");
 const candidates=read("src/lib/providers/api-football-finals.ts");
 assert.match(cron,/fixtures\?ids=/);
 assert.doesNotMatch(cron,/fixtures\?date=/);
 assert.match(cron,/statuses:\["live"\]/);
 assert.match(cron,/rotationIndex/);
 assert.match(cron,/source:"api-football\.fixtures\.results"/);
 assert.match(cron,/regulationTimeOnly:true/);
 assert.match(cron,/MAXIMUM_NONEXISTENT_NOT_ALLOWED|if\(!selectedIds\)/);
 assert.match(cron,/selectedFixtureCount:selectedIds/);
 const certificate=cron.indexOf("await store.appendEventState");
 const journal=cron.indexOf("await store.appendTruthJournal");
 const finish=cron.indexOf("await store.upsertEvent");
 assert.ok(certificate>=0 && certificate<journal && journal<finish,
  "Certificate and audit trail must precede final event-status write");
 assert.match(candidates,/minimumKickoffAgeMinutes\?\?100/);
 assert.match(candidates,/Math\.min\(20,/);
 assert.match(candidates,/Rotate targets fairly/);
 assert.match(candidates,/Ambiguous/mi);
});

test("Public provider status is bounded, accurate and sanitized",()=>{
 const contracts=read("src/lib/persistence/contracts.ts");
 const adapter=read("src/lib/persistence/supabase-rest.ts");
 const source=read("src/lib/research/source-health.ts");
 const route=read("src/app/api/intelligence/research/source-health/route.ts");
 const page=read("src/app/research/discovery/page.tsx");
 assert.match(contracts,/listRecentProviderHealth/);
 assert.match(adapter,/provider_health_samples/);
 assert.match(adapter,/checked_at.desc/);
 assert.match(adapter,/Math.min\(6/);
 assert.match(source,/quotaRemaining/);
 assert.match(source,/TOP_SECRET/);
 assert.match(source,/state==="stale"|state==="degraded"/);
 assert.match(route,/externalProviderCalls:0/);
 assert.doesNotMatch(route,/\.metadata\b|quotaRemaining|process\.env\.[A-Z_]*SECRET/);
 assert.match(page,/Откуда поступают данные/);
 assert.match(page,/К проверке FT/);
});

test("Provider pipeline failure is classified without leaking private diagnostics",()=>{
 const parser=read("src/lib/research/source-health.ts");
 const page=read("src/app/research/discovery/page.tsx");
 assert.match(parser,/safeCodes=new Set/);
 assert.match(parser,/lastRunCode/);
 assert.match(parser,/UPSTREAM_REJECTED_TARGETED_IDS/);
 assert.match(page,/provider\.lastRunCode/);
});

test("Final-score recovery bounds internal requests and isolates failure stage",()=>{
 const route=read("src/app/api/cron/api-football-finals/route.ts");
 assert.match(route,/i\+=2/);
 assert.match(route,/eligible=events.filter/);
 assert.match(route,/failureStage="FETCH_STATE_HISTORY"/);
 assert.match(route,/failureStage="FETCH_UPSTREAM"/);
 assert.match(route,/failureStage="PERSIST_FINALS"/);
 assert.match(route,/failureStage="WRITE_PROVIDER_HEALTH"/);
 assert.match(route,/states.push\(\.\.\.part.flat\(\)\)/);
 assert.match(route,/failureStage,estimatedCallsPerDay/);
 assert.match(route,/events:eligible,states/);
});

test("API-Football application-level errors are distinguished without raw provider details",()=>{
 const validator=read("src/lib/providers/api-football-finals.ts");
 const cron=read("src/app/api/cron/api-football-finals/route.ts");
 const labels=read("src/lib/research/source-health.ts");
 assert.match(validator,/classifyFixtureProviderFailure/);
 assert.match(validator,/UPSTREAM_DAILY_QUOTA/);
 assert.match(cron,/const providerFailure=classifyFixtureProviderFailure\(data.errors\)/);
 assert.match(cron,/if\(providerFailure\)throw new Error\(providerFailure\)/);
 assert.match(labels,/Дневной лимит API исчерпан/);
 assert.match(labels,/UPSTREAM_SUBSCRIPTION/);
});

test("Independent football scoreboard reports source and stops at read-only boundary",()=>{
 const reader=read("src/lib/providers/openligadb-results.ts");
 const page=read("src/app/research/results/page.tsx");
 const selfcheck=read("src/app/api/intelligence/research/results/selfcheck/route.ts");
 assert.match(reader,/resultTypeKind==="After90Minutes"/);
 assert.match(reader,/matchIsFinished===true/);
 assert.match(reader,/ODbL 1\.0/);
 assert.match(reader,/openLigaSelfcheck/);
 assert.doesNotMatch(reader,/upsertEvent|appendEventState|appendTruthJournal|appendQuotes/);
 assert.match(page,/resultsAttribution\.licenseUrl/);
 assert.match(page,/реальном времени/);
 assert.match(selfcheck,/openLigaSelfcheck/);
});
test("Known API-Football subscription denial is throttled, not spammed",()=>{
 const gate=read("src/lib/providers/api-football-finals.ts");
 const cron=read("src/app/api/cron/api-football-finals/route.ts");
 assert.match(gate,/subscriptionPollGate/);
 assert.match(gate,/24\*3600000/);
 assert.match(cron,/store\.listRecentProviderHealth/);
 assert.match(cron,/if\(!planGate\.allowed\)/);
 assert.match(cron,/subscriptionUpgradeMayBeRequired:true/);
});

test("Cross-source verification never settles private VETO decisions or imports OpenLigaDB",()=>{
 const audit=read("src/lib/research/result-corroboration.ts");
 const route=read("src/app/api/intelligence/research/results/crosscheck/route.ts");
 const ui=read("src/app/research/results/SourceCrosscheck.tsx");
 const page=read("src/app/research/results/page.tsx");
 assert.match(audit,/sourceComparisonSelfcheck/);
 assert.match(audit,/participantScore>=\.82/);
 assert.match(audit,/ambiguousRejected/);
 assert.match(audit,/verifiedVetoFinalsAdded:0/);
 assert.match(audit,/crossSourceComparisonIsNotSettlement:true/);
 assert.doesNotMatch(route,/appendEventState|appendDecisionOutcome|upsertEvent|appendQuotes|appendTruthJournal/);
 assert.doesNotMatch(audit,/appendEventState|appendDecisionOutcome|upsertEvent|appendQuotes|appendTruthJournal/);
 assert.match(route,/sourceAcquisition:"user-initiated"/);
 assert.match(route,/quotaPaidApiCalls:0/);
 assert.match(route,/limitedByStorage:capped/);
 assert.match(ui,/fetch\("\/api\/intelligence\/research\/results\/crosscheck"/);
 assert.match(page,/SourceCrosscheck/);
});
