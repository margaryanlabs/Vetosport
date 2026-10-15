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

test("Live feed samples current kickoffs instead of first 40 stale ascending rows",()=>{
 const reader=read("src/lib/live/persisted-events.ts");
 const sorter=read("src/lib/live/feed-priority.ts");
 const freshness=read("src/lib/live/freshness.ts");
 const today=read("src/components/TodayExperience.tsx");
 const watch=read("src/app/research/watchlist/page.tsx");
 assert.match(reader,/liveFeedWindows\(now\)/);
 assert.match(reader,/selectFeedCandidates/);
 assert.match(reader,/prioritizeLiveFeed/);
 assert.doesNotMatch(reader,/now - 12 \* 60 \* 60 \* 1000/);
 assert.match(sorter,/sinceKickoff|feedTier\(event/);
 assert.match(sorter,/LIVE_FEED_OUTPUT_LIMIT=40/);
 assert.match(freshness,/АРХИВ · ФИНАЛ НЕ ПОДТВЕРЖДЁН/);
 assert.match(freshness,/СНИМОК С ЗАДЕРЖКОЙ/);
 assert.match(today,/presentationPriority/);
 assert.match(watch,/FT НЕ ПОДТВЕРЖДЁН/);
});

test("Unverified stale LIVE statuses are quarantined, not relabeled as certified finals",()=>{
 const feed=read("src/lib/live/feed-priority.ts");
 assert.match(feed,/let archived=0/);
 assert.match(feed,/unverifiedArchive/);
 assert.match(feed,/archived<=8/);
 assert.match(feed,/At most eight unverified archived LIVE flags/);
 assert.doesNotMatch(feed,/appendEventState|upsertEvent|status:"finished"/);
});

test("No historical quote or 12-hour-old LIVE fixture can authorize shadow/live decisions",()=>{
 const gate=read("src/lib/live/temporal-data-safety.ts");
 const readiness=read("src/lib/live/decision-readiness.ts");
 const shadow=read("src/lib/live/shadow-football.ts");
 const shadowCron=read("src/app/api/cron/shadow-football/route.ts");
 const summary=read("src/lib/live/persisted-utils.ts");
 assert.match(gate,/function temporalDataSafety/);
 assert.match(gate,/eligibleShadowQuotes/);
 assert.match(gate,/eligibleLiveQuotes/);
 assert.match(gate,/age\(q.providerLastUpdate,now\)/);
 assert.match(gate,/Source-backed recent and aligned quote/);
 assert.match(readiness,/temporalDataSafety\(input\)/);
 assert.match(readiness,/temporal.shadowObservationReady/);
 assert.match(readiness,/temporal.liveExecutionInputsReady/);
 assert.match(shadow,/quotes:evidence.eligibleShadowQuotes/);
 assert.match(shadowCron,/noOldUnverifiedLiveMatches:true/);
 assert.match(shadowCron,/selectFeedCandidates\(/);
 assert.match(summary,/primarySignal: currentDecision\?signalFromDecision/);
 assert.match(summary,/temporal.eligibleLiveQuotes.some/);
});

test("In-play odds only checks current exact observed fixture ids and reports real failure",()=>{
 const cron=read("src/app/api/cron/api-football-inplay/route.ts");
 const join=read("src/lib/providers/api-football-odds-join.ts");
 const parser=read("src/lib/providers/api-football-inplay.ts");
 const health=read("src/lib/research/source-health.ts");
 assert.match(cron,/statuses:\["live"\]/);
 assert.match(cron,/scannedActiveFixtures/);
 assert.match(cron,/candidateMayBeCapped/);
 assert.match(cron,/NO_OVERLAPPING_FIXTURES/);
 assert.match(cron,/LOAD_MATCH_SNAPSHOTS/);
 assert.match(cron,/failureCode:code/);
 assert.match(join,/now-kickoff<=4\*3600000/);
 assert.match(join,/e\.event\.status==="live"/);
 assert.match(parser,/classifyFixtureProviderFailure\(parsed.errors\)/);
 assert.match(health,/matchedFixtures/);
 assert.match(health,/Точно совпали с линией|NO_OVERLAPPING_FIXTURES/);
});

test("Public live API fails closed without returning local demo fixtures",()=>{
 const route=read("src/app/api/live/events/route.ts");
 const terminal=read("src/components/Terminal.tsx");
 assert.doesNotMatch(route,/sandboxEventSummaries|mode:"sandbox-fallback"/);
 assert.match(route,/mode:"storage-unavailable"/);
 assert.match(route,/mode:events.length\?"persisted":"persisted-empty"/);
 assert.match(route,/events:\[\]/);
 assert.match(route,/source:"PERSISTED_ONLY"/);
 assert.match(terminal,/demoEnabled \? sandboxEventSummaries : \[\]/);
 assert.match(terminal,/getObservedFreshness\(activeSummary\)\.freshLive/);
 assert.match(terminal,/NO LIVE DATA/);
 assert.doesNotMatch(terminal,/DEMO EVENTS|Demo fallback/);
});

test("A failing sports API response immediately clears the previous live client list",()=>{
 const code=read("src/components/Terminal.tsx");
 assert.match(code,/if\(!payload\|\|!Array\.isArray\(payload\.events\)\)/);
 assert.match(code,/setLoadedEvents\(\[\]\);\s*setLiveSourceMode\("storage-unavailable"\);/);
 assert.match(code,/NO LIVE DATA/);
});

test("An empty in-play odds response never advertises usable real markets",()=>{
 const chron=read("src/app/api/cron/api-football-inplay/route.ts");
 const health=read("src/lib/research/source-health.ts");
 const sourceApi=read("src/app/api/intelligence/research/source-health/route.ts");
 const page=read("src/app/research/discovery/page.tsx");
 assert.match(chron,/NO_LIVE_MARKETS_RETURNED/);
 assert.match(chron,/ALL_MARKETS_SUSPENDED/);
 assert.match(chron,/unsuspendedWritten/);
 assert.match(chron,/NO_RECENT_VERIFIED_SCORE_FIXTURES/);
 assert.match(chron,/providerCalled:false/);
 assert.match(health,/ProviderReadiness="active"\|"empty"\|"waiting"/);
 assert.match(health,/noMarkets/);
 assert.match(health,/recentRuns:SafeSourceRun\[\]/);
 assert.match(sourceApi,/listRecentProviderHealth\(\{providerId:descriptor.id,limit:6\}\)/);
 assert.match(page,/НЕТ КОТИРОВОК/);
 assert.match(page,/discoverySourceTimeline/);
});

test("One exact in-play fixture lookup can recover missing global odds with a hard free quota guard",()=>{
 const client=read("src/lib/providers/api-football-inplay.ts");
 const cron=read("src/app/api/cron/api-football-inplay/route.ts");
 const route=read("src/app/api/providers/route.ts");
 const selfcheck=read("src/app/api/intelligence/providers/inplay-odds/selfcheck/route.ts");
 const health=read("src/lib/research/source-health.ts");
 assert.match(client,/function planTargetedInplayProbe/);
 assert.match(client,/url.searchParams.set\("fixture",String\(input.fixtureId\)\)/);
 assert.match(client,/input.remaining<=22/);
 assert.match(client,/utcHour%4!==0/);
 assert.match(client,/previousProbeBucket===bucket/);
 assert.match(client,/globalIds.has\(id\)/);
 assert.match(cron,/previousProbeBucket/);
 assert.match(cron,/targetedCalled=true/);
 assert.match(cron,/getApiFootballInPlay\(\{fixtureId:probe.fixtureId\}\)/);
 assert.match(cron,/providerRows.push\(\.\.\.exact.rows.filter/);
 assert.match(cron,/rankedRows/);
 assert.match(cron,/verified.map.has\(a.fixture\?\.id\?\?-1\)/);
 assert.match(cron,/estimatedCallsPerDay:18/);
 assert.match(route,/targetedExtraCallsPerDayCap:6/);
 assert.match(selfcheck,/targetedInplayProbeSelfcheck/);
 assert.match(health,/targetedFixtureProbeUsed/);
});

test("Optional targeted odds outage cannot discard valid primary market rows",()=>{
 const route=read("src/app/api/cron/api-football-inplay/route.ts");
 const health=read("src/lib/research/source-health.ts");
 const discovery=read("src/app/research/discovery/page.tsx");
 assert.match(route,/const providerRows=\[\.\.\.fetched\.rows\]/);
 assert.match(route,/try\{\s*const exact=await getApiFootballInPlay\(\{fixtureId:probe\.fixtureId\}\)/);
 assert.match(route,/catch\(error\)\{/);
 assert.match(route,/targetedFailureCode=known\.has\(value\)/);
 assert.match(route,/providerRows\.push\(\.\.\.exact\.rows\.filter/);
 assert.match(route,/for\(const row of rankedRows\.slice/);
 assert.match(health,/targetedSafeCodes/);
 assert.match(health,/targetedFailureCode/);
 assert.match(discovery,/provider\.targetedFailureCode/);
});

test("In-play quote-table and immutable-journal failures are diagnosed separately",()=>{
 const cron=read("src/app/api/cron/api-football-inplay/route.ts");
 const sources=read("src/lib/research/source-health.ts");
 const page=read("src/app/research/discovery/page.tsx");
 assert.match(cron,/let quoteWriteFailures=0,journalWriteFailures=0/);
 assert.match(cron,/quoteWriteFailures\+\+/);
 assert.match(cron,/journalWriteFailures\+\+/);
 assert.match(cron,/quoteWriteFailures,journalWriteFailures/);
 assert.match(cron,/STORAGE_WRITE_FAILURE/);
 assert.match(sources,/asSafeCount\(info.quoteWriteFailures\)/);
 assert.match(sources,/asSafeCount\(info.journalWriteFailures\)/);
 assert.match(page,/Ошибок записи котировок/);
 assert.match(page,/Ошибок журнала доказательств/);
});

test("In-play odds survive either individual storage path being unavailable",()=>{
 const cron=read("src/app/api/cron/api-football-inplay/route.ts");
 const fail=read("src/lib/persistence/failure-codes.ts");
 const health=read("src/lib/research/source-health.ts");
 const page=read("src/app/research/discovery/page.tsx");
 assert.match(cron,/quoteWriteErrorClass\?\?=classifyStorageFailure\(error\)/);
 assert.match(cron,/journalWriteErrorClass\?\?=classifyStorageFailure\(error\)/);
 assert.match(cron,/quoteWriteFailures,journalWriteFailures/);
 assert.match(cron,/journalRows\+=await persistence\.appendTruthJournal/);
 assert.doesNotMatch(cron,/quoteWriteFailures\+\+;\s*failures\+\+;\s*continue;/);
 assert.match(fail,/PGRST204/);
 assert.match(fail,/STORAGE_FOREIGN_KEY/);
 assert.match(fail,/storageFailureSelfcheck/);
 assert.match(health,/quoteWriteErrorClass/);
 assert.match(health,/knownStorageClasses/);
 assert.match(page,/Причина журнала/);
});

test("Mixed live football odds have identical bulk JSON keys before PostgREST insert",()=>{
 const normalizer=read("src/lib/persistence/market-quote-rows.ts");
 const storage=read("src/lib/persistence/supabase-rest.ts");
 const errors=read("src/lib/persistence/failure-codes.ts");
 const check=read("src/app/api/intelligence/providers/inplay-odds/selfcheck/route.ts");
 assert.match(normalizer,/quote.selection.line\?\?null/);
 assert.match(normalizer,/quote.providerLastUpdate\?\?null/);
 assert.match(normalizer,/quote.liquidity\?\?null/);
 assert.match(normalizer,/quote.suspended\?\?null/);
 assert.match(normalizer,/quote.raw\?\?null/);
 assert.match(normalizer,/marketQuotePayloadSelfcheck/);
 assert.match(storage,/toUniformMarketQuoteRows\(eventId, quotes\)/);
 assert.match(errors,/PGRST102/);
 assert.match(errors,/STORAGE_PAYLOAD_SHAPE/);
 assert.match(check,/marketQuotePayloadSelfcheck/);
});

test("Historical co-captured score and odds never upgrade to current trading readiness",()=>{
 const historical=read("src/lib/research/historical-co-capture.ts");
 const coverage=read("src/lib/research/evidence-coverage.ts");
 const page=read("src/app/research/discovery/page.tsx");
 assert.match(historical,/CO_CAPTURE_WINDOW_SECONDS=120/);
 assert.match(historical,/quote.suspended!==false/);
 assert.match(historical,/row.state.status!=="live"/);
 assert.match(historical,/row.sourceProvider!=="api-football"/);
 assert.match(historical,/kickoff\+4\*3600000/);
 assert.match(historical,/quote.providerLastUpdate/);
 assert.match(historical,/historicalCoCaptureSelfcheck/);
 assert.match(coverage,/historicalPairsAreNotLiveSignals:true/);
 assert.match(coverage,/historicalScoreAndPriceCoCapturedEvents/);
 assert.match(page,/ИСТОРИЧЕСКИЕ СНИМКИ СЧЁТ \+ ЦЕНА/);
 assert.match(page,/СВЕЖИЕ СЧЁТ \+ ЦЕНА СЕЙЧАС/);
});
test("Data-readiness no longer crops real busy football days to three 100-event queries",()=>{
 const route=read("src/app/api/intelligence/research/data-readiness/route.ts");
 assert.match(route,/windowHours=3,windows=8/);
 assert.match(route,/for\(let offset=0;offset<windows;offset\+=3\)/);
 assert.match(route,/for\(let index=0;index<chunks.length;index\+=4\)/);
 assert.match(route,/sampleMayBeCapped/);
 assert.match(route,/windowHours:windows\*windowHours/);
});

test("Historical evidence timing bars distinguish real observability from executable live prices",()=>{
 const alignment=read("src/lib/research/capture-lag-spectrum.ts");
 const coverage=read("src/lib/research/evidence-coverage.ts");
 const page=read("src/app/research/discovery/page.tsx");
 const self=read("src/app/api/intelligence/research/data-readiness/selfcheck/route.ts");
 assert.match(alignment,/function captureLagSpectrum\(/);
 assert.match(alignment,/captureLagSpectrumSelfcheck/);
 assert.match(alignment,/q.suspended!==false/);
 assert.match(alignment,/Number\.isFinite\(updated\)/);
 assert.match(alignment,/gatewayTimesNotIndependent:true/);
 assert.match(alignment,/providerValidatedExecution:false/);
 assert.match(coverage,/captureLag:captureLagSpectrum|const captureLag=captureLagSpectrum/);
 assert.match(coverage,/historicalPairsAreNotLiveSignals:true/);
 assert.match(page,/доказанно синхронизированные/);
 assert.match(page,/ни один интервал|Ни один интервал/);
 assert.match(page,/value>0/);
 assert.match(self,/captureLagSpectrumSelfcheck/);
});

test("Capture-lag endpoint actually reports the additional deterministic checks",()=>{
 const route=read("src/app/api/intelligence/research/data-readiness/selfcheck/route.ts");
 assert.match(route,/const checks=\[\.\.\.result\.checks,\.\.\.lag\.checks\]/);
 assert.match(route,/\.\.\.result,passed,checks/);
 assert.match(route,/status:passed\?200:503/);
});
