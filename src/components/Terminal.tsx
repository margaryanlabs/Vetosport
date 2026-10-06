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
    <main className="appFrame">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <header className="topbar">
        <a className="brand" href="#terminal" aria-label="VETO Sport">
          <span className="vetoGlyph" aria-hidden="true"><i /><b /></span>
          <span className="brandWord">VETO</span>
          <span className="brandSlash">/</span>
          <span className="brandSport">SPORT</span>
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

      <section className="hero" id="terminal">
        <div className="heroCopyBlock">
          <div className="heroMetaRow">
            <p className="eyebrow">{dictionary.eyebrow}</p>
            <span className="researchBadge">RESEARCH MODE / 0.2</span>
          </div>
          <h1>{dictionary.title}</h1>
          <p className="heroCopy">{dictionary.subtitle}</p>
        </div>

        <div className="heroSystemCard">
          <div className="heroSystemHead">
            <span className="miniLabel">VETO SYSTEM STATE</span>
            <span className="systemStatusLight">NOMINAL</span>
          </div>
          <div className="systemNumber">94<span>/100</span></div>
          <div className="systemBar"><i style={{ width: "94%" }} /></div>
          <div className="systemCardMeta">
            <span>Model agreement</span>
            <strong>HIGH</strong>
            <span>Provider mode</span>
            <strong>{providerMode}</strong>
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

      <section className="commandGrid">
        <div className="commandMain">
          <section className="panel matchCommand">
            <div className="panelHeader commandHeader">
              <div>
                <span className="panelIndex">02</span>
                <div>
                  <h2>EVENT COMMAND</h2>
                  <p>{sandboxEvent.competition} · Live twin</p>
                </div>
              </div>
              <div className="headerTelemetry">
                <span><i className="hotDot" /> LIVE 64:18</span>
                <span>STATE #18429</span>
                <span>Δ 820ms</span>
              </div>
            </div>

            <div className="scoreboard">
              <div className="team teamHome">
                <span className="teamCode">ARS</span>
                <strong>{sandboxEvent.home?.name}</strong>
                <small>Home · Sandbox</small>
              </div>
              <div className="scoreCore">
                <div className="scoreDigits"><span>1</span><i>:</i><span>1</span></div>
                <div className="scoreClock"><b>64:18</b><span>SECOND HALF</span></div>
              </div>
              <div className="team teamAway">
                <span className="teamCode">LIV</span>
                <strong>{sandboxEvent.away?.name}</strong>
                <small>Away · Sandbox</small>
              </div>
            </div>

            <div className="stateStrip">
              <StatePill label={dictionary.regime} value="CONTROLLED" note="low transition" />
              <StatePill label={dictionary.tempo} value="71/100" note="−19% / 10m" />
              <StatePill label={dictionary.uncertainty} value="21/100" note="LOW" />
              <StatePill label={dictionary.marketGap} value={pp(under35Gap)} note="UNDER 3.5" accent />
            </div>

            <div className="liveTwinChange">
              <div className="liveTwinChangeHead">
                <div>
                  <span className="miniLabel">{dictionary.whatChanged}</span>
                  <strong>{liveExplanation.headline}</strong>
                </div>
                <span className={`priorityTag ${livePriority}`}>{livePriority.toUpperCase()}</span>
              </div>
              <p>{liveExplanation.summary}</p>
              <div className="liveTwinDrivers">
                {footballShifts.map((shift) => (
                  <div key={`${shift.marketId}-${shift.selectionId}`}>
                    <span>{shift.label}</span>
                    <strong className={shift.direction === "up" ? "positive" : shift.direction === "down" ? "negative" : ""}>
                      {pp(shift.probabilityShift)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="affectedMarkets">
                <span>AFFECTED MARKETS</span>
                <div>
                  {sandboxAffectedMarkets.map((market) => (
                    <i key={market}>{market.replace("football.", "").replaceAll("_", " ")}</i>
                  ))}
                </div>
              </div>
            </div>

            <div className="stateGrid">
              <div className="surfaceCard">
                <div className="subhead">
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
                <div className="surfaceFooter">
                  <span>Market implied <b>{pct(under35MarketProbability)}</b></span>
                  <span>Fair price <b>{under35FairOdds.toFixed(2)}</b></span>
                  <span className="positive">Gap <b>{pp(under35Gap)}</b></span>
                </div>
              </div>

              <div className="gameStateCard">
                <div className="subhead">
                  <div>
                    <span className="miniLabel">{dictionary.gameState}</span>
                    <strong>Live feature state</strong>
                  </div>
                  <span className="freshness">FRESH · 0.8s</span>
                </div>
                <div className="stateMetricList">
                  {stateMetrics.map((metric) => (
                    <div className="stateMetric" key={metric.label}>
                      <div className="stateMetricTop">
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </div>
                      <div className="microTrack"><i style={{ width: `${metric.strength}%` }} /></div>
                      <small className={metric.tone ?? "neutral"}>{metric.delta ?? "—"}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="panel opportunities" id="events">
            <div className="panelHeader">
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

            <div className="marketTable">
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
        </div>

        <aside className="panel decisionCore">
          <div className="panelHeader">
            <div>
              <span className="panelIndex">04</span>
              <div>
                <h2>{dictionary.eventRoom}</h2>
                <p>Selected market</p>
              </div>
            </div>
            <span className="freshness">8s old</span>
          </div>

          <div className="decisionHero">
            <div className="decisionLabel">
              <span>{selected.selection.label}</span>
              <em className={decisionClass(selected.decision)}>{selected.decision}</em>
            </div>
            <div className="vetoDial">
              <div className="dialRing" style={{ "--score": selected.opportunityScore } as React.CSSProperties}>
                <div>
                  <span>VETO</span>
                  <strong>{selected.opportunityScore}</strong>
                </div>
              </div>
            </div>
            <div className="decisionProbability">
              <strong>{pct(selected.fairProbability)}</strong>
              <span>VETO probability</span>
            </div>
          </div>

          <div className="decisionMatrix">
            <Signal label="Market price" value={selected.marketOdds.toFixed(2)} />
            <Signal label="Fair price" value={selected.fairOdds.toFixed(2)} />
            <Signal label="Pricing edge" value={pp(selected.probabilityEdge)} positive />
            <Signal label="Expected value" value={pct(selected.expectedValue)} positive />
            <Signal label="Model agreement" value={`${selected.modelAgreement}/100`} />
            <Signal label="Risk band" value={selected.risk} />
          </div>

          <div className="decisionWhy">
            <span className="miniLabel">{dictionary.why}</span>
            <h3>Цена рынка отстаёт от текущего game state.</h3>
            <p>VETO видит более медленный темп и меньший хвост сценариев с 4+ голами. Модели согласованы, а неопределённость остаётся низкой.</p>
            <div className="reasonList">
              {selected.rationale.map((line, index) => (
                <div key={line}><span>0{index + 1}</span><p>{line}</p></div>
              ))}
            </div>
          </div>

          <button className="explainButton" type="button">
            <span>{dictionary.explain}</span>
            <i>↗</i>
          </button>
        </aside>
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
          <span className="vetoGlyph small" aria-hidden="true"><i /><b /></span>
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
