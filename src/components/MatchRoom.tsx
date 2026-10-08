"use client";

import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/lib/domain/types";
import type { LiveWorkspace } from "@/lib/sandbox/workspaces";
import { ParallaxView } from "@/components/ParallaxView";
import { SportGlyph } from "@/components/SportGlyph";

type RoomMode = "overview" | "parallax" | "evidence" | "replay" | "proof";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;
const compactPp = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}`;

type LedgerDecision = {
  id: string;
  eventId: string;
  marketKey: string;
  selectionKey: string;
  decision: Opportunity["decision"];
  decisionMode: string;
  marketOdds: number;
  fairProbability: number;
  opportunityScore: number;
  capturedAt: string;
  immutableFingerprint: string;
  modelVersionSet: string[];
};

type DecisionProofRow = {
  decisionId: string;
  eventId: string;
  sport: string;
  competition: string;
  marketKey: string;
  selectionKey: string;
  predictionAt: string;
  eventStartsAt: string;
  settledAt: string;
  modelVersionSet: string[];
  decisionMode: string;
  decision: Opportunity["decision"];
  fairProbability: number;
  entryOdds: number;
  closingOdds?: number;
  result: "win" | "half_win" | "push" | "half_loss" | "loss" | "void";
  modelAgreement: number;
  uncertainty: number;
};

type ReplaySnapshot = {
  id: string;
  label: string;
  decision: Opportunity["decision"];
  marketProbability: number;
  fairProbability: number;
  marketOdds: number;
  gap: number;
  verified: boolean;
  capturedAt?: string;
  opportunityScore?: number;
};

const replayDecisionFromGap = (gap: number): Opportunity["decision"] =>
  gap >= 0.06 ? "EDGE" : gap >= 0.025 ? "WATCH" : "PASS";

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
  const [ledgerHistory, setLedgerHistory] = useState<LedgerDecision[]>([]);
  const [ledgerStatus, setLedgerStatus] = useState<
    "loading" | "verified" | "reconstructed"
  >("loading");
  const [replayIndex, setReplayIndex] = useState(0);
  const [momentPulse, setMomentPulse] = useState(0);
  const [proofRows, setProofRows] = useState<DecisionProofRow[]>([]);
  const [proofStatus, setProofStatus] = useState<
    "loading" | "verified" | "awaiting" | "unavailable"
  >("loading");

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

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      eventId: selected.eventId,
      marketKey: selected.marketId,
      selectionKey: selected.selection.id,
      limit: "100",
    });

    setLedgerStatus("loading");
    setLedgerHistory([]);

    fetch(`/api/intelligence/decision-history?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("decision history unavailable");
        return response.json() as Promise<{ rows?: LedgerDecision[] }>;
      })
      .then((payload) => {
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        setLedgerHistory(rows);
        setLedgerStatus(rows.length > 0 ? "verified" : "reconstructed");
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        setLedgerHistory([]);
        setLedgerStatus("reconstructed");
      });

    return () => controller.abort();
  }, [selected.eventId, selected.marketId, selected.selection.id]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      eventId: selected.eventId,
      marketKey: selected.marketId,
      selectionKey: selected.selection.id,
      limit: "100",
    });

    setProofStatus("loading");
    setProofRows([]);

    fetch(`/api/intelligence/decision-proof?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("decision proof unavailable");
        return response.json() as Promise<{
          source?: string;
          rows?: DecisionProofRow[];
        }>;
      })
      .then((payload) => {
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        setProofRows(rows);

        if (rows.length > 0) {
          setProofStatus("verified");
          return;
        }

        setProofStatus(
          payload.source === "veto_backtest_rows" ? "awaiting" : "unavailable",
        );
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        setProofRows([]);
        setProofStatus("unavailable");
      });

    return () => controller.abort();
  }, [selected.eventId, selected.marketId, selected.selection.id]);

  const replaySnapshots = useMemo<ReplaySnapshot[]>(() => {
    if (ledgerHistory.length > 0) {
      return ledgerHistory.map((row) => {
        const marketProbability = 1 / row.marketOdds;
        return {
          id: row.id,
          label: new Date(row.capturedAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          decision: row.decision,
          marketProbability,
          fairProbability: row.fairProbability,
          marketOdds: row.marketOdds,
          gap: row.fairProbability - marketProbability,
          verified: true,
          capturedAt: row.capturedAt,
          opportunityScore: row.opportunityScore,
        };
      });
    }

    return workspace.probabilityHistory.map((point, index) => {
      const gap = point.veto - point.market;
      return {
        id: `reconstructed-${index}`,
        label: point.label,
        decision: replayDecisionFromGap(gap),
        marketProbability: point.market,
        fairProbability: point.veto,
        marketOdds: point.market > 0 ? 1 / point.market : 0,
        gap,
        verified: false,
      };
    });
  }, [ledgerHistory, workspace.probabilityHistory]);

  useEffect(() => {
    setReplayIndex(Math.max(0, replaySnapshots.length - 1));
  }, [replaySnapshots.length, selected.selection.id, workspace.id]);

  const replayCurrent =
    replaySnapshots[Math.min(replayIndex, Math.max(0, replaySnapshots.length - 1))];

  const verifiedMomentIndex = useMemo(() => {
    if (ledgerStatus !== "verified") return -1;
    return replaySnapshots.findIndex(
      (snapshot, index) =>
        index > 0 &&
        replaySnapshots[index - 1]?.decision === "WATCH" &&
        snapshot.decision === "EDGE",
    );
  }, [ledgerStatus, replaySnapshots]);

  const reconstructedMomentIndex = useMemo(
    () =>
      replaySnapshots.findIndex(
        (snapshot, index) =>
          index > 0 &&
          replaySnapshots[index - 1]?.decision === "WATCH" &&
          snapshot.decision === "EDGE",
      ),
    [replaySnapshots],
  );

  const momentIndex =
    verifiedMomentIndex >= 0 ? verifiedMomentIndex : reconstructedMomentIndex;
  const momentVerified = verifiedMomentIndex >= 0;
  const momentActive = momentIndex >= 0 && replayIndex === momentIndex;

  const replayPoints = useMemo(
    () =>
      replaySnapshots.slice(0, replayIndex + 1).map((snapshot) => ({
        label: snapshot.label,
        market: snapshot.marketProbability,
        veto: snapshot.fairProbability,
      })),
    [replayIndex, replaySnapshots],
  );

  const jumpToMoment = () => {
    if (momentIndex < 0) return;
    setReplayIndex(momentIndex);
    setMomentPulse((value) => value + 1);
  };

  const firstLedgerEdge = useMemo(
    () => ledgerHistory.find((row) => row.decision === "EDGE"),
    [ledgerHistory],
  );

  const marketCatchup = useMemo(() => {
    const firstEdgeIndex = replaySnapshots.findIndex(
      (snapshot) => snapshot.verified && snapshot.decision === "EDGE",
    );
    if (firstEdgeIndex < 0) return null;

    const firstEdge = replaySnapshots[firstEdgeIndex];
    const initialGap = Math.abs(firstEdge.gap);
    if (initialGap <= 0) return null;

    const catchup = replaySnapshots
      .slice(firstEdgeIndex + 1)
      .find((snapshot) => Math.abs(snapshot.gap) <= initialGap * 0.5);

    if (!catchup) return null;

    const from = firstEdge.capturedAt
      ? new Date(firstEdge.capturedAt).getTime()
      : NaN;
    const to = catchup.capturedAt
      ? new Date(catchup.capturedAt).getTime()
      : NaN;

    return {
      label: catchup.label,
      seconds:
        Number.isFinite(from) && Number.isFinite(to)
          ? Math.max(0, Math.round((to - from) / 1000))
          : null,
    };
  }, [replaySnapshots]);

  const activeProof = useMemo(() => {
    if (proofRows.length === 0) return null;
    return (
      [...proofRows].reverse().find((row) => row.decision === "EDGE") ??
      proofRows[proofRows.length - 1]
    );
  }, [proofRows]);

  const proofMetrics = useMemo(() => {
    if (!activeProof) return null;

    const entryProbability = 1 / activeProof.entryOdds;
    const closingProbability =
      activeProof.closingOdds && activeProof.closingOdds > 1
        ? 1 / activeProof.closingOdds
        : null;
    const thesisDirection = Math.sign(
      activeProof.fairProbability - entryProbability,
    );
    const marketConfirmation =
      closingProbability == null
        ? null
        : thesisDirection * (closingProbability - entryProbability);

    const binaryOutcome =
      activeProof.result === "win"
        ? 1
        : activeProof.result === "loss"
          ? 0
          : null;
    const brierContribution =
      binaryOutcome == null
        ? null
        : (activeProof.fairProbability - binaryOutcome) ** 2;

    const closeStatus =
      marketConfirmation == null
        ? "NO CLOSE"
        : marketConfirmation >= 0.015
          ? "CONFIRMED"
          : marketConfirmation <= -0.015
            ? "REJECTED"
            : "NEUTRAL";

    return {
      entryProbability,
      closingProbability,
      marketConfirmation,
      brierContribution,
      closeStatus,
    };
  }, [activeProof]);

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
          ["proof","Proof"],
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

      {mode === "replay" && replayCurrent && (
        <div className={`matchRoomModePanel replayMode replayModeV2 ${momentActive ? "moment-active" : ""}`}>
          <header className="replayHeaderV2">
            <div>
              <span>REPLAY 2.0</span>
              <h3>Return to what VETO knew at that moment.</h3>
            </div>
            <div className="replayHeaderActions">
              <span className={`replaySourceBadge ${ledgerStatus}`}>
                {ledgerStatus === "verified"
                  ? "VERIFIED LEDGER"
                  : ledgerStatus === "loading"
                    ? "CHECKING LEDGER"
                    : "RECONSTRUCTED"}
              </span>
              {momentIndex >= 0 && (
                <button onClick={jumpToMoment} type="button">
                  {momentVerified ? "Jump to VETO Moment" : "Preview reconstructed transition"}
                </button>
              )}
            </div>
          </header>

          {momentActive && (
            <div
              className={`vetoMoment ${momentVerified ? "verified" : "reconstructed"}`}
              key={`${momentPulse}-${replayIndex}`}
            >
              <i aria-hidden />
              <div>
                <span>{momentVerified ? "VETO MOMENT" : "RECONSTRUCTED TRANSITION"}</span>
                <strong>WATCH → EDGE</strong>
                <p>
                  {momentVerified
                    ? "The immutable decision ledger confirms the moment VETO crossed into EDGE."
                    : "This transition is reconstructed from stored probability history and is not a verified ledger decision."}
                </p>
              </div>
            </div>
          )}

          <div className="replayWorkspace">
            <section className="replayVisual">
              <ParallaxView
                points={replayPoints.length > 0 ? replayPoints : workspace.probabilityHistory.slice(0, 1)}
                label={`${workspace.probabilityLabel} · ${replayCurrent.label}`}
              />

              <div className="replayScrubber">
                <div className="replayScrubberMeta">
                  <span>EARLIEST</span>
                  <strong>{replayCurrent.label}</strong>
                  <span>NOW</span>
                </div>
                <input
                  aria-label="Replay timeline"
                  max={Math.max(0, replaySnapshots.length - 1)}
                  min="0"
                  onChange={(event) => setReplayIndex(Number(event.target.value))}
                  step="1"
                  type="range"
                  value={replayIndex}
                />
                <div className="replayTicks" aria-hidden>
                  {replaySnapshots.map((snapshot, index) => (
                    <i
                      className={`${snapshot.decision.toLowerCase()} ${index === replayIndex ? "active" : ""}`}
                      key={snapshot.id}
                      style={{ left: `${replaySnapshots.length <= 1 ? 0 : (index / (replaySnapshots.length - 1)) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </section>

            <aside className="replaySnapshot">
              <div className="replaySnapshotTop">
                <span>AT THIS MOMENT</span>
                <em className={replayCurrent.decision.toLowerCase()}>{replayCurrent.decision}</em>
              </div>

              <strong className="replaySnapshotTime">{replayCurrent.label}</strong>

              <div className="replaySnapshotNumbers">
                <div>
                  <span>VETO FAIR</span>
                  <strong>{pct(replayCurrent.fairProbability)}</strong>
                </div>
                <div>
                  <span>MARKET</span>
                  <strong>{pct(replayCurrent.marketProbability)}</strong>
                </div>
                <div>
                  <span>GAP</span>
                  <strong>{pp(replayCurrent.gap)}</strong>
                </div>
                <div>
                  <span>ODDS</span>
                  <strong>{replayCurrent.marketOdds > 0 ? replayCurrent.marketOdds.toFixed(2) : "—"}</strong>
                </div>
              </div>

              <div className="replaySnapshotSource">
                <span>SOURCE</span>
                <strong>{replayCurrent.verified ? "IMMUTABLE DECISION LEDGER" : "PROBABILITY HISTORY"}</strong>
                <p>
                  {replayCurrent.verified
                    ? "This point is a persisted VETO decision and can be audited against its captured timestamp."
                    : "This point is reconstructed for product replay because no persisted decision exists for this event/selection yet."}
                </p>
              </div>

              {replayCurrent.verified && replayCurrent.opportunityScore != null && (
                <div className="replayOpportunityScore">
                  <span>OPPORTUNITY SCORE</span>
                  <strong>{Math.round(replayCurrent.opportunityScore)}</strong>
                </div>
              )}
            </aside>
          </div>

          <section className="decisionHistory">
            <header>
              <div>
                <span>DECISION HISTORY</span>
                <strong>{replaySnapshots.length} captured states</strong>
              </div>
              <small>
                {ledgerStatus === "verified"
                  ? "Immutable ledger sequence"
                  : "Reconstructed sequence · not ledger evidence"}
              </small>
            </header>

            <div className="decisionHistoryRail">
              {replaySnapshots.map((snapshot, index) => (
                <button
                  className={`${snapshot.decision.toLowerCase()} ${index === replayIndex ? "active" : ""} ${index === momentIndex ? "moment" : ""}`}
                  key={snapshot.id}
                  onClick={() => {
                    setReplayIndex(index);
                    if (index === momentIndex) setMomentPulse((value) => value + 1);
                  }}
                  type="button"
                >
                  <span>{snapshot.label}</span>
                  <strong>{snapshot.decision}</strong>
                  <small>{pp(snapshot.gap)}</small>
                  {snapshot.verified && <i>✓</i>}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {mode === "proof" && (
        <div className="matchRoomModePanel proofMode">
          <header className="proofHeader">
            <div>
              <span>DECISION PROOF</span>
              <h3>Did the decision deserve to exist?</h3>
              <p>
                Outcome is only one part of the audit. VETO separately measures
                timing, market confirmation, calibration and immutable lineage.
              </p>
            </div>
            <span className={`proofStatusBadge ${proofStatus}`}>
              {proofStatus === "verified"
                ? "VERIFIED SETTLEMENT"
                : proofStatus === "awaiting"
                  ? "AWAITING SETTLEMENT"
                  : proofStatus === "loading"
                    ? "CHECKING EVIDENCE"
                    : "RECONSTRUCTED PREVIEW"}
            </span>
          </header>

          {activeProof && proofMetrics ? (
            <>
              <section className="proofVerdict">
                <div>
                  <span>DECISION</span>
                  <strong>{activeProof.decision}</strong>
                  <small>{selected.selection.label}</small>
                </div>
                <div>
                  <span>RESULT</span>
                  <strong>{activeProof.result.replaceAll("_", " ").toUpperCase()}</strong>
                  <small>
                    settled {new Date(activeProof.settledAt).toLocaleString("en-GB")}
                  </small>
                </div>
                <div className={`market-${proofMetrics.closeStatus.toLowerCase().replace(" ","-")}`}>
                  <span>MARKET VERDICT</span>
                  <strong>{proofMetrics.closeStatus}</strong>
                  <small>
                    {proofMetrics.marketConfirmation == null
                      ? "No closing price"
                      : `${pp(proofMetrics.marketConfirmation)} toward VETO thesis`}
                  </small>
                </div>
              </section>

              <section className="proofMetrics">
                <article>
                  <span>FIRST VERIFIED EDGE</span>
                  <strong>
                    {firstLedgerEdge
                      ? new Date(firstLedgerEdge.capturedAt).toLocaleTimeString("en-GB")
                      : "—"}
                  </strong>
                  <p>
                    {firstLedgerEdge
                      ? `Fingerprint ${firstLedgerEdge.immutableFingerprint.slice(0, 10)}…`
                      : "No verified EDGE row in decision ledger."}
                  </p>
                </article>

                <article>
                  <span>MARKET CATCH-UP</span>
                  <strong>
                    {marketCatchup
                      ? marketCatchup.seconds == null
                        ? marketCatchup.label
                        : `${marketCatchup.seconds}s`
                      : "NOT SEEN"}
                  </strong>
                  <p>Defined as the verified Reality ↔ Market gap shrinking by at least 50%.</p>
                </article>

                <article>
                  <span>CLOSING MOVE</span>
                  <strong>
                    {proofMetrics.marketConfirmation == null
                      ? "—"
                      : pp(proofMetrics.marketConfirmation)}
                  </strong>
                  <p>
                    Entry {activeProof.entryOdds.toFixed(2)}
                    {activeProof.closingOdds
                      ? ` → close ${activeProof.closingOdds.toFixed(2)}`
                      : " · closing odds unavailable"}
                  </p>
                </article>

                <article>
                  <span>BRIER CONTRIBUTION</span>
                  <strong>
                    {proofMetrics.brierContribution == null
                      ? "N/A"
                      : proofMetrics.brierContribution.toFixed(4)}
                  </strong>
                  <p>
                    {proofMetrics.brierContribution == null
                      ? "Push/void/half outcomes are not forced into a binary calibration score."
                      : `Fair probability ${pct(activeProof.fairProbability)} against the realized binary outcome.`}
                  </p>
                </article>
              </section>

              <section className="proofNarrative">
                <div className="proofNarrativeMain">
                  <span>WHAT THIS PROVES</span>
                  <h4>
                    {proofMetrics.closeStatus === "CONFIRMED"
                      ? "The closing market moved in the direction of VETO's original thesis."
                      : proofMetrics.closeStatus === "REJECTED"
                        ? "The closing market moved against VETO's original thesis."
                        : "The closing market did not materially validate or reject the original thesis."}
                  </h4>
                  <p>
                    A winning result does not automatically make a decision good,
                    and a losing result does not automatically make it bad. This
                    proof separates price discovery, calibration and settlement.
                  </p>
                </div>

                <div className="proofAuditGrid">
                  <div>
                    <span>MODEL AGREEMENT</span>
                    <strong>{Math.round(activeProof.modelAgreement)}/100</strong>
                  </div>
                  <div>
                    <span>UNCERTAINTY</span>
                    <strong>{pct(activeProof.uncertainty)}</strong>
                  </div>
                  <div>
                    <span>MODEL LINEAGE</span>
                    <strong>{activeProof.modelVersionSet.length || 0}</strong>
                  </div>
                  <div>
                    <span>MODE</span>
                    <strong>{activeProof.decisionMode}</strong>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="proofEmpty">
              <span>
                {proofStatus === "awaiting"
                  ? "SETTLEMENT PENDING"
                  : proofStatus === "loading"
                    ? "CHECKING LEDGER"
                    : "NO VERIFIED PROOF YET"}
              </span>
              <h4>
                {proofStatus === "awaiting"
                  ? "The decision exists, but the event has not produced a settled proof row yet."
                  : "This sandbox/live event cannot be presented as post-match proof."}
              </h4>
              <p>
                Replay can still reconstruct how probabilities moved, but VETO will
                not label the decision as proven until immutable decision history,
                settlement and closing-price evidence exist.
              </p>

              <div className="proofPreviewGrid">
                <div>
                  <span>CURRENT DECISION</span>
                  <strong>{selected.decision}</strong>
                </div>
                <div>
                  <span>CURRENT GAP</span>
                  <strong>{pp(gap)}</strong>
                </div>
                <div>
                  <span>LEDGER</span>
                  <strong>{ledgerStatus === "verified" ? "PRESENT" : "NOT VERIFIED"}</strong>
                </div>
                <div>
                  <span>SETTLEMENT</span>
                  <strong>{proofStatus === "awaiting" ? "PENDING" : "UNAVAILABLE"}</strong>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

    </section>
  );
}
