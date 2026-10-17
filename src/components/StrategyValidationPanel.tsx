"use client";
import {useMemo,useState} from "react";
import {AutonomousReplayPanel} from "@/components/AutonomousReplayPanel";
import type {PaperEntry} from "@/lib/paper/paper-ledger";
import {validatePaperStrategies,type StrategyCohort} from "@/lib/paper/strategy-validation";

const number=(x:number|null,digits=3)=>x===null?"—":x.toFixed(digits);
const percent=(x:number|null,digits=1)=>x===null?"—":(x*100).toFixed(digits)+"%";
const signedPercent=(x:number|null)=>x===null?"—":(x>0?"+":"")+(x*100).toFixed(1)+"%";
export function StrategyValidationPanel({entries}:{entries:PaperEntry[]}){
 const report=useMemo(()=>validatePaperStrategies(entries),[entries]);
 const [selected,setSelected]=useState("overall");
 const options=[...(report.overall?[report.overall]:[]),...report.cohorts];
 const active:StrategyCohort|undefined=options.find(x=>x.key===selected)??options[0];
 const interval=active?.hitRateWilson95;
 return <section className="paperValidation" id="veto-paper-validation" aria-labelledby="veto-validation-title">
  <div className="paperValidationHead">
   <div><span>04 / SCIENCE DESK · HISTORICAL ONLY</span><h3 id="veto-validation-title">Strategy Validation</h3>
    <p>Научная проверка вероятностей по уникальным матчам. Только зафиксированные ДО результата прогнозы VETO, реальные снимки котировок и сохранённый API-Football FT. Не анализируем ручные выигрыши как доказательство модели.</p>
   </div>
   <strong className="paperValidationBadge">EDGE НЕ ДОКАЗАН</strong>
  </div>
  <div className="paperValidationKpis" aria-label="Качество исследовательской выборки">
   <article><span>ВСЕ ЗАПИСИ</span><strong>{report.totalRecords}</strong><small>локальный журнал · максимум {report.maximumLocalEntries}</small></article>
   <article><span>ПРИГОДНЫЕ СНИМКИ</span><strong>{report.eligibleRecords}</strong><small>после фильтрации дубликатов</small></article>
   <article><span>ИСКЛЮЧЕНЫ</span><strong>{report.totalRecords-report.eligibleRecords}</strong><small>без полной доказательной цепочки</small></article>
   <article><span>НЕЗАВИСИМЫЙ PROSPECTIVE</span><strong>0</strong><small>тест не запущен · не приписываем</small></article>
  </div>
  <div className="paperValidationSelector">
   <label>Исследуемая когорта
    <select value={active?.key??""} onChange={e=>setSelected(e.target.value)} disabled={!options.length}>
     {options.length?options.map((c,i)=><option key={c.key} value={c.key}>{i===0?"Общая выборка (без пересечений)":c.label} · n={c.count}</option>):
      <option value="">Пока нет проверяемых данных</option>}
    </select>
   </label>
   <div className="paperValidationState" role="status">
    <b>{active?.status==="RETROSPECTIVE_ONLY"?"РЕТРОСПЕКТИВНЫЙ АНАЛИЗ":active?.status==="INSUFFICIENT"?"МАЛАЯ ВЫБОРКА":"ДАННЫХ НЕТ"}</b>
    <span>{active?active.note:"Сначала нужны подтверждённые FT, снимок модели и свежая исходная цена."}</span>
   </div>
  </div>
  <div className="paperValidationMetrics">
   <article><small>BRIER / MODEL</small><strong>{number(active?.brier??null,4)}</strong><span>меньше — лучше</span></article>
   <article><small>BRIER / PRICE BASELINE</small><strong>{number(active?.baselineBrier??null,4)}</strong><span>1/коэффициент · с маржой букмекера</span></article>
   <article><small>LOG LOSS</small><strong>{number(active?.logLoss??null,4)}</strong><span>штраф за ошибочную уверенность</span></article>
   <article><small>YIELD / 1 ВИРТ. ЕД.</small><strong>{signedPercent(active?.unitYield??null)}</strong><span>без комиссии, исполнения и проскальзывания</span></article>
  </div>
  <div className="paperValidationLower">
   <div className="paperCalibration">
    <header><span>CALIBRATION / 5 BINS</span><b>Прогноз против реальности</b></header>
    <div className="paperCalibrationLegend"><i/> Оценка модели <i/> Доля исходов FT</div>
    {active?.calibration.map((bin,index)=><div className="paperCalibrationRow" key={index}>
      <span>{Math.round(bin.from*100)}–{Math.round(bin.to*100)}%</span>
      <div className="paperCalibrationTracks" aria-label={`Вероятности ${Math.round(bin.from*100)}–${Math.round(bin.to*100)} процентов, матчей ${bin.count}`}>
       <div><i style={{width:bin.predicted===null?"0%":`${bin.predicted*100}%`}}/></div>
       <div><i style={{width:bin.observed===null?"0%":`${bin.observed*100}%`}}/></div>
      </div>
      <b>{bin.count}</b>
    </div>)??<p className="paperValidationEmpty">Нет пригодных записей для диаграммы. Нулевые наблюдения не изображаем результатами.</p>}
    <small>ECE: {number(active?.ece??null,4)} · калибровка не доказывает положительную доходность.</small>
   </div>
   <div className="paperValidationEvidence">
    <header><span>HOLDOUT / CHRONOLOGICAL</span><b>Доказательная граница</b></header>
    <div><small>Уникальные события</small><strong>{active?.uniqueFixtures??0}</strong></div>
    <div><small>WIN RATE · Wilson 95% интервал</small><strong>{interval?percent(interval[0])+" – "+percent(interval[1]):"—"}</strong></div>
    <div><small>Последние 20% · ретро holdout</small><strong>{active?.holdoutCount??0} событий</strong></div>
    <div><small>BRIER / HOLDOUT</small><strong>{number(active?.holdoutBrier??null,4)}</strong></div>
    <div><small>YIELD / HOLDOUT</small><strong>{signedPercent(active?.holdoutYield??null)}</strong></div>
    <p>Даже положительная ретроспективная доходность здесь <b>не является доказанным преимуществом</b>: пользователь выбирает события, цены не подтверждены как исполнимые, а 80/20 не заменяет заранее зарегистрированный эксперимент.</p>
   </div>
  </div>
  <footer><b>ЗАЩИТА ОТ ЛОЖНЫХ ВЫВОДОВ</b>
   <span>Исключено: ожидающие {report.excluded.unsettled} · ручные {report.excluded.manual} · без доказательств {report.excluded.missingProof} · неверное время {report.excluded.invalidTiming} · повторные записи {report.excluded.duplicate}.</span>
   <span>Для полноценного исследования нужны серверный журнал всех возможностей, заранее фиксированная стратегия, честное сравнение с базовой моделью, независимый период и учёт комиссий/проскальзывания. Пока никаких сигналов к реальным ставкам.</span>
  </footer>
  <AutonomousReplayPanel/>
 </section>;
}
