"use client";

import { useMemo, useState } from "react";
import type { Decision } from "@/lib/domain/types";
import type { LiveEventSummary } from "@/lib/live/types";
import { SportGlyph } from "@/components/SportGlyph";
import {getObservedFreshness} from "@/lib/live/freshness";

const pp = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const decisionClass = (decision: Decision) =>
  decision === "EDGE" ? "edge" : decision === "WATCH" ? "watch" : "pass";

type LiveFilter="all"|"fresh"|"scheduled"|"delayed";
const liveCategory=(event:LiveEventSummary):Exclude<LiveFilter,"all">=>{
 const f=getObservedFreshness(event);
 if(f.freshLive)return "fresh";
 if(event.status==="scheduled")return "scheduled";
 return "delayed";
};
const readinessLabel = (status: string | undefined) =>
  status === "DECISION_READY"
    ? "DECISION READY"
    : status === "GOVERNANCE_BLOCKED"
      ? "GOVERNANCE BLOCKED"
      : status === "MARKET_MAPPING_INCOMPLETE"
        ? "MAP MARKETS"
        : status === "MODEL_INPUT_INCOMPLETE"
          ? "INPUT NEEDED"
          : status === "MODEL_ADAPTER_MISSING"
            ? "ADAPTER NEEDED"
            : "AWAITING DATA";

export function LiveCommandCenter({
  events,
  activeEventId,
  onSelectEvent,
  onSelectSignal,
}: {
  events: LiveEventSummary[];
  activeEventId: string;
  onSelectEvent: (id: string) => void;
  onSelectSignal: (eventId: string, selectionId: string) => void;
}) {
  const [filter,setFilter]=useState<LiveFilter>("all");
  const real=events.filter(x=>x.source==="persisted");
  const counts={
   all:events.length,
   fresh:real.filter(e=>liveCategory(e)==="fresh").length,
   scheduled:real.filter(e=>liveCategory(e)==="scheduled").length,
   delayed:real.filter(e=>liveCategory(e)==="delayed").length,
  };
  const visibleEvents=events.filter(e=>filter==="all"||liveCategory(e)===filter);
  const signals = useMemo(
    () =>
      events
        .flatMap((event) =>
          event.source === "persisted" && getObservedFreshness(event).freshLive && event.primarySignal &&
          Number.isFinite(Date.parse(event.primarySignal.capturedAt)) &&
          Date.now()-Date.parse(event.primarySignal.capturedAt)>=0 &&
          Date.now()-Date.parse(event.primarySignal.capturedAt)<=120_000 &&
          event.primarySignal.decision !== "PASS"
            ? [{ event, signal: event.primarySignal }]
            : [],
        )
        .sort((a, b) => b.signal.score - a.signal.score)
        .slice(0, 7),
    [events],
  );

  const totalMarkets = events.reduce(
    (sum, event) => sum + event.markets,
    0,
  );
  const ready = events.filter((event) => event.source === "persisted" && getObservedFreshness(event).freshLive && event.intelligenceReady).length;

  return (
    <section className="liveCommand" id="live">
      <div className="liveCommandHead">
        <div>
          <span className="panelIndex">01</span>
          <div>
            <h2>МАТЧИ · МОНИТОРИНГ</h2>
            <p>Реальные источники и учебные примеры отмечены отдельно. Данные могут устаревать.</p>
          </div>
        </div>

        <div className="liveCommandStats">
          <span><b>{events.length}</b> EVENTS</span>
          <span><b>{totalMarkets}</b> РЫНКОВ / ВКЛ. ДЕМО</span>
          <span><b>{ready}</b> АКТУАЛЬНЫХ РЕШЕНИЙ</span>
        </div>
      </div>

      <div className="liveCommandFilters" role="group" aria-label="Фильтр матчей по доказанной свежести">
       {([
        ["all","ВСЕ"],["fresh","LIVE ≤120 С"],
        ["scheduled","СКОРО"],["delayed","ЗАДЕРЖКА / АРХИВ"]
       ] as [LiveFilter,string][]).map(([id,label])=>
        <button type="button" key={id} aria-pressed={filter===id}
         className={filter===id?"active":""} onClick={()=>setFilter(id)}>
         {label} <b>{counts[id]}</b>
        </button>)}
       <span>Настоящий LIVE = подтверждённый снимок счёта за последние 120 секунд</span>
      </div>
      <div className="liveCommandBody">
        <div className="liveCommandEvents">
          {visibleEvents.map((event) => {
            const isCurrent=getObservedFreshness(event).freshLive;
            const decisionAt=event.primarySignal?Date.parse(event.primarySignal.capturedAt):NaN;
            const primary=isCurrent&&Number.isFinite(decisionAt)&&
              Date.now()>=decisionAt&&Date.now()-decisionAt<=120_000?
              event.primarySignal:undefined;
            return (
              <button
                className={`liveCommandEvent ${activeEventId === event.id ? "active" : ""}`}
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                type="button"
              >
                <div className="liveCommandEventTop">
                  <span className="liveSportIdentity">
                    <SportGlyph sport={event.sport} size={16} />
                    <i className={event.pulse} />
                    {event.sportLabel}
                    <em className={event.source === "persisted" ? "sourceLive" : "sourceDemo"}>
                      {getObservedFreshness(event).label}
                    </em>
                  </span>
                  <b>{event.clock}</b>
                </div>

                <div className="liveCommandScore">
                  <div>
                    <span>{event.homeCode}</span>
                    <strong>{event.homeScore}</strong>
                  </div>
                  <em>:</em>
                  <div>
                    <span>{event.awayCode}</span>
                    <strong>{event.awayScore}</strong>
                  </div>
                </div>

                <small>{event.competition}</small>

                {primary ? (
                  <div className="liveCommandPrimary">
                    <div>
                      <span>{event.source === "persisted" ? "TOP SIGNAL" : "DEMO SIGNAL"}</span>
                      <strong>{primary.label}</strong>
                    </div>
                    <div>
                      <b className={decisionClass(primary.decision)}>
                        {primary.decision}
                      </b>
                      <em>{pp(primary.edge)}</em>
                    </div>
                  </div>
                ) : (
                  <div className="liveCommandPrimary awaiting">
                    <div>
                      <span>VETO STATUS</span>
                      <strong>
                        {!isCurrent && event.status==="live"
                          ? "LIVE-СТАТУС УСТАРЕЛ · НЕ СИГНАЛ"
                          : event.shadowPredictionCount
                            ? "SHADOW RESEARCH"
                            : readinessLabel(event.decisionReadiness?.status)}
                      </strong>
                    </div>
                    <div>
                      <b>{!isCurrent&&event.status==="live"?"STALE":event.shadowPredictionCount ? "RESEARCH" : "OBSERVED"}</b>
                      <em>
                        {event.shadowPredictionCount
                          ? `${event.shadowPredictionCount} shadow lines`
                          : `${event.markets} markets`}
                      </em>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
          {visibleEvents.length===0&&<div className="liveCommandEmptyFiltered">
           <strong>НЕТ МАТЧЕЙ В ВЫБРАННОЙ КАТЕГОРИИ</strong>
           <p>{filter==="fresh"?
            "Сейчас нет источника со свежим подтверждённым счётом. Сохранённые LIVE-флаги не считаем трансляцией.":
            "Выбери другой фильтр. Матчи и результаты не подставляются искусственно."}</p>
          </div>}
        </div>

        <aside className="signalRadar">
          <div className="signalRadarHead">
            <div>
              <span>SIGNAL RADAR</span>
              <strong>Только подтверждённые свежие решения, не демонстрационные сценарии</strong>
            </div>
            <small>ТЕКУЩИЕ / НЕ СИМУЛЯЦИЯ</small>
          </div>

          <div className="signalRadarList">
            {signals.length > 0 ? (
              signals.map(({ event, signal }, index) => (
                <button
                  className={`signalRadarRow source-${event.source} ${activeEventId === event.id ? "sameEvent" : ""}`}
                  key={`${event.id}-${signal.selectionId}`}
                  onClick={() =>
                    onSelectSignal(event.id, signal.selectionId)
                  }
                  type="button"
                >
                  <span className="signalRadarRank">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="signalRadarIdentity">
                    <span className="signalRadarSport">
                      <SportGlyph sport={event.sport} size={14} />
                      {event.sportLabel} · {event.homeCode}/{event.awayCode}
                    </span>
                    <strong>{signal.label}</strong>
                  </div>
                  <span className="signalRadarProbability">
                    <b>{pct(signal.fairProbability)}</b>
                    <small>FAIR</small>
                  </span>
                  <span className="signalRadarEdge">
                    <b className={signal.edge >= 0 ? "positive" : "negative"}>
                      {pp(signal.edge)}
                    </b>
                    <small>GAP</small>
                  </span>
                  <em className={decisionClass(signal.decision)}>
                    {signal.decision}
                  </em>
                  <strong className="signalRadarScore">
                    {Math.round(signal.score)}
                  </strong>
                </button>
              ))
            ) : (
              <div className="signalRadarEmpty">
                <span>НЕТ ПОДТВЕРЖДЁННЫХ СВЕЖИХ СИГНАЛОВ</span>
                <p>
                  Демо-сигналы, старые цены и неподтверждённые решения не попадают в этот список.
                  Откройте матч, чтобы увидеть сохранённые данные и их источник.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
