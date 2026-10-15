"use client";
import {useEffect,useState} from "react";
import {VetoMark} from "@/components/VetoMark";
import {SportAppearanceToggle} from "@/components/SportAppearanceToggle";
import type {PatternDiscoveryResult} from "@/lib/research/auto-discovery";
import type {EvidenceCoverage} from "@/lib/research/evidence-coverage";
import type {SourceHealthView} from "@/lib/research/source-health";
import "./discovery.css";

const percentage=(n:number|null)=>n===null?"—":(n*100).toFixed(1).replace(".",",")+"%";
type DiscoveryFeed=PatternDiscoveryResult&{source:string;error?:string;fetchCoverage?:{windowMayBeCapped:boolean;statesFetched:number;historicalRangeDays?:number;archivedFinishedEventsRetained?:number;archivedFinishedEventsDroppedByLimit?:number}};
export default function DiscoveryPage(){
  const [feed,setFeed]=useState<DiscoveryFeed|null>(null);
  const [loading,setLoading]=useState(true);
  const [failed,setFailed]=useState(false);
  const [filter,setFilter]=useState<"all"|"with-outcomes">("all");
  const [cycle,setCycle]=useState(0);
  const [coverage,setCoverage]=useState<EvidenceCoverage|null>(null);
  const [coverageFailed,setCoverageFailed]=useState(false);
  const [sourceHealth,setSourceHealth]=useState<SourceHealthView[]|null>(null);
  const [sourceHealthFailed,setSourceHealthFailed]=useState(false);
  useEffect(()=>{
    let active=true;
    async function load(){
      try{
        const response=await fetch("/api/intelligence/research/discovery",{cache:"no-store"});
        if(!response.ok)throw Error("discovery read failed");
        const body:DiscoveryFeed=await response.json();
        if(active){setFeed(body);setFailed(false);}
      }catch{if(active){setFailed(true);setFeed(null);}}
      finally{if(active)setLoading(false);}
    }
    void load();
    return()=>{active=false;};
  },[cycle]);
  useEffect(()=>{
    let active=true;
    fetch("/api/intelligence/research/data-readiness",{cache:"no-store"})
      .then(response=>{if(!response.ok)throw Error("source coverage unavailable");return response.json()})
      .then((result:EvidenceCoverage)=>{if(active){setCoverage(result);setCoverageFailed(false);}})
      .catch(()=>{if(active){setCoverageFailed(true);setCoverage(null);}});
    return()=>{active=false;};
  },[cycle]);
  useEffect(()=>{
    let active=true;
    fetch("/api/intelligence/research/source-health",{cache:"no-store"})
      .then(response=>{if(!response.ok)throw Error("source health unavailable");return response.json()})
      .then((report:{providers:SourceHealthView[]})=>{
        if(active&&Array.isArray(report.providers)){setSourceHealth(report.providers);setSourceHealthFailed(false);}
      })
      .catch(()=>{if(active){setSourceHealth(null);setSourceHealthFailed(true);}});
    return()=>{active=false;};
  },[cycle]);
  const patterns=feed?.patterns.filter(p=>filter==="all"||p.settled>0)||[];
  return <main className="discoveryRoot">
    <header className="discoveryNav">
      <a className="discoveryBrand" href="/" aria-label="VETO Sport"><VetoMark size={28}/><b>VETO <span>SPORT</span></b></a>
      <span className="discoveryNavLabel">RESEARCH / PATTERN DISCOVERY</span>
      <div className="discoveryNavActions"><SportAppearanceToggle/><a href="/research/watchlist">← Watchlist</a></div>
    </header>
    <section className="discoveryHero">
      <div className="discoveryHeroCopy">
        <div className="discoveryKicker"><span className="discoveryRedDot"/> VETO SPORT / AUTONOMOUS RESEARCH <span>NO REAL-MONEY SIGNALS</span></div>
        <h1>Находим закономерности.<br/><em>Не придумываем преимущество.</em></h1>
        <p>VETO самостоятельно перебирает игровые состояния, время, счёт и рынки. Мы больше не ограничены одной гипотезой 1:1 после 80′. Каждая идея начинается со снимка источника и остаётся исследованием до независимой проверки.</p>
        <div className="discoveryHeroActions">
          <button type="button" onClick={()=>{setLoading(true);setCycle(v=>v+1);}} disabled={loading}>{loading?"Анализируем…":"Пересчитать исследование ↻"}</button>
          <a href="/research/watchlist">Открыть реальный радар ↗</a>
          <a href="/research/paper-lab">Daily Paper Lab · $200 ↗</a>
          <a href="/research/results">Независимые результаты ↗</a>
        </div>
      </div>
      <div className="discoveryHeroMetric"><span>VALIDATED EDGE</span><strong>0</strong><p>Не маскируем совпадения под готовые ставки.</p><div className="discoveryPulseLine"/></div>
    </section>
    <section className="discoveryMetrics" aria-live="polite">
      <article><small>МАТЧЕЙ В ВЫБОРКЕ</small><strong>{loading?"…":feed?.eventsScanned??0}</strong><span>{feed?.fetchCoverage?.historicalRangeDays?`за ${feed.fetchCoverage.historicalRangeDays} дней, из архива VETO`:"из нашего сохранённого источника"}</span></article>
      <article><small>СНИМКОВ ИГРОВОГО СОСТОЯНИЯ</small><strong>{loading?"…":feed?.usableLiveObservations??0}</strong><span>с достоверным счётом и временем</span></article>
      <article><small>ГИПОТЕЗ СФОРМИРОВАНО</small><strong>{loading?"…":feed?.hypothesesScreened??0}</strong><span>разные минуты, счета и рынки</span></article>
      <article><small>ПРОВЕРЕННЫХ ФИНАЛОВ</small><strong>{loading?"…":feed?.verifiedFinals??0}</strong><span>источник должен подтвердить FT отдельно</span></article>
    </section>
    <div className="discoveryTruth">
      <span>● ИСТОЧНИК: {feed?.source??(loading?"ПРОВЕРЯЕМ":"НЕТ")}</span>
      <p>{failed?"Нет доступа к реальным данным. Учебные результаты не подставляются.":feed?.note??"Ожидаем результат из хранилища VETO."} {feed?.fetchCoverage?.windowMayBeCapped?"Внимание: часть временных окон достигла лимита выборки.":""} {feed?.fetchCoverage?.historicalRangeDays?`Исследование охватывает последние ${feed.fetchCoverage.historicalRangeDays} дней, включая до ${feed.fetchCoverage.archivedFinishedEventsRetained??0} ранее завершённых событий.`:""} {feed?.fetchCoverage?.archivedFinishedEventsDroppedByLimit?`Из-за лимита чтения не включено ${feed.fetchCoverage.archivedFinishedEventsDroppedByLimit} старых матчей.`:""}</p>
    </div>
    <section className="discoveryEvidence" aria-labelledby="discovery-evidence-title">
      <div className="discoveryEvidenceHead">
        <div><span>02 / DATA READINESS</span><h2 id="discovery-evidence-title">Что мешает доказать преимущество?</h2>
          <p>Проверяем не только сигналы, но и сам путь данных: реальный счёт → независимый финальный результат → совпадающая цена → вневыборочная проверка. Исторические снимки оцениваем отдельно от актуальных сигналов.</p>
        </div>
        <a href="/research/watchlist">Проверить матчи ↗</a>
      </div>
      {coverageFailed?<div className="discoveryEvidenceEmpty" role="status">Статистика источников недоступна. Мы не подставляем примерные значения.</div>:
       !coverage?<div className="discoveryEvidenceEmpty" role="status">Проверяем сохранённые результаты, время и котировки…</div>:
       <>
         <div className="discoveryEvidenceNumbers">
           <article><small>НАБЛЮДАЕМЫЕ МАТЧИ</small><strong>{coverage.eventsWithLiveSamples}</strong><span>из {coverage.eventsScanned} в текущем окне</span></article>
           <article><small>ОТДЕЛЬНО ПОДТВЕРЖДЁННЫЕ FT</small><strong>{coverage.certifiedRegulationFinals}</strong><span>не равны количеству верных прогнозов</span></article>
           <article><small>МАТЧИ С ЗАПИСАННЫМИ ЦЕНАМИ</small><strong>{coverage.eventsWithRecordedPrices}</strong><span>включая исторические, неактуальные</span></article>
           <article><small>СВЕЖИЕ СЧЁТ + ЦЕНА СЕЙЧАС</small><strong>{coverage.freshScoreAndPriceEvents}</strong><span>за последние 2 минуты; не доказанный EV</span></article>
           <article className="discoveryHistoricalEvidence"><small>ИСТОРИЧЕСКИЕ СНИМКИ СЧЁТ + ЦЕНА</small><strong>{coverage.historicalScoreAndPriceCoCapturedEvents}</strong><span>≤ {coverage.historicalCoCaptureWindowSeconds} сек; часть пар может содержать будущий счёт</span></article>
           <article className="discoveryHistoricalEvidence"><small>ХРОНОЛОГИЧЕСКИ ДОПУСТИМЫЕ</small><strong>{coverage.historicalCausallyAlignedEvents}</strong><span>сначала счёт → затем цена; всё ещё не подтверждённая исполнимость</span></article>
           <article className="discoveryHistoricalEvidence"><small>ОПАСНЫЙ ЗАГЛЯД В БУДУЩЕЕ</small><strong>{coverage.historicalLookaheadOnlyEvents}</strong><span>цена записана РАНЬШЕ доступного счёта · исключено из causal replay</span></article>
         </div>
         <section className="discoveryLagPanel" aria-label="Дистанция между сохранёнными снимками счёта и котировок">
           <div className="discoveryLagHeading">
             <div>
               <span className="discoveryLagEyebrow">OBSERVATION QUALITY / DATA TIMING</span>
               <h3>Насколько близко по времени?<br/><em>Счёт ↔ котировка.</em></h3>
             </div>
             <div className="discoveryLagTotal"><small>МАТЧЕЙ С ДВУМЯ ТИПАМИ НАБЛЮДЕНИЙ</small>
               <strong>{coverage.captureLag?.withBothSources??0}</strong>
             </div>
           </div>
           <div className="discoveryLagBars">
             {([
               ["within2m","≤ 2 МИН","score-price-aligned"],
               ["between2and10m","2–10 МИН","score-price-delayed"],
               ["between10and30m","10–30 МИН","score-price-distant"],
               ["over30m","> 30 МИН","score-price-too-far"]
             ] as const).map(([key,label,kind])=>{
               const value=coverage.captureLag?.eventCounts[key]??0;
               const total=coverage.captureLag?.withBothSources??0;
               const max=total>0&&value>0?Math.max(5,Math.min(100,100*value/total)):0;
               return <article key={key} className={"discoveryLagRow "+kind}>
                 <div><span>{label}</span><strong>{value}</strong></div>
                 <div className="discoveryLagTrack" aria-label={label+": "+value}>
                   <i style={{width:max+"%"}} />
                 </div>
               </article>;
             })}
           </div>
           <div className="discoveryLagCaveats">
             <span><b>01 / ВРЕМЯ</b> Сравниваются времена записи, а не доказанно синхронизированные часы поставщиков.</span>
             <span><b>00 / CAUSAL ORDER</b> Интервал ±2 мин не доказывает, что информация была известна в момент цены. Для ретроспективного решения используем только счёт, записанный ДО котировки.</span>
             <span><b>02 / БУКМЕКЕР</b> {coverage.captureLag?.unidentifiedBookmakerMatches??0} событий без установленного букмекера в ближайшей паре.</span>
             <span><b>03 / ИСПОЛНЕНИЕ</b> Ни один интервал не удостоверяет доступность цены, прибыльность или результат матча.</span>
           </div>
         </section>
         <div className="discoveryGates" aria-label="Этапы готовности спортивных данных">
           {coverage.gates.map((gate,i)=><article key={gate.id} className={"discoveryGate discoveryGate-"+gate.stage}>
             <div className="discoveryGateHead"><span>{String(i+1).padStart(2,"0")}</span><h3>{gate.label}</h3><b>{gate.stage==="blocked"?"НЕ ГОТОВО":gate.stage==="partial"?"ЧАСТИЧНО":"ГОТОВО"}</b></div>
             <p>{gate.detail}</p>
           </article>)}
         </div>
         {coverage.sampleMayBeCapped&&<p className="discoveryCoverageWarning">Выборка ограничена лимитами чтения; показатели не следует считать полным архивом.</p>}
         <p className="discoveryCoverageFoot">Период: {coverage.windowHours} ч · Прочитаны только сохранённые источники · 0 новых платных вызовов API · {new Date(coverage.generatedAt).toLocaleString("ru-RU")}</p>
       </>}
    </section>
    <section className="discoveryProviderPanel" aria-labelledby="discovery-provider-title">
      <div className="discoveryProviderIntro"><div><span>03 / SOURCE OBSERVABILITY</span>
        <h2 id="discovery-provider-title">Откуда поступают данные?</h2>
        <p>Прозрачная история последних запусков: отличаем реальные цены, пустой ответ, ожидание матча и ограничения. Успешный запрос не означает доступный коэффициент или доказанную стратегию.</p>
      </div><a href="/research/watchlist">Смотреть реальные матчи ↗</a></div>
      {sourceHealthFailed?<p className="discoveryProviderMissing">История источников пока недоступна. Мы не выдаём отсутствие данных за успешную работу.</p>:
       !sourceHealth?<p className="discoveryProviderMissing">Проверяем реальные записи о выполнении загрузки…</p>:
       <div className="discoveryProviderGrid">{sourceHealth.map(provider=><article key={provider.id}>
          <div className="discoveryProviderCardHead"><span className={"discoveryProviderDot "+provider.state}/>
            <strong>{provider.label}</strong>
            <b>{provider.state==="active"?"РАБОТАЕТ":provider.state==="degraded"?"ОГРАНИЧЕНИЯ":provider.state==="stale"?"УСТАРЕЛО":provider.state==="empty"?"НЕТ КОТИРОВОК":provider.state==="waiting"?"ОЖИДАЕМ МАТЧ":"НЕИЗВЕСТНО"}</b>
          </div>
          <p>{provider.note}</p>
          {provider.lastRunCode&&<p className="discoverySourceFailure">Причина: {provider.lastRunCode}</p>}
          {provider.targetedFailureCode&&<p className="discoverySourceFailure">Дополнительная проверка точного матча ограничена: {provider.targetedFailureCode}</p>}
          {provider.lastFailureStage&&<p className="discoverySourceFailure">Этап: {provider.lastFailureStage}</p>}
          {provider.recentRuns?.length>0&&<div className="discoverySourceTimeline" role="group" aria-label="Последние шесть сохранённых запусков">
            <div className="discoverySourceTimelineHead"><b>ИСТОРИЯ ЗАПУСКОВ</b><span>{provider.recentRuns.length} последних проверок</span></div>
            <div className="discoverySourceTimelineBars">{provider.recentRuns.map((run,i)=>
              <div key={run.checkedAt+"-"+i}
                className={"discoverySourceRun "+run.outcome}
                title={new Date(run.checkedAt).toLocaleString("ru-RU")+" · "+
                  (run.outcome==="recorded"?"записи сохранены":run.outcome==="empty"?"нулевые активные рынки":
                   run.outcome==="waiting"?"запрос не выполнялся":run.outcome==="degraded"?"ошибка или ограничение":"исход неизвестен")}
                aria-label={"Запуск "+(i+1)+": "+run.outcome+(run.recorded!==null?", записано "+run.recorded:"")}>
                <span/>{run.recorded!==null&&<small>{run.recorded}</small>}
              </div>
            )}</div>
            <p>Нули — не доказательство доступных котировок. Источник может работать технически, но не предоставлять рынки.</p>
          </div>}
          <footer><span>{provider.updatedAt?new Date(provider.updatedAt).toLocaleString("ru-RU"):"Нет сохранённого запуска"}</span>
            {provider.receivedRecords!==null&&<small>Записей: {provider.receivedRecords}</small>}
            {provider.pendingFixtureChecks!==null&&<small>К проверке FT: {provider.pendingFixtureChecks}</small>}
            {provider.scannedActiveFixtures!==null&&<small>Проверено активных матчей: {provider.scannedActiveFixtures}</small>}
            {provider.matchedFixtures!==null&&<small>Точно совпали с линией: {provider.matchedFixtures}</small>}
            {provider.nearCaptureScoreFixtures!==null&&<small>Снимков счёта не старше 2 мин при запуске проверки рынка: {provider.nearCaptureScoreFixtures} · часы источников не подтверждены</small>}
            {provider.medianScoreCaptureAgeSeconds!==null&&<small>Медианный возраст исходного счёта: {provider.medianScoreCaptureAgeSeconds} с · не гарантия исполнения</small>}
            {provider.targetedFixtureProbeUsed===true&&<small>Поиск по точному ID матча: выполнен · без гарантии наличия рынков</small>}
            {provider.openProviderQuotes!==null&&<small>Неприостановленные цены: {provider.openProviderQuotes} · букмекер не подтверждён</small>}
            {provider.quoteWriteFailures!==null&&provider.quoteWriteFailures>0&&<small>Ошибок записи котировок: {provider.quoteWriteFailures}</small>}
            {provider.journalWriteFailures!==null&&provider.journalWriteFailures>0&&<small>Ошибок журнала доказательств: {provider.journalWriteFailures}</small>}
            {provider.quoteWriteErrorClass&&<small>Причина записи котировок: {provider.quoteWriteErrorClass}</small>}
            {provider.journalWriteErrorClass&&<small>Причина журнала: {provider.journalWriteErrorClass}</small>}
          </footer>
        </article>)}</div>}
    </section>
    <section className="discoverySection">
      <div className="discoverySectionHead">
        <div><span>04 / AUTOMATED HYPOTHESIS MINING</span><h2>Что система нашла для проверки</h2></div>
        <div className="discoveryFilters">
          <button type="button" className={filter==="all"?"selected":""} onClick={()=>setFilter("all")}>Все идеи</button>
          <button type="button" className={filter==="with-outcomes"?"selected":""} onClick={()=>setFilter("with-outcomes")}>С исходами</button>
        </div>
      </div>
      <p className="discoveryIntro">Ранжирование по объёму наблюдений, а не по «проходимости» или прибыльности. 30-минутные снимки не являются настоящей live-линией. Проценты появляются только после отдельного подтверждения финального счёта.</p>
      {!loading&&!failed&&patterns.length===0?
        <div className="discoveryEmpty"><h3>Пока недостаточно исходных наблюдений</h3><p>Это корректное состояние. VETO не заменяет реальные матчи демонстрационными стратегиями. Попробуем после накопления проверенных данных.</p></div>:
       failed?<div className="discoveryEmpty"><h3>Источник сейчас недоступен</h3><p>Проверьте подключение хранилища и повторите запрос.</p></div>:
       loading?<div className="discoveryEmpty"><h3>Считываем исторические снимки…</h3><p>Никаких новых запросов к платным спортивным API.</p></div>:
       <div className="discoveryGrid">{patterns.map((pattern,i)=><article className="discoveryCard" key={pattern.id}>
         <div className="discoveryCardTop"><span>EXPERIMENT / {String(i+1).padStart(2,"0")}</span><b className="discoveryTag">{pattern.settled===0?"НЕТ ИСХОДОВ":"EXPLORATORY"}</b></div>
         <h3>{pattern.label}</h3>
         <p>{pattern.question}</p>
         <div className="discoveryCardNumbers">
           <div><small>Наблюдения</small><strong>{pattern.observations}</strong></div>
           <div><small>Завершено</small><strong>{pattern.settled}</strong></div>
           <div><small>Частота</small><strong>{percentage(pattern.hitRate)}</strong></div>
         </div>
         <div className="discoveryConfidence">
           <span>Нижняя граница Wilson: <b>{percentage(pattern.lower95)}</b></span>
           <span>Отложенная ретроспективная часть: <b>{pattern.holdoutCount?String(pattern.holdoutCount)+" игр / "+percentage(pattern.holdoutHitRate):"недостаточно"}</b></span>
         </div>
         <footer><span>НЕ ДОКАЗАН ROI</span><a href="/research/watchlist">Открыть радар ↗</a></footer>
       </article>)}</div>}
    </section>
    <section className="discoveryNext">
      <div><small>05 / NEXT FRONTIER</small><h2>Следующий слой исследования</h2><p>Эти направления не привязаны к одной заранее выбранной стратегии. Пока они не доказаны на данных VETO.</p></div>
      <div className="discoveryNextGrid">
        <article><span>01 / MARKET STRUCTURE</span><h3>Аномалии фаворитов и аутсайдеров</h3><p>Сравнение исходов с букмекерскими вероятностями без маржи.</p></article>
        <article><span>02 / PRICE TRANSITIONS</span><h3>Расхождение букмекеров</h3><p>Одновременные коэффициенты разных источников по одному контракту.</p></article>
        <article><span>03 / LIVE DYNAMICS</span><h3>Поздние переходы состояния</h3><p>Не только 1:1: динамика тоталов, смена лидера, новые временные окна.</p></article>
        <article><span>04 / MULTISPORT</span><h3>Теннис, бейсбол и волейбол</h3><p>Расширяем только при наличии проверяемых котировок и окончательных результатов.</p></article>
      </div>
    </section>
    <footer className="discoveryFoot">VETO SPORT / MARGARYAN LABS · AUTO DISCOVERY READ-ONLY · ZERO VERIFIED REAL-MONEY BETS</footer>
  </main>;
}
