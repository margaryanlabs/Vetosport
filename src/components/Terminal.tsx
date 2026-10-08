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
import { WorkspaceChrome, type WorkspaceView } from "@/components/WorkspaceChrome";
import { MatchRoom } from "@/components/MatchRoom";
import { SystemStatusPanel } from "@/components/SystemStatusPanel";
import { sandboxFootballBeforeSurface, sandboxFootballSurface } from "@/lib/sandbox/football-model";
import { analyzeModelCouncil } from "@/lib/council/engine";
import { buildCouncilInputs } from "@/lib/council/registry";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
type ProviderStatus = {
  mode: "sandbox" | "partially-configured";
  providers: {
    sportmonks: { role: string; configured: boolean };
    theOddsApi: { role: string; configured: boolean };
  };
};

export function Terminal({ initialEventId }: { initialEventId?: string }) {
  const initialWorkspaceId =
    initialEventId && workspaceById[initialEventId]
      ? initialEventId
      : liveWorkspaces[0].id;
  const [locale, setLocale] = useState<Locale>("ru");
  const [selectedEventId, setSelectedEventId] = useState(initialWorkspaceId);
  const [selectedId, setSelectedId] = useState(liveWorkspaces[0].opportunities[0].selection.id);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [remoteWorkspace, setRemoteWorkspace] = useState<LiveWorkspace | null>(null);
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
        .then((payload: { workspace?: LiveWorkspace } | null) => {
          if (
            active &&
            payload?.workspace &&
            payload.workspace.id === selectedEventId
          ) {
            setRemoteWorkspace(payload.workspace);
          }
        })
        .catch(() => {
          // Static server-rendered workspace remains the safe fallback.
        });
    };

    setRemoteWorkspace(null);
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
    ? Object.values(providerStatus.providers).filter((provider) => provider.configured).length
    : 0;
  const providerMode = configuredProviders > 0 ? "ADAPTERS CONFIGURED" : "SANDBOX";
  const selectSport = (sport: Sport) => {
    const workspace = liveWorkspaces.find((item) => item.sport === sport);
    if (workspace) setSelectedEventId(workspace.id);
  };
  const switchView = (view: WorkspaceView) => {
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
    if (!workspaceById[eventId]) return;
    setSelectedEventId(eventId);
    setActiveView("intelligence");
  };
  const selectSignal = (eventId: string, selectionId: string) => {
    if (!workspaceById[eventId]) return;
    setSelectedEventId(eventId);
    setSelectedId(selectionId);
    setActiveView("intelligence");
  };

  return (
    <WorkspaceChrome
      activeView={activeView}
      onViewChange={switchView}
      activeSport={activeWorkspace.sport}
      onSportChange={selectSport}
      onJump={jumpTo}
      locale={locale}
      onLocaleChange={setLocale}
      homeCode={activeWorkspace.homeCode}
      awayCode={activeWorkspace.awayCode}
      homeScore={activeWorkspace.homeScore}
      awayScore={activeWorkspace.awayScore}
      clock={activeWorkspace.clock}
      competition={activeWorkspace.competition}
      providerMode={providerMode}
    >
      {activeView === "live" && (
        <div className="workspaceScene workspaceLive">
          <div className="workspaceSceneIntro">
            <span>LIVE ARENA</span>
            <strong>Follow the game. Catch the market reaction.</strong>
            <small>{configuredProviders > 0 ? `${configuredProviders}/2 live adapters configured` : "Sandbox feed · live adapters awaiting keys"}</small>
          </div>

      <LiveCommandCenter
        workspaces={liveWorkspaces}
        activeWorkspaceId={activeWorkspace.id}
        onSelectEvent={selectEvent}
        onSelectSignal={selectSignal}
      />
        </div>
      )}

      {activeView === "intelligence" && (
        <div className="workspaceScene workspaceIntelligence">
          <MatchRoom
            workspace={activeWorkspace}
            selected={selected}
            onSelectSignal={(selectionId) => setSelectedId(selectionId)}
            onOpenLab={() => setActiveView("research")}
          />
        </div>
      )}

      {activeView === "research" && (
        <section className="workspaceScene workspaceResearch" id="research">
          <div className="workspaceSceneIntro researchIntro">
            <span>RESEARCH LAB</span>
            <strong>PARALLAX · probability surface · model council · validation</strong>
            <small>Deep layers stay here, away from the live operating surface.</small>
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
