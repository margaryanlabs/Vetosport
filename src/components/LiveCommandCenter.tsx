"use client";

import { useMemo } from "react";
import type { Decision } from "@/lib/domain/types";
import type { LiveEventSummary } from "@/lib/live/types";
import { SportGlyph } from "@/components/SportGlyph";

const pp = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const decisionClass = (decision: Decision) =>
  decision === "EDGE" ? "edge" : decision === "WATCH" ? "watch" : "pass";

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
  const signals = useMemo(
    () =>
      events
        .flatMap((event) =>
          event.primarySignal && event.primarySignal.decision !== "PASS"
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
  const ready = events.filter((event) => event.intelligenceReady).length;

  return (
    <section className="liveCommand" id="live">
      <div className="liveCommandHead">
        <div>
          <span className="panelIndex">01</span>
          <div>
            <h2>LIVE COMMAND</h2>
            <p>Observed events · persisted decisions · no synthetic live claims</p>
          </div>
        </div>

        <div className="liveCommandStats">
          <span><b>{events.length}</b> EVENTS</span>
          <span><b>{totalMarkets}</b> MARKETS</span>
          <span><b>{ready}</b> VETO READY</span>
        </div>
      </div>

      <div className="liveCommandBody">
        <div className="liveCommandEvents">
          {events.map((event) => {
            const primary = event.primarySignal;
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
                      {event.source === "persisted" ? "LIVE DATA" : "DEMO"}
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
                        {event.shadowPredictionCount
                          ? "SHADOW READY"
                          : readinessLabel(event.decisionReadiness?.status)}
                      </strong>
                    </div>
                    <div>
                      <b>{event.shadowPredictionCount ? "RESEARCH" : "OBSERVED"}</b>
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
        </div>

        <aside className="signalRadar">
          <div className="signalRadarHead">
            <div>
              <span>SIGNAL RADAR</span>
              <strong>Live decisions and demo signals are always source-labeled</strong>
            </div>
            <small>RANKED BY VETO SCORE</small>
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
                <span>NO VERIFIED SIGNALS YET</span>
                <p>
                  VETO can observe an event before it emits a decision. The
                  radar stays empty rather than inventing an EDGE.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
