"use client";

import { useMemo, useState } from "react";
import type { Opportunity } from "@/lib/domain/types";
import type { LiveWorkspace } from "@/lib/sandbox/workspaces";
import { ParallaxView } from "@/components/ParallaxView";
import { SportGlyph } from "@/components/SportGlyph";

type RoomMode = "overview" | "parallax" | "evidence" | "replay";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

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

  const timeline = useMemo(
    () =>
      workspace.evidence.slice(0, 5).map((item, index) => ({
        time: item.time,
        kicker: item.kind,
        title: item.title,
        impact: item.impact,
        hot: index === 0,
      })),
    [workspace.evidence],
  );

  return (
    <section className={`matchRoom matchRoom-${workspace.sport}`}>
      <header className="matchRoomHero">
        <div className="matchRoomMeta">
          <span className="matchRoomLive"><i /> LIVE</span>
          <span>{workspace.competition}</span>
          <span>{workspace.period}</span>
        </div>

        <div className="matchRoomScore">
          <div>
            <small>{workspace.homeCode}</small>
            <strong>{workspace.homeName}</strong>
          </div>
          <div className="matchRoomScoreCore">
            <b>{workspace.homeScore}</b>
            <i>:</i>
            <b>{workspace.awayScore}</b>
            <em>{workspace.clock}</em>
          </div>
          <div className="away">
            <small>{workspace.awayCode}</small>
            <strong>{workspace.awayName}</strong>
          </div>
        </div>

        <div className="matchRoomSportMark" aria-hidden>
          <SportGlyph sport={workspace.sport} size={88} />
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
        <div className="matchRoomOverview">
          <section className="matchWorld">
            <div className="matchWorldColumns">
              <article>
                <span>GAME</span>
                <strong>{workspace.stateMetrics[0]?.value ?? workspace.period}</strong>
                <p>{workspace.reasonHeadline}</p>
              </article>
              <article>
                <span>MARKET</span>
                <strong>{pct(marketProbability)}</strong>
                <p>Current implied probability for {selected.selection.label}.</p>
              </article>
              <article className="veto">
                <span>VETO</span>
                <strong>{pct(selected.fairProbability)}</strong>
                <p>{gap >= 0 ? "Reality is ahead of price." : "Price is ahead of the model."}</p>
              </article>
            </div>

            <ParallaxView points={workspace.probabilityHistory} label={workspace.probabilityLabel} />

            <div className="matchTimeline">
              <div className="matchTimelineRail" />
              {timeline.map((item) => (
                <article className={item.hot ? "hot" : ""} key={`${item.time}-${item.title}`}>
                  <span>{item.time}</span>
                  <i />
                  <div>
                    <small>{item.kicker}</small>
                    <strong>{item.title}</strong>
                  </div>
                  <b>{item.impact}</b>
                </article>
              ))}
            </div>
          </section>

          <aside className="vetoDecisionPanel">
            <div className="decisionPanelTop">
              <span>VETO DECISION</span>
              <em className={selected.decision.toLowerCase()}>{selected.decision}</em>
            </div>

            <div className="decisionSelection">
              <small>SELECTED MARKET</small>
              <strong>{selected.selection.label}</strong>
            </div>

            <div className="decisionNumbers">
              <div>
                <span>VETO FAIR</span>
                <strong>{pct(selected.fairProbability)}</strong>
              </div>
              <div>
                <span>MARKET</span>
                <strong>{pct(marketProbability)}</strong>
              </div>
              <div className="gap">
                <span>DISLOCATION</span>
                <strong>{pp(gap)}</strong>
              </div>
            </div>

            <p className="decisionThesis">{workspace.reasonSummary}</p>

            <div className="decisionReasons">
              {selected.rationale.slice(0, 3).map((reason, index) => (
                <div key={reason}>
                  <span>0{index + 1}</span>
                  <p>{reason}</p>
                </div>
              ))}
            </div>

            <div className="decisionConfidence">
              <span>MODEL AGREEMENT</span>
              <strong>{selected.modelAgreement}/100</strong>
              <i><b style={{width:`${selected.modelAgreement}%`}} /></i>
            </div>

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

            <details className="decisionEvidence">
              <summary>Open evidence <span>+</span></summary>
              <div>
                <p><strong>Risk:</strong> {selected.risk}</p>
                <p><strong>Invalidation:</strong> {workspace.invalidation}</p>
                <p><strong>Freshness:</strong> {selected.freshnessSeconds}s</p>
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
