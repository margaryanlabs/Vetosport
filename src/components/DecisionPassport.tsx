"use client";

import type {LiveObservation} from "@/lib/live/types";
import {getObservedFreshness} from "@/lib/live/freshness";
import "./decision-passport.css";

const validAge=(iso:string|undefined,now:number)=> {
  if(!iso||!Number.isFinite(Date.parse(iso)))return null;
  const elapsed=now-Date.parse(iso);
  return elapsed>=0?Math.round(elapsed/1000):null;
};
const humanAge=(seconds:number|null)=>seconds===null?"время неизвестно":seconds<60?`${seconds} сек`:`${Math.floor(seconds/60)} мин`;
const time=(iso:string|undefined)=>iso&&Number.isFinite(Date.parse(iso))
  ?new Date(iso).toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})
  :"нет метки";
const percent=(n:number)=>`${(100*n).toFixed(1).replace(".",",")}%`;

export function DecisionPassport({observation}:{observation:LiveObservation}){
  const event=observation.summary,now=Date.now(),stateAge=validAge(observation.stateCapturedAt??event.lastUpdatedAt,now);
  const stateFresh=getObservedFreshness(event,now).freshLive&&stateAge!==null&&stateAge<=120;
  const signal=observation.latestDecision;
  const matching=signal?observation.quotes.filter(q=>q.marketKey===signal.marketKey
    &&q.selectionKey===signal.selectionId&&q.decimalOdds>1&&!q.suspended):[];
  const latestMatching=matching.sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt))[0];
  const quoteAge=validAge(latestMatching?.capturedAt,now);
  const quoteFresh=quoteAge!==null&&quoteAge<=120&&event.status==="live";
  const blockers=[
    {id:"state",label:"Состояние матча",pass:stateFresh,
      detail:stateFresh?`Обновлено ${humanAge(stateAge)} назад`: `Нет свежего игрового состояния · ${humanAge(stateAge)}`},
    {id:"quote",label:"Цена по тому же контракту",pass:quoteFresh,
      detail:quoteFresh?"Есть свежий сохранённый снимок · доступность ставки не подтверждена":
        signal?"Нет совпавшей свежей цены на этот рынок и исход":"Нечего сравнивать: нет доказанного решения и привязанной к нему цены"},
    {id:"model",label:"Независимая вероятность",pass:false,
      detail:"Верификация модели на независимых матчах пока не подтверждена"},
    {id:"execution",label:"Исполнимость коэффициента",pass:false,
      detail:"Лимиты, задержка, букмекер и фактическое исполнение не проверены"},
  ];
  const status=event.source!=="persisted"?"DEMO":!stateFresh?"PASS":quoteFresh?"RESEARCH":"WATCH";
  const title=status==="PASS"?"Нет актуальной основы для решения":
    status==="RESEARCH"?"Интересно для исследования, не для ставки":
    status==="WATCH"?"Наблюдаем: подтверждения неполные":"Это учебный пример";
  const percentage=signal&&Number.isFinite(signal.fairProbability)&&
    signal.fairProbability>=0&&signal.fairProbability<=1
    ?percent(signal.fairProbability):null;
  return <section className="decisionPassport" id="veto-proof-of-edge" aria-labelledby="passport-title">
    <div className="passportIdentity">
      <div><span className="passportEyebrow"><i/> VETO / DECISION PASSPORT</span>
        <h2 id="passport-title">Что мы знаем. Чего пока не знаем.</h2>
        <p>Каждая оценка опирается на проверяемый источник. Если данных недостаточно, мы не предлагаем вымышленную ставку.</p>
      </div>
      <div className={`passportStatus passport-${status.toLowerCase()}`}>
        <small>ТЕКУЩЕЕ СОСТОЯНИЕ</small><strong>{status==="RESEARCH"?"ИССЛЕДОВАТЬ":status==="WATCH"?"НАБЛЮДАТЬ":status==="PASS"?"ПРОПУСТИТЬ":"ДЕМО"}</strong>
        <span>{title}</span>
      </div>
    </div>
    <div className="passportMetrics">
      <div><span>ИГРОВОЕ СОСТОЯНИЕ</span><strong>{stateFresh?"Свежее":"Не подтверждено"}</strong><small>{time(observation.stateCapturedAt)} · {observation.stateSource??"источник неизвестен"}</small></div>
      <div><span>РЕАЛЬНАЯ КОТИРОВКА</span><strong>{quoteFresh&&latestMatching?latestMatching.decimalOdds.toFixed(2):"—"}</strong><small>{quoteFresh? `Записана ${time(latestMatching?.capturedAt)} · не доказано исполнение`:"Нет подходящей актуальной котировки"}</small></div>
      <div><span>МОДЕЛЬНАЯ ОЦЕНКА</span><strong>{percentage??"—"}</strong><small>{percentage?"Из архива решений · независимая проверка ещё требуется":"Нет подтверждённой вероятности для этого исхода"}</small></div>
      <div><span>ПОДТВЕРЖДЁННЫЙ EDGE</span><strong className="passportZero">0</strong><small>До верификации вероятности, цены и исполнения</small></div>
    </div>
    <div className="passportEvidence">
      <div className="passportEvidenceHead"><h3>Цепочка доказательств</h3>
        <span>{blockers.filter(x=>x.pass).length} / {blockers.length} технических условий</span></div>
      <div className="passportEvidenceGrid">{blockers.map(b=><article key={b.id}>
        <div><span className={b.pass?"passportCheck pass":"passportCheck fail"} aria-hidden>{b.pass?"✓":"—"}</span><strong>{b.label}</strong></div>
        <p>{b.detail}</p>
      </article>)}</div>
      <footer><p><b>Почему не рекомендуем ставку?</b> Снимок счёта, цена букмекера и прогноз — разные свидетельства. Даже совпадение цены и модели само по себе не доказывает положительную доходность.</p>
        <a href="/research/discovery">Исследовать другие закономерности ↗</a></footer>
    </div>
  </section>;
}
