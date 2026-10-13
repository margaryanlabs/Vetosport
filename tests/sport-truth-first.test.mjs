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
