"use client";

import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/lib/domain/types";
import type { LiveWorkspace } from "@/lib/sandbox/workspaces";
import { SportGlyph } from "@/components/SportGlyph";

const pp = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const decisionClass = (decision: Opportunity["decision"]) =>
  decision === "EDGE" ? "edge" : decision === "WATCH" ? "watch" : "pass";

type PersistedLiveEvent = {
  id: string;
  source: "persisted";
  provider: string;
  sport: import("@/lib/domain/types").Sport;
  sportLabel: string;
  competition: string;
  status: string;
  startsAt: string;
  freshnessSeconds: number | null;
  home: { name: string; score: number | null };
  away: { name: string; score: number | null };
  state: {
    period: string | null;
    elapsedSeconds: number | null;
    remainingSeconds: number | null;
  };
  market: {
    quotes: number;
    markets: number;
    latestQuoteAt: string | null;
  };
  model: {
    status: "MODEL_PENDING" | "DECISION_READY";
    decisions: number;
    latestDecision: Opportunity["decision"] | null;
    latestDecisionAt: string | null;
    opportunityScore: number | null;
  };
};

type LiveFeedPayload = {
  mode: "live-feed" | "gateway-ready" | "gateway-degraded" | "sandbox";
  runtimeMode?: string;
  warning?: string | null;
  events?: PersistedLiveEvent[];
};

const age = (seconds: number | null) => {
  if (seconds == null) return "NO STATE";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
};

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
  const [liveFeed, setLiveFeed] = useState<LiveFeedPayload | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const refresh = () => {
      fetch("/api/live/events", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as LiveFeedPayload;
          if (!response.ok && payload.mode !== "gateway-degraded") {
            throw new Error("Live feed request failed.");
          }
          return payload;
        })
        .then((payload) => {
          if (active) setLiveFeed(payload);
        })
        .catch((error) => {
          if ((error as Error).name === "AbortError") return;
          if (active) {
            setLiveFeed({
              mode: "gateway-degraded",
              warning: "Persisted live feed is temporarily unavailable.",
              events: [],
            });
          }
        });
    };

    refresh();
    const interval = window.setInterval(refresh, 15_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const persistedEvents = liveFeed?.events ?? [];

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
          <span><b>{workspaces.length}</b> DEMO EVENTS</span>
          <span><b>{totalMarkets}</b> MARKETS</span>
          <span><b>{totalRepriced}</b> REPRICED</span>
        </div>
      </div>

      <section className="ingestedLiveFeed">
        <header>
          <div>
            <span>INGESTED LIVE FEED</span>
            <strong>
              {liveFeed?.mode === "live-feed"
                ? `${persistedEvents.length} persisted event${persistedEvents.length === 1 ? "" : "s"}`
                : liveFeed?.mode === "gateway-degraded"
                  ? "Feed read degraded"
                  : "Gateway ready · waiting for event push"}
            </strong>
          </div>
          <em className={liveFeed?.mode ?? "loading"}>
            {liveFeed?.runtimeMode ?? (liveFeed ? liveFeed.mode.toUpperCase() : "CHECKING")}
          </em>
        </header>

        {persistedEvents.length > 0 ? (
          <div className="ingestedLiveCards">
            {persistedEvents.slice(0, 8).map((event) => (
              <article key={event.id}>
                <div className="ingestedLiveTop">
                  <span>
                    <SportGlyph sport={event.sport} size={14} />
                    {event.sportLabel} · {event.provider}
                  </span>
                  <b>{event.status.toUpperCase()}</b>
                </div>

                <div className="ingestedLiveTeams">
                  <div>
                    <strong>{event.home.name}</strong>
                    <b>{event.home.score ?? "—"}</b>
                  </div>
                  <i>:</i>
                  <div>
                    <strong>{event.away.name}</strong>
                    <b>{event.away.score ?? "—"}</b>
                  </div>
                </div>

                <small>{event.competition}</small>

                <div className="ingestedLiveMeta">
                  <span>STATE <b>{age(event.freshnessSeconds)}</b></span>
                  <span>MARKETS <b>{event.market.markets}</b></span>
                  <span>QUOTES <b>{event.market.quotes}</b></span>
                </div>

                <div className="ingestedLiveModel">
                  <span>VETO MODEL</span>
                  <strong className={event.model.status === "DECISION_READY" ? "ready" : "pending"}>
                    {event.model.status === "DECISION_READY"
                      ? event.model.latestDecision ?? "DECISION READY"
                      : "MODEL PENDING"}
                  </strong>
                  <small>
                    {event.model.status === "DECISION_READY"
                      ? `${event.model.decisions} persisted decisions`
                      : "Live data is real. No VETO decision has been persisted yet."}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="ingestedLiveEmpty">
            <i />
            <div>
              <strong>
                {liveFeed?.mode === "gateway-degraded"
                  ? "Live-feed read is degraded."
                  : "Canonical gateway is ready."}
              </strong>
              <p>
                {liveFeed?.warning ??
                  "Waiting for the first real normalized event. Nothing synthetic is shown in this live-data lane."}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="sandboxDivider">
        <span>SANDBOX DEMO</span>
        <i />
        <small>Model/UI validation only · never presented as live provider data</small>
      </div>

      <div className="liveCommandBody">
        <div className="liveCommandEvents">
          {workspaces.map((workspace) => {
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
                  <small>GAP</small>
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
