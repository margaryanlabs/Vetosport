"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale, Opportunity } from "@/lib/domain/types";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { liveWorkspaces, workspaceById } from "@/lib/sandbox/workspaces";
import { ProbabilityChart } from "@/components/ProbabilityChart";
import { MarketSurfaceExplorer } from "@/components/MarketSurfaceExplorer";
import { AsianLinesBoard } from "@/components/AsianLinesBoard";
import { BacktestLab } from "@/components/BacktestLab";
import { ModelGovernancePanel } from "@/components/ModelGovernancePanel";
import { SpecialistSportSurface } from "@/components/SpecialistSportSurface";
import { VetoMark } from "@/components/VetoMark";
import { sandboxFootballBeforeSurface, sandboxFootballSurface } from "@/lib/sandbox/football-model";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} п.п.`;

const decisionClass = (decision: Opportunity["decision"]) =>
  decision === "EDGE" ? "edge" : decision === "WATCH" ? "watch" : "pass";

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
  const [marketMode, setMarketMode] = useState<"all" | "edges">("all");
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

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

  const dictionary = dictionaries[locale];
  const activeWorkspace = workspaceById[selectedEventId] ?? liveWorkspaces[0];

  useEffect(() => {
    setSelectedId(activeWorkspace.opportunities[0].selection.id);
    setMarketMode("all");
  }, [activeWorkspace.id]);

  const selected = useMemo(
    () =>
      activeWorkspace.opportunities.find(
        (item) => item.selection.id === selectedId,
      ) ?? activeWorkspace.opportunities[0],
    [activeWorkspace, selectedId],
  );

  const visibleOpportunities =
    marketMode === "edges"
      ? activeWorkspace.opportunities.filter((item) => item.decision !== "PASS")
      : activeWorkspace.opportunities;

  const primarySignal = activeWorkspace.opportunities[0];
  const primaryMarketProbability = 1 / primarySignal.marketOdds;
  const primaryGap = primarySignal.fairProbability - primaryMarketProbability;
  const councilConsensus = Math.round(
    activeWorkspace.models.reduce(
      (sum, model) => sum + model.confidence,
      0,
    ) /
      activeWorkspace.models.length *
      100,
  );
  const livePriority =
    activeWorkspace.pulse === "hot"
      ? "high"
      : activeWorkspace.pulse === "stable"
        ? "medium"
        : "low";

  const configuredProviders = providerStatus
    ? Object.values(providerStatus.providers).filter((provider) => provider.configured).length
    : 0;
  const providerMode = configuredProviders > 0 ? "ADAPTERS CONFIGURED" : "SANDBOX";

  return (
    <main className="appFrame signalSystem">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <header className="topbar">
        <a className="brand" href="#terminal" aria-label="VETO Sport">
          <span className="brandMark"><VetoMark size={31} /></span>
          <span className="brandType">
            <span className="brandWord">VETO</span>
            <span className="brandSport">SPORT</span>
          </span>
          <span className="brandMode">SIGNAL SYSTEM</span>
        </a>

        <nav>
          <a className="active" href="#terminal">{dictionary.nav.terminal}</a>
          <a href="#live">{dictionary.nav.live}</a>
          <a href="#events">{dictionary.nav.events}</a>
          <a href="#models">{dictionary.nav.models}</a>
          <a href="#ledger">{dictionary.nav.ledger}</a>
        </nav>

        <div className="topbarActions">
          <div className="systemPulse">
            <span className="pulseCore" />
            <span>CORE ONLINE</span>
          </div>
          <div className="localeSwitch" aria-label="Language">
            {(["ru", "en", "hy"] as Locale[]).map((item) => (
              <button
                className={locale === item ? "selected" : ""}
                key={item}
                onClick={() => setLocale(item)}
                type="button"
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <nav className="surfaceRailNav" aria-label="VETO surface sections">
        <a href="#live"><b>01</b><span>LIVE</span></a>
        <a href="#events"><b>02</b><span>EVENT</span></a>
        <a href="#market-surface"><b>05</b><span>SURFACE</span></a>
        <a href="#pricing"><b>06</b><span>PRICING</span></a>
        <a href="#models"><b>08</b><span>MODELS</span></a>
        <a href="#ledger"><b>11</b><span>LEDGER</span></a>
        <a href="#validation"><b>12</b><span>VALIDATE</span></a>
      </nav>

      <section className="hero signalHero liveHero" id="terminal">
        <div className="heroCopyBlock">
          <div className="heroMetaRow">
            <span className="signalKicker"><i /> LIVE MULTI-SPORT INTELLIGENCE</span>
            <span className="researchBadge">RESEARCH / SANDBOX</span>
          </div>

          <div className="heroIdentity">
            <VetoMark size={54} className="heroMark" />
            <span>VETO SPORT / SIGNAL SYSTEM</span>
          </div>

          <h1>
            {locale === "ru"
              ? "Не смотри на коэффициент. Смотри, где рынок опаздывает."
              : locale === "hy"
                ? "Մի նայիր միայն գործակցին։ Տես՝ որտեղ է շուկան ուշանում։"
                : "Don’t watch the odds. Watch where the market is late."}
          </h1>

          <p className="heroCopy">
            {locale === "ru"
              ? "VETO непрерывно пересчитывает матч, рынок и сценарии. Выбирай событие — и вся система мгновенно перестраивается под его sport-state."
              : locale === "hy"
                ? "VETO-ն անընդհատ վերագնահատում է խաղը, շուկան և սցենարները։ Ընտրիր իրադարձությունը՝ ամբողջ համակարգը վերակառուցվում է դրա sport-state-ի շուրջ։"
                : "VETO continuously reprices the event, market and scenario tree. Pick an event and the entire system rebuilds around its sport-state."}
          </p>

          <div className="heroLiveNetwork" aria-label="Live sports network">
            {liveWorkspaces.map((workspace) => (
              <button
                className={activeWorkspace.id === workspace.id ? "active" : ""}
                key={workspace.id}
                onClick={() => setSelectedEventId(workspace.id)}
                type="button"
              >
                <span><i className={workspace.pulse} />{workspace.sportLabel}</span>
                <strong>{workspace.homeCode} {workspace.homeScore}:{workspace.awayScore} {workspace.awayCode}</strong>
                <small>{workspace.clock}</small>
              </button>
            ))}
          </div>

          <div className="heroTelemetry">
            <span>{activeWorkspace.clock}</span>
            <span>STATE {activeWorkspace.stateId}</span>
            <span>FEED {activeWorkspace.feedLatency}</span>
            <span>MODEL {activeWorkspace.modelLatency}</span>
          </div>
        </div>

        <div className="heroSignal">
          <div className="heroSignalEvent">
            <span>{activeWorkspace.sportLabel}</span>
            <strong>{activeWorkspace.homeCode} · {activeWorkspace.awayCode}</strong>
          </div>

          <div className="heroSignalTop">
            <div>
              <span className="miniLabel">PRIMARY SIGNAL</span>
              <strong>{primarySignal.selection.label}</strong>
            </div>
            <em className={decisionClass(primarySignal.decision)}>{primarySignal.decision}</em>
          </div>

          <div className="heroProbability">
            <strong>{pct(primarySignal.fairProbability)}</strong>
            <span>Fair probability · {activeWorkspace.modelVersion}</span>
          </div>

          <div className="heroSignalLane">
            <span style={{ width: `${primarySignal.fairProbability * 100}%` }} />
            <i style={{ left: `${primarySignal.fairProbability * 100}%` }} />
          </div>

          <div className="heroSignalMetrics">
            <div><span>FAIR</span><strong>{primarySignal.fairOdds.toFixed(2)}</strong></div>
            <div><span>MARKET</span><strong>{primarySignal.marketOdds.toFixed(2)}</strong></div>
            <div><span>GAP</span><strong className={primaryGap >= 0 ? "positive" : "negative"}>{pp(primaryGap)}</strong></div>
          </div>

          <div className="heroSignalWhy">
            <span>WHY NOW</span>
            <p>{activeWorkspace.reasonHeadline}</p>
          </div>
        </div>
      </section>

      <div className="sandboxBanner">
        <span><i /> {dictionary.sandbox}</span>
        <span>{configuredProviders > 0 ? `${configuredProviders}/2 PRIMARY ADAPTERS CONFIGURED · SANDBOX VIEW STILL ACTIVE` : "LIVE ADAPTERS AWAIT KEYS · UI NEVER LABELS SYNTHETIC DATA AS REAL"}</span>
      </div>

      <section className="statGrid">
        <Metric value="2,481" label={dictionary.scanned} detail="7 sports / 31 families" />
        <Metric value="347" label={dictionary.repriced} detail="median delta 3.8 p.p." />
        <Metric value="41" label={dictionary.anomalies} detail="12 unexplained" />
        <Metric value="9" label={dictionary.validated} detail="3 high-conviction" accent />
      </section>

      <section className="liveRail liveEventSwitcher" id="live">
        <div className="sectionRailTitle">
          <span className="panelIndex">01</span>
          <div>
            <h2>{dictionary.liveNow}</h2>
            <p>Choose an event · entire VETO state switches</p>
          </div>
        </div>
        <div className="liveCards">
          {liveWorkspaces.map((event) => (
            <button
              className={`liveEventCard ${activeWorkspace.id === event.id ? "active" : ""}`}
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              type="button"
            >
              <div className="liveEventTop">
                <span className={`pulseTag ${event.pulse}`}>{event.clock}</span>
                <span>{event.competition}</span>
              </div>
              <div className="liveSportTag">{event.sportLabel}</div>
              <div className="liveScore">
                <span>{event.homeCode}</span>
                <strong>{event.homeScore}<em>:</em>{event.awayScore}</strong>
                <span>{event.awayCode}</span>
              </div>
              <div className="liveEventMeta">
                <span>{event.markets} markets</span>
                <span>{event.repriced} repriced</span>
                <strong>{event.opportunities[0].decision} · {pp(event.opportunities[0].probabilityEdge)}</strong>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className={`eventDecisionSurface sport-${activeWorkspace.sport}`} id="events">
        <div className="surfaceCommandHeader">
          <div className="surfaceCommandTitle">
            <span className="panelIndex">02</span>
            <div>
              <h2>EVENT INTELLIGENCE</h2>
              <p>{activeWorkspace.competition} · {activeWorkspace.sportLabel} specialist state</p>
            </div>
          </div>
          <div className="headerTelemetry">
            <span><i className="hotDot" /> {activeWorkspace.clock}</span>
            <span>STATE {activeWorkspace.stateId}</span>
            <span>FEED {activeWorkspace.feedLatency}</span>
            <span>MODEL {activeWorkspace.modelLatency}</span>
          </div>
        </div>

        <div className="eventDecisionTop">
          <div className="eventMatchPlane">
            <div className="eventLeagueLine">
              <span>{activeWorkspace.homeCode}</span>
              <i />
              <span>{activeWorkspace.competition}</span>
              <i />
              <span>{activeWorkspace.awayCode}</span>
            </div>

            <div className="eventScoreLine">
              <div className="eventTeam eventTeamHome">
                <span>{activeWorkspace.sportLabel} / HOME</span>
                <strong>{activeWorkspace.homeName}</strong>
                <small>{activeWorkspace.specialistMetrics[1]?.label} {activeWorkspace.specialistMetrics[1]?.value}</small>
              </div>

              <div className="eventScoreCore">
                <div className="eventScoreDigits">
                  <strong>{activeWorkspace.homeScore}</strong><i>:</i><strong>{activeWorkspace.awayScore}</strong>
                </div>
                <div className="eventClockLine">
                  <b>{activeWorkspace.clock}</b>
                  <span>{activeWorkspace.period}</span>
                </div>
              </div>

              <div className="eventTeam eventTeamAway">
                <span>{activeWorkspace.sportLabel} / AWAY</span>
                <strong>{activeWorkspace.awayName}</strong>
                <small>{activeWorkspace.specialistMetrics[2]?.label} {activeWorkspace.specialistMetrics[2]?.value}</small>
              </div>
            </div>
          </div>

          <aside className="eventVerdictPlane">
            <div className="verdictTop">
              <div>
                <span className="miniLabel">SELECTED SIGNAL</span>
                <strong>{selected.selection.label}</strong>
              </div>
              <em className={decisionClass(selected.decision)}>{selected.decision}</em>
            </div>

            <div className="verdictPrimary">
              <div>
                <strong>{pct(selected.fairProbability)}</strong>
                <span>FAIR PROBABILITY</span>
              </div>
              <div className="verdictScore">
                <span>SCORE</span>
                <b>{selected.opportunityScore}</b>
              </div>
            </div>

            <div className="verdictLane">
              <span style={{ width: `${selected.fairProbability * 100}%` }} />
              <i style={{ left: `${selected.fairProbability * 100}%` }} />
            </div>

            <div className="verdictMetrics">
              <div><span>MARKET</span><strong>{selected.marketOdds.toFixed(2)}</strong></div>
              <div><span>FAIR</span><strong>{selected.fairOdds.toFixed(2)}</strong></div>
              <div><span>EDGE</span><strong className={selected.probabilityEdge >= 0 ? "positive" : "negative"}>{pp(selected.probabilityEdge)}</strong></div>
              <div><span>EV</span><strong className={selected.expectedValue >= 0 ? "positive" : "negative"}>{pct(selected.expectedValue)}</strong></div>
            </div>
          </aside>
        </div>

        <div className="eventStateRail">
          {activeWorkspace.stateMetrics.map((metric) => (
            <StatePill
              accent={metric.accent}
              key={metric.label}
              label={metric.label}
              value={metric.value}
              note={metric.note}
            />
          ))}
        </div>

        <div className="eventSignalBody">
          <section className="eventChangePlane">
            <div className="eventPlaneHead">
              <div>
                <span className="miniLabel">{dictionary.whatChanged}</span>
                <strong>{activeWorkspace.reasonHeadline}</strong>
              </div>
              <span className={`priorityTag ${livePriority}`}>{livePriority.toUpperCase()}</span>
            </div>

            <p>{activeWorkspace.reasonSummary}</p>

            <div className="changeTimeline">
              {activeWorkspace.changes.map((change, index) => (
                <div className="changeTimelineRow" key={change.label}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <i className={change.direction} />
                  <div>
                    <strong>{change.label}</strong>
                    <small>{change.note}</small>
                  </div>
                  <b className={change.direction === "up" ? "positive" : change.direction === "down" ? "negative" : ""}>
                    {pp(change.delta)}
                  </b>
                </div>
              ))}
            </div>

            <div className="affectedMarkets">
              <span>AFFECTED</span>
              <div>
                {activeWorkspace.affectedMarkets.map((market) => (
                  <i key={market}>{market}</i>
                ))}
              </div>
            </div>
          </section>

          <section className="eventProbabilityPlane">
            <div className="eventPlaneHead">
              <div>
                <span className="miniLabel">{dictionary.probabilitySurface}</span>
                <strong>{activeWorkspace.probabilityLabel} · {activeWorkspace.modelVersion}</strong>
              </div>
              <div className="surfaceHeadline">
                <span>VETO</span>
                <strong>{pct(primarySignal.fairProbability)}</strong>
              </div>
            </div>

            <ProbabilityChart points={activeWorkspace.probabilityHistory} />

            <div className="probabilityFoot">
              <span>MARKET <b>{pct(primaryMarketProbability)}</b></span>
              <span>FAIR <b>{primarySignal.fairOdds.toFixed(2)}</b></span>
              <span>GAP <b className={primaryGap >= 0 ? "positive" : "negative"}>{pp(primaryGap)}</b></span>
              <span>AGREEMENT <b>{selected.modelAgreement}/100</b></span>
            </div>
          </section>
        </div>

        <div className="eventReasonBand">
          <div className="reasonNarrative">
            <span className="miniLabel">{dictionary.why}</span>
            <h3>{activeWorkspace.reasonHeadline}</h3>
            <p>{activeWorkspace.reasonSummary}</p>
          </div>

          <div className="reasonEvidence">
            {selected.rationale.slice(0, 3).map((line, index) => (
              <div key={line}>
                <span>0{index + 1}</span>
                <p>{line}</p>
              </div>
            ))}
          </div>

          <div className="reasonRisk">
            <span className="miniLabel">RISK / INVALIDATION</span>
            <strong>{selected.risk}</strong>
            <p>{activeWorkspace.invalidation}</p>
          </div>
        </div>

        <div className="marketSurfaceHeader">
          <div>
            <span className="panelIndex">03</span>
            <div>
              <h2>{dictionary.opportunities}</h2>
              <p>{activeWorkspace.sportLabel} markets ranked by evidence quality</p>
            </div>
          </div>
          <div className="segmented">
            <button className={marketMode === "all" ? "active" : ""} onClick={() => setMarketMode("all")} type="button">{dictionary.allMarkets}</button>
            <button className={marketMode === "edges" ? "active" : ""} onClick={() => setMarketMode("edges")} type="button">{dictionary.topEdges}</button>
          </div>
        </div>

        <div className="marketTable eventMarketTable">
          <div className="marketRow tableHead">
            <span>{dictionary.market}</span>
            <span>{dictionary.price}</span>
            <span>{dictionary.fair}</span>
            <span>{dictionary.edge}</span>
            <span>{dictionary.agreement}</span>
            <span>{dictionary.score}</span>
            <span>{dictionary.decision}</span>
          </div>
          {visibleOpportunities.map((item) => (
            <button
              type="button"
              key={item.selection.id}
              className={`marketRow dataRow ${selected.selection.id === item.selection.id ? "rowSelected" : ""}`}
              onClick={() => setSelectedId(item.selection.id)}
            >
              <span className="marketIdentity">
                <i className={decisionClass(item.decision)} />
                <span>
                  <strong>{item.selection.label}</strong>
                  <small>{item.marketId.replace(`${activeWorkspace.sport}.`, "").replaceAll("_", " ")}</small>
                </span>
              </span>
              <span className="mono">{item.marketOdds.toFixed(2)}</span>
              <span className="mono">{item.fairOdds.toFixed(2)}</span>
              <span className={item.probabilityEdge > 0 ? "positive mono" : "muted mono"}>{pp(item.probabilityEdge)}</span>
              <span className="agreementCell">
                <span>{item.modelAgreement}</span>
                <i><b style={{ width: `${item.modelAgreement}%` }} /></i>
              </span>
              <span className="vetoScore">{item.opportunityScore}</span>
              <span className={`decision ${decisionClass(item.decision)}`}>{item.decision}</span>
            </button>
          ))}
        </div>
      </section>

      {activeWorkspace.sport === "football" ? (
        <>
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
            <span>CONSENSUS</span>
            <strong>{councilConsensus}</strong>
            <em>/100</em>
          </div>
        </div>

        <div className="councilStrip">
          {activeWorkspace.models.map((model) => (
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
              <div className="councilNodeFoot">
                <span>CONF {Math.round(model.confidence * 100)}</span>
                <b>{model.status.toUpperCase()}</b>
              </div>
            </article>
          ))}
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
        <BacktestLab locale={locale} />
        <ModelGovernancePanel locale={locale} />
      </div>

      <section className="integrationRail">
        <div className="integrationIdentity">
          <span className="miniLabel">DATA PLANE</span>
          <strong>{providerMode}</strong>
        </div>

        <div className="integrationNodes">
          <div className={providerStatus?.providers.sportmonks.configured ? "online" : "offline"}>
            <i />
            <span>SPORTMONKS</span>
            <b>{providerStatus?.providers.sportmonks.configured ? "CONNECTED" : "AWAITING KEY"}</b>
          </div>
          <div className={providerStatus?.providers.theOddsApi.configured ? "online" : "offline"}>
            <i />
            <span>THE ODDS API</span>
            <b>{providerStatus?.providers.theOddsApi.configured ? "CONNECTED" : "AWAITING KEY"}</b>
          </div>
          <div className="standby">
            <i />
            <span>NEWS / INJURY</span>
            <b>NEXT</b>
          </div>
          <div className="online">
            <i />
            <span>REALTIME BRIDGE</span>
            <b>READY</b>
          </div>
        </div>

        <p>{dictionary.connectHint}</p>
      </section>

      <footer className="signalFooter">
        <div className="footerSignalLine"><i /><span>VETO / SIGNAL SYSTEM</span></div>
        <div className="footerBrand">
          <VetoMark size={22} />
          <strong>VETO SPORT</strong>
          <span>· MARGARYAN LABS</span>
        </div>
        <p>{dictionary.noGuarantee}</p>
      </footer>
    </main>
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
