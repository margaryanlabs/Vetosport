"use client";
import {useEffect,useState} from "react";
import {VetoMark} from "@/components/VetoMark";
import {SportAppearanceToggle} from "@/components/SportAppearanceToggle";
import type {PatternDiscoveryResult} from "@/lib/research/auto-discovery";
import type {EvidenceCoverage} from "@/lib/research/evidence-coverage";
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
          <p>Проверяем не только сигналы, но и сам путь данных: реальный счёт → независимый финальный результат → совпадающая цена → вневыборочная проверка.</p>
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
           <article><small>ОДНОВРЕМЕННО СВЕЖИЙ СЧЁТ + ЦЕНА</small><strong>{coverage.freshScoreAndPriceEvents}</strong><span>техническая связка, не доказанный EV</span></article>
         </div>
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
    <section className="discoverySection">
      <div className="discoverySectionHead">
        <div><span>03 / AUTOMATED HYPOTHESIS MINING</span><h2>Что система нашла для проверки</h2></div>
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
      <div><small>04 / NEXT FRONTIER</small><h2>Следующий слой исследования</h2><p>Эти направления не привязаны к одной заранее выбранной стратегии. Пока они не доказаны на данных VETO.</p></div>
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
