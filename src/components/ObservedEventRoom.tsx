"use client";

import type { LiveObservation } from "@/lib/live/types";
import { SportGlyph } from "@/components/SportGlyph";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

const readinessLabel = (status: string | undefined) =>
  status === "DECISION_PRESENT"
    ? "LEDGER DECISION"
    : status === "DECISION_READY"
      ? "DECISION READY"
      : status === "GOVERNANCE_BLOCKED"
        ? "GOVERNANCE BLOCKED"
        : status === "MARKET_MAPPING_INCOMPLETE"
          ? "MARKET MAPPING"
          : status === "MODEL_INPUT_INCOMPLETE"
            ? "MODEL INPUT"
            : status === "MODEL_ADAPTER_MISSING"
              ? "ADAPTER MISSING"
              : "DATA PENDING";

const print = (value: unknown) => {
  if (value == null) return "—";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  try {
    const text = JSON.stringify(value);
    return text.length > 70 ? `${text.slice(0, 67)}…` : text;
  } catch {
    return "—";
  }
};

export function ObservedEventRoom({
  observation,
}: {
  observation: LiveObservation;
}) {
  const event = observation.summary;
  const signal = observation.latestDecision;
  const readiness = event.decisionReadiness;
  const state = Object.entries(observation.state).slice(0, 8);

  return (
    <section className="observedRoom">
      <header className="observedHero">
        <div className="observedMeta">
          <span><i /> {event.status.toUpperCase()}</span>
          <span>{event.competition}</span>
          <span>CANONICAL · {event.id.slice(0, 8)}</span>
        </div>

        <div className="observedScore">
          <div><small>{event.homeCode}</small><strong>{event.homeName}</strong></div>
          <div className="observedScoreCore">
            <b>{event.homeScore}</b><i>:</i><b>{event.awayScore}</b>
            <em>{event.clock}</em>
          </div>
          <div className="away"><small>{event.awayCode}</small><strong>{event.awayName}</strong></div>
        </div>

        <div className="observedSportMark" aria-hidden>
          <SportGlyph sport={event.sport} size={88} />
        </div>
      </header>

      <div className="observedStatusBand">
        <div><span>DATA STATE</span><strong>OBSERVED</strong><small>Persisted event path</small></div>
        <div><span>MARKETS</span><strong>{event.markets}</strong><small>{observation.quoteCount} quote rows</small></div>
        <div><span>SHADOW</span><strong>{observation.shadowPredictionCount ? "READY" : "EMPTY"}</strong><small>{observation.shadowPredictionCount} research lines</small></div>
        <div><span>LEDGER</span><strong>{observation.decisionCount ? "PRESENT" : "EMPTY"}</strong><small>{observation.decisionCount} decisions</small></div>
        <div><span>VETO STATUS</span><strong>{signal?.decision ?? observation.shadowPredictionCount ? "RESEARCH ONLY" : readinessLabel(readiness?.status)}</strong><small>{signal ? "Persisted decision" : observation.shadowPredictionCount ? "Shadow output · no decision authority" : "Preflight · no synthetic forecast"}</small></div>
      </div>

      <div className="observedBody">
        <section className="observedState">
          <header>
            <div><span>LIVE STATE</span><strong>What the data plane actually knows.</strong></div>
            <small>{observation.stateCapturedAt ? new Date(observation.stateCapturedAt).toLocaleString("en-GB") : "No state snapshot"}</small>
          </header>

          {state.length ? (
            <div className="observedStateGrid">
              {state.map(([key, value]) => (
                <article key={key}>
                  <span>{key.replaceAll("_", " ").toUpperCase()}</span>
                  <strong>{print(value)}</strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="observedEmpty"><span>STATE SNAPSHOT PENDING</span><p>The event exists, but no state snapshot is persisted yet.</p></div>
          )}

          <div className="observedMarketTape">
            <header><span>RECENT MARKET QUOTES</span><small>{observation.quotes.length} shown</small></header>
            {observation.quotes.length ? observation.quotes.slice(0, 12).map((quote) => (
              <article key={`${quote.bookmaker}-${quote.marketKey}-${quote.selectionKey}-${quote.capturedAt}`}>
                <span>{quote.bookmaker}</span>
                <div><strong>{quote.selectionLabel}</strong><small>{quote.marketKey}</small></div>
                <b>{quote.decimalOdds.toFixed(2)}</b>
                <em>{new Date(quote.capturedAt).toLocaleTimeString("en-GB")}</em>
              </article>
            )) : (
              <div className="observedEmpty compact"><span>MARKET FEED PENDING</span><p>No persisted price rows yet.</p></div>
            )}
          </div>
        </section>

        <aside className="observedDecision">
          <div className="observedDecisionHead">
            <span>VETO DECISION LAYER</span>
            <em className={signal ? signal.decision.toLowerCase() : "pending"}>{signal?.decision ?? "PENDING"}</em>
          </div>

          {signal ? (
            <>
              <strong className="observedDecisionTitle">{signal.label}</strong>
              <div className="observedDecisionNumbers">
                <div><span>VETO FAIR</span><strong>{pct(signal.fairProbability)}</strong></div>
                <div><span>MARKET</span><strong>{signal.marketOdds.toFixed(2)}</strong></div>
                <div><span>GAP</span><strong>{pp(signal.edge)}</strong></div>
              </div>
              <p>This decision comes from the persisted ledger. Missing model state is not inferred from the raw feed.</p>
            </>
          ) : (
            <div className="observedAwaiting">
              <span>DECISION PREFLIGHT</span>
              <strong>{readinessLabel(readiness?.status)}</strong>
              <p>
                {readiness?.blockers?.[0] ??
                  "VETO is observing this event, but no immutable prediction/decision exists yet. No EDGE or WATCH is fabricated."}
              </p>
              {readiness?.requirements?.length ? (
                <div className="observedReadinessChecks">
                  {readiness.requirements.map((item) => (
                    <div key={item.id} className={item.passed ? "pass" : "block"}>
                      <i />
                      <span>{item.label}</span>
                      <b>{item.passed ? "PASS" : "BLOCK"}</b>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {!signal && observation.shadowPredictions.length ? (
            <div className="observedShadowPanel">
              <header>
                <div>
                  <span>SHADOW MODEL OUTPUT</span>
                  <strong>RESEARCH ONLY · NO DECISION AUTHORITY</strong>
                </div>
                <small>
                  {new Date(
                    observation.shadowPredictions[0].capturedAt,
                  ).toLocaleTimeString("en-GB")}
                </small>
              </header>
              <p>
                These probabilities come from the persisted shadow pipeline.
                They are visible for research and validation only. VETO has not
                emitted EDGE, WATCH or PASS for them.
              </p>
              <div className="observedShadowList">
                {observation.shadowPredictions.slice(0, 8).map((prediction) => (
                  <article key={prediction.id}>
                    <div>
                      <strong>
                        {prediction.selectionKey
                          .replaceAll("-", " ")
                          .replaceAll("_", " ")}
                      </strong>
                      <small>{prediction.marketKey}</small>
                    </div>
                    <span>
                      <b>{pct(prediction.fairProbability)}</b>
                      <small>FAIR P</small>
                    </span>
                    <span>
                      <b>{prediction.fairOdds.toFixed(2)}</b>
                      <small>FAIR ODDS</small>
                    </span>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="observedLineage">
            <div><span>STATE SOURCE</span><strong>{observation.stateSource ?? "—"}</strong></div>
            <div><span>STATE LATENCY</span><strong>{observation.stateLatencyMs == null ? "—" : `${Math.round(observation.stateLatencyMs)} ms`}</strong></div>
            <div><span>SOURCE MODE</span><strong>PERSISTED</strong></div>
            <div><span>MODEL</span><strong>{observation.shadowPredictions[0]?.modelVersion ?? readiness?.modelVersion ?? "—"}</strong></div>
            <div><span>SHADOW SNAPSHOTS</span><strong>{observation.shadowPredictionCount}</strong></div>
            <div><span>PRODUCTION AUTHORITY</span><strong>{readiness?.productionAuthorized ? "AUTHORIZED" : "BLOCKED"}</strong></div>
          </div>
        </aside>
      </div>
    </section>
  );
}
