"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale, Sport } from "@/lib/domain/types";
import { dictionaries } from "@/lib/i18n/dictionaries";
import {
  liveWorkspaces,
  workspaceById,
  type LiveWorkspace,
} from "@/lib/sandbox/workspaces";
import { MarketSurfaceExplorer } from "@/components/MarketSurfaceExplorer";
import { AsianLinesBoard } from "@/components/AsianLinesBoard";
import { BacktestLab } from "@/components/BacktestLab";
import { ModelGovernancePanel } from "@/components/ModelGovernancePanel";
import { LiveCommandCenter } from "@/components/LiveCommandCenter";
import { ParallaxCore } from "@/components/ParallaxCore";
import { SpecialistSportSurface } from "@/components/SpecialistSportSurface";
import { VetoMark, VetoWordmark } from "@/components/VetoMark";
import { WorkspaceChrome, type WorkspaceView } from "@/components/WorkspaceChrome";
import { MatchRoom } from "@/components/MatchRoom";
import { SystemStatusPanel } from "@/components/SystemStatusPanel";
import { ObservedEventRoom } from "@/components/ObservedEventRoom";
import type { LiveEventSummary, LiveObservation } from "@/lib/live/types";
import { sandboxFootballBeforeSurface, sandboxFootballSurface } from "@/lib/sandbox/football-model";
import { analyzeModelCouncil } from "@/lib/council/engine";
import { buildCouncilInputs } from "@/lib/council/registry";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
type ProviderStatus = {
  mode: "sandbox" | "gateway-ready" | "partially-configured" | "live-ready";
  providers: {
    canonicalGateway?: { role: string; configured: boolean };
    sportmonks: { role: string; configured: boolean };
    theOddsApi: { role: string; configured: boolean };
  };
};

export function Terminal({ initialEventId }: { initialEventId?: string }) {
  const initialWorkspaceId = initialEventId ?? liveWorkspaces[0].id;
  const [locale, setLocale] = useState<Locale>("ru");
  const [selectedEventId, setSelectedEventId] = useState(initialWorkspaceId);
  const [selectedId, setSelectedId] = useState(liveWorkspaces[0].opportunities[0].selection.id);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [remoteWorkspace, setRemoteWorkspace] = useState<LiveWorkspace | null>(null);
  const [remoteObservation, setRemoteObservation] = useState<LiveObservation | null>(null);
  const [eventSummaries, setEventSummaries] = useState<LiveEventSummary[]>([]);
  const [liveSourceMode, setLiveSourceMode] = useState<
    "checking" | "persisted" | "persisted-error" | "sandbox-fallback"
  >("checking");
  const [activeView, setActiveView] = useState<WorkspaceView>("intelligence");

  useEffect(() => {
    let active = true;

    fetch("/api/providers", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ProviderStatus | null) => {
        if (active && payload) setProviderStatus(payload);
      })
      .catch(() => {
        // The terminal remains in explicit SANDBOX mode if provider health cannot load.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const refreshEvents = () => {
      fetch("/api/live/events", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => response.json().catch(() => null))
        .then(
          (
            payload:
              | {
                  mode?:
                    | "persisted"
                    | "persisted-error"
                    | "sandbox-fallback";
                  events?: LiveEventSummary[];
                }
              | null,
          ) => {
            if (!active || !payload) return;

            const nextEvents = payload.events ?? [];
            const nextMode = payload.mode ?? "sandbox-fallback";
            setEventSummaries(nextEvents);
            setLiveSourceMode(nextMode);

            if (nextEvents.length > 0) {
              setSelectedEventId((current) =>
                nextEvents.some((event) => event.id === current)
                  ? current
                  : nextEvents[0].id,
              );
            } else {
              setRemoteWorkspace(null);
              setRemoteObservation(null);
            }
          },
        )
        .catch(() => {});
    };

    refreshEvents();
    const interval = window.setInterval(refreshEvents, 15_000);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("event") !== selectedEventId) {
      url.searchParams.set("event", selectedEventId);
      window.history.replaceState({}, "", url);
    }
  }, [selectedEventId]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const refreshWorkspace = () => {
      fetch(`/api/live/workspace?id=${encodeURIComponent(selectedEventId)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then(
          (
            payload:
              | {
                  workspace?: LiveWorkspace;
                  observation?: LiveObservation;
                }
              | null,
          ) => {
            if (!active || !payload) return;
            if (payload.workspace?.id === selectedEventId) {
              setRemoteWorkspace(payload.workspace);
              setRemoteObservation(null);
            } else if (payload.observation?.summary.id === selectedEventId) {
              setRemoteWorkspace(null);
              setRemoteObservation(payload.observation);
            }
          },
        )
        .catch(() => {
          // Static server-rendered workspace remains the safe fallback.
        });
    };

    setRemoteWorkspace(null);
    setRemoteObservation(null);
    refreshWorkspace();
    const interval = window.setInterval(refreshWorkspace, 15_000);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [selectedEventId]);

  const dictionary = dictionaries[locale];
  const staticWorkspace = workspaceById[selectedEventId] ?? liveWorkspaces[0];
  const activeWorkspace =
    remoteWorkspace?.id === selectedEventId ? remoteWorkspace : staticWorkspace;
  const activeSummary =
    remoteObservation?.summary ??
    eventSummaries.find((event) => event.id === selectedEventId);
  const truthLiveMode =
    liveSourceMode === "persisted" ||
    liveSourceMode === "persisted-error";
  const checkingFeed = liveSourceMode === "checking";
  const liveFeedEmpty = truthLiveMode && eventSummaries.length === 0;
  const headerEvent =
    activeSummary ??
    (liveSourceMode === "sandbox-fallback"
      ? {
          sport: activeWorkspace.sport,
          competition: activeWorkspace.competition,
          homeCode: activeWorkspace.homeCode,
          awayCode: activeWorkspace.awayCode,
          homeScore: activeWorkspace.homeScore,
          awayScore: activeWorkspace.awayScore,
          clock: activeWorkspace.clock,
        }
      : {
          sport: "football" as Sport,
          competition: checkingFeed
            ? "LIVE DATA · CHECKING"
            : liveSourceMode === "persisted-error"
              ? "LIVE DATA · READ ERROR"
              : "LIVE DATA · NO EVENTS",
          homeCode: "—",
          awayCode: "—",
          homeScore: "—",
          awayScore: "—",
          clock: checkingFeed ? "SYNC" : "OFF AIR",
        });

  useEffect(() => {
    const selectionStillExists = activeWorkspace.opportunities.some(
      (item) => item.selection.id === selectedId,
    );
    if (!selectionStillExists) {
      setSelectedId(activeWorkspace.opportunities[0].selection.id);
    }
  }, [activeWorkspace.id]);

  const selected = useMemo(
    () =>
      activeWorkspace.opportunities.find(
        (item) => item.selection.id === selectedId,
      ) ?? activeWorkspace.opportunities[0],
    [activeWorkspace, selectedId],
  );

  const councilAnalysis = useMemo(
    () =>
      analyzeModelCouncil(
        buildCouncilInputs(
          activeWorkspace.sport,
          activeWorkspace.models,
        ),
      ),
    [activeWorkspace.sport, activeWorkspace.models],
  );
  const councilConsensus = Math.round(
    councilAnalysis.consensusConfidence * 100,
  );

  const configuredProviders = providerStatus
    ? [
        providerStatus.providers.sportmonks,
        providerStatus.providers.theOddsApi,
      ].filter((provider) => provider.configured).length
    : 0;
  const gatewayReady = Boolean(
    providerStatus?.providers?.canonicalGateway?.configured,
  );
  const providerMode =
    providerStatus == null
      ? "CHECKING"
      : configuredProviders > 0
        ? "DIRECT DATA READY"
        : gatewayReady
          ? "GATEWAY READY"
          : "DEMO MODE";
  const selectSport = (sport: Sport) => {
    const persisted = eventSummaries.find(
      (item) => item.sport === sport && item.source === "persisted",
    );
    const target =
      persisted ?? eventSummaries.find((item) => item.sport === sport);
    if (target) setSelectedEventId(target.id);
  };
  const switchView = (view: WorkspaceView) => {
    if (remoteObservation && view === "research") {
      setActiveView("intelligence");
      return;
    }
    setActiveView(view);
  };
  const jumpTo = (target: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };
  const selectEvent = (eventId: string) => {
    if (!eventSummaries.some((event) => event.id === eventId)) return;
    setSelectedEventId(eventId);
    setActiveView("intelligence");
  };
  const selectSignal = (eventId: string, selectionId: string) => {
    if (!eventSummaries.some((event) => event.id === eventId)) return;
    setSelectedEventId(eventId);
    setSelectedId(selectionId);
    setActiveView("intelligence");
  };

  return (
    <WorkspaceChrome
      activeView={activeView}
      onViewChange={switchView}
      activeSport={headerEvent.sport}
      onSportChange={selectSport}
      onJump={jumpTo}
      locale={locale}
      onLocaleChange={setLocale}
      homeCode={headerEvent.homeCode}
      awayCode={headerEvent.awayCode}
      homeScore={headerEvent.homeScore}
      awayScore={headerEvent.awayScore}
      clock={headerEvent.clock}
      competition={headerEvent.competition}
      providerMode={providerMode}
    >
      {activeView === "live" && (
        <div className="workspaceScene workspaceLive">
          <div className="workspaceSceneIntro">
            <span>
              {checkingFeed
                ? "CHECKING LIVE FEED"
                : truthLiveMode
                  ? "LIVE FEED"
                  : "DEMO FEED"}
            </span>
            <strong>
              {checkingFeed
                ? "Synchronizing with the persisted live data plane."
                : liveSourceMode === "persisted-error"
                  ? "Live ingress is ready, but the event read path is unavailable."
                  : liveFeedEmpty
                    ? "No observed live events in the active window."
                    : truthLiveMode
                      ? "Read the match state before the market fully reacts."
                      : "Explore VETO on a clearly labeled simulation."}
            </strong>
            <small>
              {checkingFeed
                ? "No demo data is shown while VETO verifies the live source."
                : liveSourceMode === "persisted-error"
                  ? "Gateway/storage are configured · retrying automatically."
                  : liveFeedEmpty
                    ? "Gateway ready · Truth Journal ready · waiting for the next real event."
                    : truthLiveMode
                      ? "Persisted live data · source lineage preserved"
                      : configuredProviders > 0
                        ? `${configuredProviders}/2 direct adapters configured · demo events remain labeled`
                        : "Demo fallback · live ingestion not configured"}
            </small>
          </div>

      <LiveCommandCenter
        events={eventSummaries}
        activeEventId={selectedEventId}
        onSelectEvent={selectEvent}
        onSelectSignal={selectSignal}
      />
        </div>
      )}

      {activeView === "intelligence" && (
        <div className="workspaceScene workspaceIntelligence">
          {checkingFeed || liveFeedEmpty ? (
            <section className="liveTruthEmpty">
              <span>
                {checkingFeed
                  ? "VERIFYING LIVE SOURCE"
                  : liveSourceMode === "persisted-error"
                    ? "LIVE READ PATH UNAVAILABLE"
                    : "NO LIVE EVENTS"}
              </span>
              <strong>
                {checkingFeed
                  ? "VETO is checking the persisted data plane."
                  : liveSourceMode === "persisted-error"
                    ? "The live gateway is configured, but event reads are temporarily unavailable."
                    : "The live stack is ready. There is simply no real event to inspect right now."}
              </strong>
              <p>
                VETO will not replace an empty real feed with a synthetic match.
                Demo events appear only when live ingestion itself is not configured.
              </p>
              <div>
                <i className={gatewayReady ? "ok" : ""} />
                <span>GATEWAY {gatewayReady ? "READY" : "PENDING"}</span>
                <i className="ok" />
                <span>PERSISTENCE READY</span>
              </div>
            </section>
          ) : remoteObservation ? (
            <ObservedEventRoom observation={remoteObservation} />
          ) : (
            <MatchRoom
              workspace={activeWorkspace}
              selected={selected}
              source={activeSummary?.source ?? "sandbox"}
              onSelectSignal={(selectionId) => setSelectedId(selectionId)}
              onOpenLab={() => setActiveView("research")}
            />
          )}
        </div>
      )}

      {activeView === "research" && (
        <section className="workspaceScene workspaceResearch" id="research">
          <div className="workspaceSceneIntro researchIntro">
            <span>RESEARCH LAB</span>
            <strong>PARALLAX · probability surface · model council · validation</strong>
            <small>
              {activeSummary?.source === "persisted"
                ? "Research layers linked to the selected observed event."
                : "Simulation dataset · research logic only · not a live-market claim."}
            </small>
          </div>

          <div className="v2ResearchBody">
      {activeWorkspace.sport === "football" ? (
        <>
          <ParallaxCore locale={locale} />

          <div id="market-surface">
            <MarketSurfaceExplorer
              current={sandboxFootballSurface}
              previous={sandboxFootballBeforeSurface}
              locale={locale}
            />
          </div>

          <div className="deepMarketGrid" id="pricing">
            <AsianLinesBoard surface={sandboxFootballSurface} locale={locale} />
            <section className="panel scorelineMatrix">
              <div className="panelHeader">
                <div>
                  <span className="panelIndex">07</span>
                  <div>
                    <h2>SCORELINE DISTRIBUTION</h2>
                    <p>Most probable final states</p>
                  </div>
                </div>
              </div>
              <div className="scorelineGrid">
                {sandboxFootballSurface.topScorelines.slice(0, 12).map((row) => (
                  <div className="scorelineCell" key={`${row.homeGoals}-${row.awayGoals}`}>
                    <strong>{row.homeGoals}<i>:</i>{row.awayGoals}</strong>
                    <span>{pct(row.probability)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : (
        <SpecialistSportSurface workspace={activeWorkspace} />
      )}

      <section className="intelligenceSurface" id="models">
        <div className="intelligenceSurfaceHead">
          <div>
            <span className="panelIndex">08</span>
            <div>
              <h2>{dictionary.council}</h2>
              <p>Independent models · one consensus surface</p>
            </div>
          </div>
          <div className="councilConsensus">
            <span>COUNCIL CONF</span>
            <strong>{councilConsensus}</strong>
            <em>/100</em>
          </div>
        </div>

        <div className="councilStrip">
          {activeWorkspace.models.map((model) => {
            const councilModel = councilAnalysis.models.find(
              (item) => item.id === model.id,
            );
            return (
              <article className="councilNode" key={model.id}>
                <div className="councilNodeTop">
                  <span><i className={model.status} />{model.label}</span>
                  <small>{model.latency}</small>
                </div>
                <strong>{pct(model.probability)}</strong>
                <div className="councilLane">
                  <span style={{ width: `${model.probability * 100}%` }} />
                  <i style={{ left: `${model.probability * 100}%` }} />
                </div>
                <div className="councilNodeMeta">
                  <span>
                    WEIGHT <b>{Math.round((councilModel?.adjustedWeight ?? 0) * 100)}%</b>
                  </span>
                  <span>
                    DEP <b>{Math.round((councilModel?.averageDependency ?? 0) * 100)}%</b>
                  </span>
                  <span>
                    PEN <b>{Math.round((councilModel?.independencePenalty ?? 0) * 100)}%</b>
                  </span>
                </div>
                <div className="councilNodeFoot">
                  <span>CONF {Math.round(model.confidence * 100)}</span>
                  <b>{model.status.toUpperCase()}</b>
                </div>
              </article>
            );
          })}
        </div>

        <div className="councilLineageRail">
          <div>
            <span>CONSENSUS P</span>
            <strong>{pct(councilAnalysis.consensusProbability)}</strong>
          </div>
          <div>
            <span>EFFECTIVE MODELS</span>
            <strong>
              {councilAnalysis.effectiveIndependentModels.toFixed(2)}
              <em> / {councilAnalysis.modelCount}</em>
            </strong>
          </div>
          <div>
            <span>INDEPENDENCE</span>
            <strong>{Math.round(councilAnalysis.independenceRatio * 100)}%</strong>
          </div>
          <div>
            <span>DISPERSION</span>
            <strong>{(councilAnalysis.dispersion * 100).toFixed(1)} pp</strong>
          </div>
          <div className="councilDependency">
            <span>STRONGEST DEPENDENCY</span>
            <strong>
              {councilAnalysis.strongestDependency
                ? `${councilAnalysis.strongestDependency.a} ↔ ${councilAnalysis.strongestDependency.b}`
                : "NONE"}
            </strong>
            <small>
              {councilAnalysis.strongestDependency
                ? `${Math.round(
                    councilAnalysis.strongestDependency.combinedDependency * 100,
                  )}% shared dependency`
                : "independent"}
            </small>
          </div>
        </div>

        <div className="intelligenceSurfaceBody">
          <section className="scenarioBranches">
            <div className="intelligenceSubhead">
              <div>
                <span className="panelIndex">09</span>
                <div>
                  <h2>{dictionary.scenarios}</h2>
                  <p>Counterfactual branches</p>
                </div>
              </div>
            </div>

            <div className="scenarioBranchList">
              {activeWorkspace.scenarios.map((scenario, index) => (
                <div className="scenarioBranch" key={scenario.label}>
                  <div className="scenarioBranchLead">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <i />
                    <strong>{scenario.label}</strong>
                  </div>
                  <div className="scenarioBranchProbability">
                    <span>P</span>
                    <strong>{pct(scenario.probability)}</strong>
                    <i><b style={{ width: `${scenario.probability * 100}%` }} /></i>
                  </div>
                  <div className="scenarioBranchOutcomes">
                    {scenario.outcomes.slice(0, 3).map((outcome) => (
                      <span key={outcome.label}>{outcome.label} <b>{pct(outcome.value)}</b></span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="marketTape">
            <div className="intelligenceSubhead">
              <div>
                <span className="panelIndex">10</span>
                <div>
                  <h2>{dictionary.marketPulse}</h2>
                  <p>Price velocity · anomaly tape</p>
                </div>
              </div>
            </div>

            <div className="marketTapeList">
              {activeWorkspace.marketMoves.map((move) => (
                <div className="marketTapeRow" key={`${move.time}-${move.label}`}>
                  <span className="marketTapeTime">{move.time}</span>
                  <div className="marketTapeAsset">
                    <strong>{move.label}</strong>
                    <small>{move.reason}</small>
                  </div>
                  <div className="marketTapePrice">
                    <span>{move.from.toFixed(2)}</span>
                    <i>→</i>
                    <strong>{move.to.toFixed(2)}</strong>
                  </div>
                  <em className={move.explained ? "explained" : "unexplained"}>
                    {move.explained ? "EXPLAINED" : "ANOMALY"}
                  </em>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="ledgerSurface" id="ledger">
        <div className="ledgerSurfaceHead">
          <div>
            <span className="panelIndex">11</span>
            <div>
              <h2>IMMUTABLE LEDGER</h2>
              <p>{dictionary.evidence} · proof trail behind every probability move</p>
            </div>
          </div>
          <div className="ledgerIntegrity">
            <span>LEDGER</span>
            <strong>SEALED</strong>
            <i />
          </div>
        </div>

        <div className="ledgerMetaRail">
          <span>EVENT <b>{activeWorkspace.id.toUpperCase()}-2026-10-06</b></span>
          <span>STATE <b>{activeWorkspace.stateId}</b></span>
          <span>MODEL SET <b>{activeWorkspace.modelVersion}</b></span>
          <span>CAPTURE <b>{activeWorkspace.clock}</b></span>
          <span>MODE <b>RESEARCH</b></span>
        </div>

        <div className="ledgerTimeline">
          {activeWorkspace.evidence.map((item, index) => (
            <article className="ledgerEntry" key={`${item.time}-${item.title}`}>
              <div className="ledgerEntryIndex">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i />
              </div>
              <div className="ledgerEntryTime">
                <strong>{item.time}</strong>
                <span>{item.kind}</span>
              </div>
              <div className="ledgerEntryBody">
                <strong>{item.title}</strong>
                <small>Captured evidence · no post-hoc mutation</small>
              </div>
              <div className="ledgerEntryImpact">
                <span>IMPACT</span>
                <strong>{item.impact}</strong>
              </div>
              <div className="ledgerEntryReliability">
                <span>RELIABILITY</span>
                <strong>{Math.round(item.reliability * 100)}</strong>
              </div>
              <div className="ledgerEntryHash">
                <span>PROOF</span>
                <code>0x{(index + 18429).toString(16).padStart(6, "0")}…{(Math.round(item.reliability * 997)).toString(16)}</code>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div id="validation">
        <BacktestLab
          locale={locale}
          sport={activeWorkspace.sport}
          modelVersion={activeWorkspace.modelVersion}
        />
        <ModelGovernancePanel
          locale={locale}
          sport={activeWorkspace.sport}
          modelVersion={activeWorkspace.modelVersion}
        />
      </div>



          </div>
        </section>
      )}

      {activeView === "system" && (
        <div className="workspaceScene workspaceSystem">
          <SystemStatusPanel />
        </div>
      )}

      <footer className="signalFooter">
        <div className="footerSignalLine"><i /><span>VETO / SIGNAL SYSTEM</span></div>
        <div className="footerBrand footerBrandCanonical">
          <VetoMark size={25} />
          <VetoWordmark className="footerWordmark" />
          <strong>SPORT</strong>
          <span>· MARGARYAN LABS</span>
        </div>
        <p>{dictionary.noGuarantee}</p>
      </footer>
    </WorkspaceChrome>
  );
}

function Metric({ value, label, detail, accent = false }: { value: string; label: string; detail: string; accent?: boolean }) {
  return (
    <div className={`metric ${accent ? "accentMetric" : ""}`}>
      <div className="metricValue">{value}</div>
      <div><strong>{label}</strong><span>{detail}</span></div>
    </div>
  );
}

function StatePill({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className={`statePill ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Signal({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="signal">
      <span>{label}</span>
      <strong className={positive ? "positive" : ""}>{value}</strong>
    </div>
  );
}
