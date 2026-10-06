"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale, Opportunity } from "@/lib/domain/types";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { sandboxEvent, sandboxOpportunities } from "@/lib/sandbox/sample";
import {
  evidence,
  liveEvents,
  marketMoves,
  modelViews,
  probabilityHistory,
  scenarios,
  stateMetrics,
} from "@/lib/sandbox/live";
import { ProbabilityChart } from "@/components/ProbabilityChart";
import { MarketSurfaceExplorer } from "@/components/MarketSurfaceExplorer";
import { AsianLinesBoard } from "@/components/AsianLinesBoard";
import { BacktestLab } from "@/components/BacktestLab";
import { ModelGovernancePanel } from "@/components/ModelGovernancePanel";
import { VetoMark } from "@/components/VetoMark";
import { sandboxAffectedMarkets, sandboxLiveDeltas } from "@/lib/sandbox/live-changes";
import { explainLiveChange } from "@/lib/live-twin/explain";
import { repricePriority } from "@/lib/live-twin/materiality";
import { sandboxFootballBeforeSurface, sandboxFootballSurface } from "@/lib/sandbox/football-model";
import { materialFootballShifts } from "@/lib/models/football/diff";

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

export function Terminal() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [selectedId, setSelectedId] = useState(sandboxOpportunities[0].selection.id);
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

  const dictionary = dictionaries[locale];
  const selected = useMemo(
    () => sandboxOpportunities.find((item) => item.selection.id === selectedId) ?? sandboxOpportunities[0],
    [selectedId],
  );
  const visibleOpportunities = marketMode === "edges"
    ? sandboxOpportunities.filter((item) => item.decision !== "PASS")
    : sandboxOpportunities;
  const configuredProviders = providerStatus
    ? Object.values(providerStatus.providers).filter((provider) => provider.configured).length
    : 0;
  const providerMode = configuredProviders > 0 ? "ADAPTERS CONFIGURED" : "SANDBOX";
  const liveExplanation = explainLiveChange(sandboxLiveDeltas);
  const livePriority = repricePriority(sandboxLiveDeltas);
  const under35Model = sandboxFootballSurface.markets.find(
    (market) =>
      market.marketId === "football.total_goals" &&
      market.selectionId === "under-3.5",
  );
  const under35Probability = under35Model?.probability ?? 0;
  const under35FairOdds = under35Model?.fairOdds ?? 0;
  const under35MarketProbability = 1 / 1.43;
  const under35Gap = under35Probability - under35MarketProbability;
  const footballShifts = materialFootballShifts(
    sandboxFootballBeforeSurface,
    sandboxFootballSurface,
    0.008,
  ).slice(0, 4);

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

      <section className="hero signalHero" id="terminal">
        <div className="heroCopyBlock">
          <div className="heroMetaRow">
            <span className="signalKicker"><i /> LIVE DECISION SURFACE</span>
            <span className="researchBadge">RESEARCH / SANDBOX</span>
          </div>

          <div className="heroIdentity">
            <VetoMark size={54} className="heroMark" />
            <span>VETO SPORT</span>
          </div>

          <h1>
            {locale === "ru"
              ? "Рынок показывает цену. VETO показывает сигнал."
              : locale === "hy"
                ? "Շուկան ցույց է տալիս գինը։ VETO-ն ցույց է տալիս ազդանշանը։"
                : "The market shows a price. VETO shows the signal."}
          </h1>

          <p className="heroCopy">
            {locale === "ru"
              ? "Одна живая поверхность вероятностей: матч, рынок, модели и изменения состояния — в одном контексте."
              : locale === "hy"
                ? "Հավանականությունների մեկ կենդանի մակերես՝ խաղը, շուկան, մոդելները և վիճակի փոփոխությունները մեկ համատեքստում։"
                : "One live probability surface for the event, market, models and every material state change."}
          </p>

          <div className="heroTelemetry">
            <span>LIVE 64:18</span>
            <span>STATE #18429</span>
            <span>FEED 0.8s</span>
            <span>MODEL 312ms</span>
          </div>
        </div>

        <div className="heroSignal">
          <div className="heroSignalTop">
            <div>
              <span className="miniLabel">PRIMARY SIGNAL</span>
              <strong>UNDER 3.5</strong>
            </div>
            <em>EDGE</em>
          </div>

          <div className="heroProbability">
            <strong>{pct(under35Probability)}</strong>
            <span>VETO probability</span>
          </div>

          <div className="heroSignalLane">
            <span style={{ width: `${under35Probability * 100}%` }} />
            <i style={{ left: `${under35Probability * 100}%` }} />
          </div>

          <div className="heroSignalMetrics">
            <div><span>FAIR</span><strong>{under35FairOdds.toFixed(2)}</strong></div>
            <div><span>MARKET</span><strong>1.43</strong></div>
            <div><span>GAP</span><strong className="positive">{pp(under35Gap)}</strong></div>
          </div>

          <div className="heroSignalWhy">
            <span>WHY NOW</span>
            <p>Tempo ↓ 19% · remaining λ {sandboxFootballSurface.remainingGoals.total.toFixed(2)} · council 84%</p>
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

      <section className="liveRail" id="live">
        <div className="sectionRailTitle">
          <span className="panelIndex">01</span>
          <div>
            <h2>{dictionary.liveNow}</h2>
            <p>Event twins currently repricing</p>
          </div>
        </div>
        <div className="liveCards">
          {liveEvents.map((event, index) => (
            <button className={`liveEventCard ${index === 0 ? "active" : ""}`} key={event.id} type="button">
              <div className="liveEventTop">
                <span className={`pulseTag ${event.pulse}`}>{event.clock}</span>
                <span>{event.competition}</span>
              </div>
              <div className="liveScore">
                <span>{event.home}</span>
                <strong>{event.scoreHome}<em>:</em>{event.scoreAway}</strong>
                <span>{event.away}</span>
              </div>
              <div className="liveEventMeta">
                <span>{event.markets} markets</span>
                <span>{event.repriced} repriced</span>
                <strong>+{event.topEdge.toFixed(1)}% edge</strong>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="eventDecisionSurface" id="events">
        <div className="surfaceCommandHeader">
          <div className="surfaceCommandTitle">
            <span className="panelIndex">02</span>
            <div>
              <h2>EVENT INTELLIGENCE</h2>
              <p>{sandboxEvent.competition} · Live state + selected market</p>
            </div>
          </div>
          <div className="headerTelemetry">
            <span><i className="hotDot" /> LIVE 64:18</span>
            <span>STATE #18429</span>
            <span>FEED 0.8s</span>
            <span>MODEL 312ms</span>
          </div>
        </div>

        <div className="eventDecisionTop">
          <div className="eventMatchPlane">
            <div className="eventLeagueLine">
              <span>ARS</span>
              <i />
              <span>{sandboxEvent.competition}</span>
              <i />
              <span>LIV</span>
            </div>

            <div className="eventScoreLine">
              <div className="eventTeam eventTeamHome">
                <span>HOME</span>
                <strong>{sandboxEvent.home?.name}</strong>
                <small>Control 54 · xG 1.18</small>
              </div>

              <div className="eventScoreCore">
                <div className="eventScoreDigits">
                  <strong>1</strong><i>:</i><strong>1</strong>
                </div>
                <div className="eventClockLine">
                  <b>64:18</b>
                  <span>SECOND HALF</span>
                </div>
              </div>

              <div className="eventTeam eventTeamAway">
                <span>AWAY</span>
                <strong>{sandboxEvent.away?.name}</strong>
                <small>xG 0.94 · Pressure 41</small>
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
              <div><span>EDGE</span><strong className="positive">{pp(selected.probabilityEdge)}</strong></div>
              <div><span>EV</span><strong className="positive">{pct(selected.expectedValue)}</strong></div>
            </div>
          </aside>
        </div>

        <div className="eventStateRail">
          <StatePill label={dictionary.regime} value="CONTROLLED" note="low transition" />
          <StatePill label={dictionary.tempo} value="71/100" note="−19% / 10m" />
          <StatePill label={dictionary.uncertainty} value="21/100" note="LOW" />
          <StatePill label={dictionary.marketGap} value={pp(under35Gap)} note="UNDER 3.5" accent />
        </div>

        <div className="eventSignalBody">
          <section className="eventChangePlane">
            <div className="eventPlaneHead">
              <div>
                <span className="miniLabel">{dictionary.whatChanged}</span>
                <strong>{liveExplanation.headline}</strong>
              </div>
              <span className={`priorityTag ${livePriority}`}>{livePriority.toUpperCase()}</span>
            </div>

            <p>{liveExplanation.summary}</p>

            <div className="changeTimeline">
              {footballShifts.map((shift, index) => (
                <div className="changeTimelineRow" key={`${shift.marketId}-${shift.selectionId}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <i className={shift.direction} />
                  <div>
                    <strong>{shift.label}</strong>
                    <small>{shift.direction === "up" ? "Probability repriced upward" : "Probability repriced downward"}</small>
                  </div>
                  <b className={shift.direction === "up" ? "positive" : shift.direction === "down" ? "negative" : ""}>
                    {pp(shift.probabilityShift)}
                  </b>
                </div>
              ))}
            </div>

            <div className="affectedMarkets">
              <span>AFFECTED</span>
              <div>
                {sandboxAffectedMarkets.map((market) => (
                  <i key={market}>{market.replace("football.", "").replaceAll("_", " ")}</i>
                ))}
              </div>
            </div>
          </section>

          <section className="eventProbabilityPlane">
            <div className="eventPlaneHead">
              <div>
                <span className="miniLabel">{dictionary.probabilitySurface}</span>
                <strong>Under 3.5 · football.goal-state.v1</strong>
              </div>
              <div className="surfaceHeadline">
                <span>VETO</span>
                <strong>{pct(under35Probability)}</strong>
              </div>
            </div>

            <ProbabilityChart points={probabilityHistory} />

            <div className="probabilityFoot">
              <span>MARKET <b>{pct(under35MarketProbability)}</b></span>
              <span>FAIR <b>{under35FairOdds.toFixed(2)}</b></span>
              <span>GAP <b className="positive">{pp(under35Gap)}</b></span>
              <span>AGREEMENT <b>{selected.modelAgreement}/100</b></span>
            </div>
          </section>
        </div>

        <div className="eventReasonBand">
          <div className="reasonNarrative">
            <span className="miniLabel">{dictionary.why}</span>
            <h3>Цена рынка отстаёт от текущего состояния матча.</h3>
            <p>VETO видит более медленный темп, меньший хвост сценариев с 4+ голами и устойчивое согласие моделей. Сигнал остаётся валидным, пока live-state не меняет режим.</p>
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
            <p>Next goal, red card or tempo regime break triggers full reprice.</p>
          </div>
        </div>

        <div className="marketSurfaceHeader">
          <div>
            <span className="panelIndex">03</span>
            <div>
              <h2>{dictionary.opportunities}</h2>
              <p>Markets ranked by evidence quality, not payout size</p>
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
                  <small>{item.marketId.replace("football.", "").replaceAll("_", " ")}</small>
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

      <MarketSurfaceExplorer
        current={sandboxFootballSurface}
        previous={sandboxFootballBeforeSurface}
        locale={locale}
      />

      <div className="deepMarketGrid">
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

      <section className="intelligenceGrid" id="models">
        <section className="panel modelCouncil">
          <div className="panelHeader">
            <div>
              <span className="panelIndex">08</span>
              <div>
                <h2>{dictionary.council}</h2>
                <p>Independent model votes</p>
              </div>
            </div>
            <strong className="consensusValue">94 <span>/ 100</span></strong>
          </div>
          <div className="modelList">
            {modelViews.map((model) => (
              <div className="modelRow" key={model.id}>
                <div className="modelName">
                  <i className={model.status} />
                  <div><strong>{model.label}</strong><span>{model.latency}</span></div>
                </div>
                <div className="modelBar"><i style={{ width: `${model.probability * 100}%` }} /></div>
                <strong className="mono">{pct(model.probability)}</strong>
                <span className="modelConfidence">{Math.round(model.confidence * 100)} conf</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel scenarioEngine">
          <div className="panelHeader">
            <div>
              <span className="panelIndex">09</span>
              <div>
                <h2>{dictionary.scenarios}</h2>
                <p>Counterfactual market response</p>
              </div>
            </div>
          </div>
          <div className="scenarioTable">
            <div className="scenarioRow scenarioHead">
              <span>Сценарий</span><span>P</span><span>U3.5</span><span>ARS W</span><span>Next G</span>
            </div>
            {scenarios.map((scenario) => (
              <div className="scenarioRow" key={scenario.label}>
                <strong>{scenario.label}</strong>
                <span>{pct(scenario.probability)}</span>
                <span>{pct(scenario.under35)}</span>
                <span>{pct(scenario.homeWin)}</span>
                <span>{pct(scenario.nextGoal)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel marketPulse">
          <div className="panelHeader">
            <div>
              <span className="panelIndex">10</span>
              <div>
                <h2>{dictionary.marketPulse}</h2>
                <p>Price velocity & anomalies</p>
              </div>
            </div>
          </div>
          <div className="pulseList">
            {marketMoves.map((move) => (
              <div className="pulseRow" key={`${move.time}-${move.label}`}>
                <span className="pulseTime">{move.time}</span>
                <div className="pulseMove">
                  <strong>{move.label}</strong>
                  <span>{move.from.toFixed(2)} <i>→</i> {move.to.toFixed(2)}</span>
                </div>
                <div className="pulseReason">
                  <span className={move.explained ? "explained" : "unexplained"}>{move.explained ? "EXPLAINED" : "ANOMALY"}</span>
                  <small>{move.reason}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="panel evidencePanel" id="ledger">
        <div className="panelHeader">
          <div>
            <span className="panelIndex">11</span>
            <div>
              <h2>{dictionary.evidence}</h2>
              <p>Why the probability surface moved</p>
            </div>
          </div>
          <span className="ledgerSeal">STATE IMMUTABLE AFTER CAPTURE</span>
        </div>
        <div className="evidenceTape">
          {evidence.map((item) => (
            <article className="evidenceCard" key={`${item.time}-${item.title}`}>
              <div className="evidenceCardTop">
                <span>{item.time}</span>
                <b>{item.kind}</b>
              </div>
              <h3>{item.title}</h3>
              <div className="evidenceBottom">
                <strong>{item.impact}</strong>
                <span>R {Math.round(item.reliability * 100)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <BacktestLab locale={locale} />

      <ModelGovernancePanel locale={locale} />

      <section className="dataPlane">
        <div>
          <span className="miniLabel">{dictionary.provider}</span>
          <strong>
            {configuredProviders > 0
              ? `${configuredProviders}/2 primary adapters configured`
              : dictionary.disconnected}
          </strong>
        </div>
        <p>{dictionary.connectHint}</p>
        <div className="adapterChips">
          <span className={providerStatus?.providers.sportmonks.configured ? "configured" : "missing"}>
            SPORTMONKS <i>{providerStatus?.providers.sportmonks.configured ? "KEY OK" : "KEY MISSING"}</i>
          </span>
          <span className={providerStatus?.providers.theOddsApi.configured ? "configured" : "missing"}>
            THE ODDS API <i>{providerStatus?.providers.theOddsApi.configured ? "KEY OK" : "KEY MISSING"}</i>
          </span>
          <span>NEWS / INJURY <i>NEXT</i></span>
          <span>REALTIME BRIDGE <i>READY</i></span>
        </div>
      </section>

      <footer>
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
