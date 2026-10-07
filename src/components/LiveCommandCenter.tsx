"use client";

import { useMemo, useState } from "react";
import type { Opportunity, Sport } from "@/lib/domain/types";
import type { LiveWorkspace } from "@/lib/sandbox/workspaces";
import { SportGlyph } from "@/components/SportGlyph";

const pp = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const decisionClass = (decision: Opportunity["decision"]) =>
  decision === "EDGE" ? "edge" : decision === "WATCH" ? "watch" : "pass";

export function LiveCommandCenter({
  workspaces,
  activeWorkspaceId,
  onSelectEvent,
  onSelectSignal,
}: {
  workspaces: LiveWorkspace[];
  activeWorkspaceId: string;
  onSelectEvent: (id: string) => void;
  onSelectSignal: (eventId: string, selectionId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | Sport>("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? workspaces
        : workspaces.filter((workspace) => workspace.sport === filter),
    [filter, workspaces],
  );

  const signals = useMemo(
    () =>
      workspaces
        .flatMap((workspace) =>
          workspace.opportunities
            .filter((opportunity) => opportunity.decision !== "PASS")
            .map((opportunity) => ({ workspace, opportunity })),
        )
        .sort(
          (a, b) =>
            b.opportunity.opportunityScore - a.opportunity.opportunityScore,
        )
        .slice(0, 7),
    [workspaces],
  );

  const totalMarkets = workspaces.reduce(
    (sum, workspace) => sum + workspace.markets,
    0,
  );
  const totalRepriced = workspaces.reduce(
    (sum, workspace) => sum + workspace.repriced,
    0,
  );

  return (
    <section className="liveCommand" id="live">
      <div className="liveCommandHead">
        <div>
          <span className="panelIndex">01</span>
          <div>
            <h2>LIVE COMMAND</h2>
            <p>Event twins · signal radar · instant sport switching</p>
          </div>
        </div>

        <div className="liveCommandStats">
          <span><b>{workspaces.length}</b> LIVE</span>
          <span><b>{totalMarkets}</b> MARKETS</span>
          <span><b>{totalRepriced}</b> REPRICED</span>
        </div>
      </div>

      <div className="liveCommandFilter">
        {(["all", "football", "basketball", "tennis", "hockey"] as const).map((item) => (
          <button
            className={filter === item ? "active" : ""}
            key={item}
            onClick={() => setFilter(item)}
            type="button"
          >
            <span className="liveFilterIcon">
              {item === "all" ? (
                <i className="liveAllGlyph">◎</i>
              ) : (
                <SportGlyph sport={item} size={16} />
              )}
            </span>
            <span>{item === "all" ? "ALL LIVE" : item.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="liveCommandBody">
        <div className="liveCommandEvents">
          {filtered.map((workspace) => {
            const primary = workspace.opportunities[0];
            return (
              <button
                className={`liveCommandEvent ${activeWorkspaceId === workspace.id ? "active" : ""}`}
                key={workspace.id}
                onClick={() => onSelectEvent(workspace.id)}
                type="button"
              >
                <div className="liveCommandEventTop">
                  <span className="liveSportIdentity">
                    <SportGlyph sport={workspace.sport} size={16} />
                    <i className={workspace.pulse} />
                    {workspace.sportLabel}
                  </span>
                  <b>{workspace.clock}</b>
                </div>

                <div className="liveCommandScore">
                  <div>
                    <span>{workspace.homeCode}</span>
                    <strong>{workspace.homeScore}</strong>
                  </div>
                  <em>:</em>
                  <div>
                    <span>{workspace.awayCode}</span>
                    <strong>{workspace.awayScore}</strong>
                  </div>
                </div>

                <small>{workspace.competition}</small>

                <div className="liveCommandPrimary">
                  <div>
                    <span>TOP SIGNAL</span>
                    <strong>{primary.selection.label}</strong>
                  </div>
                  <div>
                    <b className={decisionClass(primary.decision)}>{primary.decision}</b>
                    <em>{pp(primary.probabilityEdge)}</em>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="signalRadar">
          <div className="signalRadarHead">
            <div>
              <span>SIGNAL RADAR</span>
              <strong>Cross-sport opportunity queue</strong>
            </div>
            <small>RANKED BY VETO SCORE</small>
          </div>

          <div className="signalRadarList">
            {signals.map(({ workspace, opportunity }, index) => (
              <button
                className={`signalRadarRow ${
                  activeWorkspaceId === workspace.id
                    ? "sameEvent"
                    : ""
                }`}
                key={`${workspace.id}-${opportunity.selection.id}`}
                onClick={() =>
                  onSelectSignal(workspace.id, opportunity.selection.id)
                }
                type="button"
              >
                <span className="signalRadarRank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="signalRadarIdentity">
                  <span className="signalRadarSport">
                    <SportGlyph sport={workspace.sport} size={14} />
                    {workspace.sportLabel} · {workspace.homeCode}/{workspace.awayCode}
                  </span>
                  <strong>{opportunity.selection.label}</strong>
                </div>
                <span className="signalRadarProbability">
                  <b>{pct(opportunity.fairProbability)}</b>
                  <small>FAIR</small>
                </span>
                <span className="signalRadarEdge">
                  <b className={opportunity.probabilityEdge >= 0 ? "positive" : "negative"}>
                    {pp(opportunity.probabilityEdge)}
                  </b>
                  <small>EDGE</small>
                </span>
                <em className={decisionClass(opportunity.decision)}>
                  {opportunity.decision}
                </em>
                <strong className="signalRadarScore">
                  {opportunity.opportunityScore}
                </strong>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
