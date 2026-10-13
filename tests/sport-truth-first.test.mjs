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
