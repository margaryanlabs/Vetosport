"use client";

import { useMemo, useState } from "react";
import type { Opportunity } from "@/lib/domain/types";
import type { LiveWorkspace } from "@/lib/sandbox/workspaces";
import { ParallaxView } from "@/components/ParallaxView";
import { SportGlyph } from "@/components/SportGlyph";

type RoomMode = "overview" | "parallax" | "evidence" | "replay";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;
const compactPp = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}`;

export function MatchRoom({
  workspace,
  selected,
  onSelectSignal,
  onOpenLab,
}: {
  workspace: LiveWorkspace;
  selected: Opportunity;
  onSelectSignal: (selectionId: string) => void;
  onOpenLab: () => void;
}) {
  const [mode, setMode] = useState<RoomMode>("overview");

  const marketProbability = 1 / selected.marketOdds;
  const gap = selected.fairProbability - marketProbability;
  const historyLatest = workspace.probabilityHistory.at(-1);
  const historyPrevious = workspace.probabilityHistory.at(-2);
  const vetoMove =
    historyLatest && historyPrevious ? historyLatest.veto - historyPrevious.veto : 0;
  const marketMove =
    historyLatest && historyPrevious ? historyLatest.market - historyPrevious.market : 0;
  const gapPrevious =
    historyPrevious ? historyPrevious.veto - historyPrevious.market : gap;
  const gapOpening = Math.abs(gap) - Math.abs(gapPrevious);

  const parallaxState =
    Math.abs(gap) >= 0.06
      ? "DISLOCATED"
      : Math.abs(gap) >= 0.025
        ? "DIVERGING"
        : "ALIGNED";

  const momentumState =
    vetoMove > 0.01 ? "RISING" : vetoMove < -0.01 ? "FALLING" : "STABLE";

  const authority =
    selected.modelAgreement >= 85
      ? "HIGH"
      : selected.modelAgreement >= 70
        ? "MEDIUM"
        : "LOW";

  const freshness =
    selected.freshnessSeconds <= 20
      ? "FRESH"
      : selected.freshnessSeconds <= 60
        ? "AGING"
        : "STALE";

  const causalSteps = useMemo(() => {
    const stateChange = workspace.changes[0];
    const evidence = workspace.evidence[0];

    return [
      {
        id: "state",
        kicker: "STATE CHANGE",
        title: stateChange?.label ?? workspace.reasonHeadline,
        detail: stateChange?.note ?? workspace.reasonSummary,
        metric: stateChange ? pp(stateChange.delta) : workspace.period,
      },
      {
        id: "model",
        kicker: "MODEL REACTION",
        title: workspace.reasonHeadline,
        detail: evidence?.impact ?? workspace.reasonSummary,
        metric: `VETO ${compactPp(vetoMove)} pp`,
      },
      {
        id: "market",
        kicker: "MARKET MOVE",
        title:
          Math.abs(marketMove) + 0.002 < Math.abs(vetoMove)
            ? "Price is reacting slower than the model."
            : "Price is reacting with the model.",
        detail: `Implied probability moved ${pp(marketMove)} in the latest step.`,
        metric: `MKT ${compactPp(marketMove)} pp`,
      },
      {
        id: "veto",
        kicker: "VETO DIVERGENCE",
        title: `${parallaxState} · ${selected.decision}`,
        detail:
          gapOpening > 0.002
            ? "The Reality ↔ Market gap is still opening."
            : gapOpening < -0.002
              ? "The Reality ↔ Market gap is beginning to close."
              : "The divergence is holding near its current level.",
        metric: pp(gap),
      },
    ];
  }, [
    gap,
    gapOpening,
    marketMove,
    parallaxState,
    selected.decision,
    vetoMove,
    workspace.changes,
    workspace.evidence,
    workspace.period,
    workspace.reasonHeadline,
    workspace.reasonSummary,
  ]);

  return (
    <section className={`matchRoom matchRoom-${workspace.sport}`}>
      <header className="matchRoomHero matchRoomHeroV2">
        <div className="matchRoomMeta">
          <span className="matchRoomLive"><i /> LIVE</span>
          <span>{workspace.competition}</span>
          <span>{workspace.period}</span>
        </div>

        <div className="matchRoomScore matchRoomScoreV2">
          <div className="matchTeamBlock">
            <small>{workspace.homeCode}</small>
            <strong>{workspace.homeName}</strong>
          </div>

          <div className="matchRoomScoreCore">
            <b>{workspace.homeScore}</b>
            <i>:</i>
            <b>{workspace.awayScore}</b>
            <em>{workspace.clock}</em>
          </div>

          <div className="matchTeamBlock away">
            <small>{workspace.awayCode}</small>
            <strong>{workspace.awayName}</strong>
          </div>
        </div>

        <div className="scoreboardTelemetry">
          <div className={`scoreboardMomentum ${momentumState.toLowerCase()}`}>
            <span>STATE MOMENTUM</span>
            <strong>{momentumState}</strong>
            <b>{pp(vetoMove)}</b>
          </div>
          <div>
            <span>PARALLAX</span>
            <strong>{parallaxState}</strong>
            <b>{pp(gap)}</b>
          </div>
          <div>
            <span>AUTHORITY</span>
            <strong>{authority}</strong>
            <b>{selected.modelAgreement}/100</b>
          </div>
          <div className={`freshness ${freshness.toLowerCase()}`}>
            <span>FRESHNESS</span>
            <strong>{freshness}</strong>
            <b>{selected.freshnessSeconds}s</b>
          </div>
        </div>

        <div className="scoreboardPulse" aria-hidden>
          <span style={{ width: `${Math.max(12, Math.min(88, selected.modelAgreement))}%` }} />
        </div>

        <div className="matchRoomSportMark" aria-hidden>
          <SportGlyph sport={workspace.sport} size={96} />
        </div>
      </header>

      <nav className="matchRoomTabs" aria-label="Match room views">
        {([
          ["overview","Overview"],
          ["parallax","Parallax"],
          ["evidence","Evidence"],
          ["replay","Replay"],
        ] as const).map(([id,label]) => (
          <button className={mode===id?"active":""} key={id} onClick={() => setMode(id)} type="button">
            {label}
          </button>
        ))}
        <button className="matchRoomLabButton" onClick={onOpenLab} type="button">
          Open laboratory <span>↗</span>
        </button>
      </nav>

      {mode === "overview" && (
        <div className="matchRoomOverview matchRoomOverviewV2">
          <section className="matchWorld">
            <div className="matchWorldColumns matchWorldColumnsV2">
              <article>
                <span>GAME</span>
                <strong>{workspace.stateMetrics[0]?.value ?? workspace.period}</strong>
                <p>{workspace.reasonHeadline}</p>
              </article>
              <article>
                <span>MARKET</span>
                <strong>{pct(marketProbability)}</strong>
                <p>What price currently implies for {selected.selection.label}.</p>
              </article>
              <article className="veto">
                <span>VETO</span>
                <strong>{pct(selected.fairProbability)}</strong>
                <p>{gap >= 0 ? "Evidence-led reality is ahead of price." : "Price is ahead of the model."}</p>
              </article>
            </div>

            <ParallaxView
              points={workspace.probabilityHistory}
              label={workspace.probabilityLabel}
            />

            <section className="causalTimeline">
              <header>
                <div>
                  <span>CAUSAL TIMELINE</span>
                  <strong>How the current decision formed.</strong>
                </div>
                <small>STATE → MODEL → MARKET → VETO</small>
              </header>

              <div className="causalTimelineFlow">
                {causalSteps.map((step, index) => (
                  <article className={step.id === "veto" ? "veto" : ""} key={step.id}>
                    <div className="causalStepIndex">0{index + 1}</div>
                    <div className="causalStepBody">
                      <span>{step.kicker}</span>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </div>
                    <b>{step.metric}</b>
                    {index < causalSteps.length - 1 && <i aria-hidden>→</i>}
                  </article>
                ))}
              </div>
            </section>
          </section>

          <aside className="vetoDecisionPanel vetoDecisionPanelV2">
            <div className="decisionPanelTop">
              <span>VETO DECISION</span>
              <em className={selected.decision.toLowerCase()}>{selected.decision}</em>
            </div>

            <div className="decisionHero">
              <small>{selected.selection.label}</small>
              <strong>{selected.decision}</strong>
              <p>{pp(gap)} dislocation</p>
            </div>

            <div className="decisionWhyNow">
              <span>WHY NOW?</span>
              <strong>{workspace.reasonHeadline}</strong>
              <p>{workspace.reasonSummary}</p>
            </div>

            <div className="decisionBeliefs">
              <article>
                <span>MARKET BELIEVES</span>
                <strong>{pct(marketProbability)}</strong>
                <p>{selected.marketOdds.toFixed(2)} current market odds</p>
              </article>
              <article className="veto">
                <span>VETO BELIEVES</span>
                <strong>{pct(selected.fairProbability)}</strong>
                <p>{parallaxState.toLowerCase()} Reality ↔ Price state</p>
              </article>
            </div>

            <div className="decisionReasons decisionReasonsV2">
              {selected.rationale.slice(0, 3).map((reason, index) => (
                <div key={reason}>
                  <span>0{index + 1}</span>
                  <p>{reason}</p>
                </div>
              ))}
            </div>

            <div className="decisionBreak">
              <span>WHAT BREAKS THE THESIS</span>
              <p>{workspace.invalidation}</p>
            </div>

            <div className="decisionTrust">
              <div>
                <span>CONFIDENCE</span>
                <strong>{authority}</strong>
                <small>{selected.modelAgreement}/100 agreement</small>
              </div>
              <div>
                <span>FRESHNESS</span>
                <strong>{freshness}</strong>
                <small>{selected.freshnessSeconds}s since refresh</small>
              </div>
              <div>
                <span>RISK</span>
                <strong>{selected.risk}</strong>
                <small>Current thesis risk</small>
              </div>
            </div>

            <details className="decisionMarkets">
              <summary>Other monitored markets <span>+</span></summary>
              <div className="decisionMarketStrip">
                {workspace.opportunities.slice(0,4).map((item) => (
                  <button
                    className={item.selection.id===selected.selection.id?"active":""}
                    key={item.selection.id}
                    onClick={() => onSelectSignal(item.selection.id)}
                    type="button"
                  >
                    <span>{item.decision}</span>
                    <strong>{item.selection.label}</strong>
                    <small>{item.marketOdds.toFixed(2)} · {pp(item.probabilityEdge)}</small>
                  </button>
                ))}
              </div>
            </details>
          </aside>
        </div>
      )}

      {mode === "parallax" && (
        <div className="matchRoomModePanel">
          <ParallaxView points={workspace.probabilityHistory} label={workspace.probabilityLabel} />
          <div className="parallaxExplanation">
            <span>WHAT VETO SEES</span>
            <h3>{workspace.reasonHeadline}</h3>
            <p>{workspace.reasonSummary}</p>
            <div>
              {workspace.stateMetrics.map((metric) => (
                <article key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.note}</small>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "evidence" && (
        <div className="matchRoomModePanel evidenceMode">
          <header>
            <span>EVIDENCE STREAM</span>
            <h3>Why the state changed.</h3>
          </header>
          <div className="evidenceStream">
            {workspace.evidence.map((item) => (
              <article key={`${item.time}-${item.title}`}>
                <span>{item.time}</span>
                <div>
                  <small>{item.kind}</small>
                  <strong>{item.title}</strong>
                  <p>{item.impact}</p>
                </div>
                <b>{Math.round(item.reliability*100)}%</b>
              </article>
            ))}
          </div>
        </div>
      )}

      {mode === "replay" && (
        <div className="matchRoomModePanel replayMode">
          <header>
            <span>STATE REPLAY</span>
            <h3>Reconstruct the last market transition.</h3>
          </header>
          <div className="replayTrack">
            {workspace.changes.map((change,index) => (
              <article key={change.label}>
                <span>0{index+1}</span>
                <i className={change.direction} />
                <div>
                  <strong>{change.label}</strong>
                  <p>{change.note}</p>
                </div>
                <b>{pp(change.delta)}</b>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
