"use client";

import { useMemo, useState } from "react";
import type { Locale, Opportunity } from "@/lib/domain/types";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { sandboxEvent, sandboxOpportunities } from "@/lib/sandbox/sample";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const decisionClass = (decision: Opportunity["decision"]) =>
  decision === "EDGE" ? "edge" : decision === "WATCH" ? "watch" : "pass";

export function Terminal() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [selectedId, setSelectedId] = useState(sandboxOpportunities[0].selection.id);
  const dictionary = dictionaries[locale];
  const selected = useMemo(
    () => sandboxOpportunities.find((item) => item.selection.id === selectedId) ?? sandboxOpportunities[0],
    [selectedId],
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark">VETO</span>
          <span className="brandDivider" />
          <span className="brandSport">SPORT</span>
        </div>
        <nav>
          <a className="active" href="#terminal">{dictionary.nav.terminal}</a>
          <a href="#live">{dictionary.nav.live}</a>
          <a href="#events">{dictionary.nav.events}</a>
          <a href="#models">{dictionary.nav.models}</a>
          <a href="#ledger">{dictionary.nav.ledger}</a>
        </nav>
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
      </header>

      <section className="hero" id="terminal">
        <div>
          <p className="eyebrow">{dictionary.eyebrow}</p>
          <h1>{dictionary.title}</h1>
          <p className="heroCopy">{dictionary.subtitle}</p>
        </div>
        <div className="systemStatus">
          <span className="statusDot" />
          <div>
            <strong>INTELLIGENCE CORE</strong>
            <span>Foundation v0.1 · Research mode</span>
          </div>
        </div>
      </section>

      <div className="sandboxBanner">
        <span>{dictionary.sandbox}</span>
        <span>LIVE DATA ADAPTERS: OFFLINE</span>
      </div>

      <section className="statGrid">
        <Metric value="2,481" label={dictionary.scanned} />
        <Metric value="347" label={dictionary.repriced} />
        <Metric value="41" label={dictionary.anomalies} />
        <Metric value="9" label={dictionary.validated} />
      </section>

      <section className="workspace">
        <div className="panel opportunities">
          <div className="panelHeader">
            <div>
              <span className="panelIndex">01</span>
              <h2>{dictionary.opportunities}</h2>
            </div>
            <div className="legend">
              <span><i className="edgeDot" /> EDGE</span>
              <span><i className="watchDot" /> WATCH</span>
              <span><i className="passDot" /> PASS</span>
            </div>
          </div>

          <div className="eventStrip">
            <div>
              <span className="livePill">LIVE · 64:18</span>
              <strong>{sandboxEvent.home?.name} <b>1</b> — <b>1</b> {sandboxEvent.away?.name}</strong>
            </div>
            <span>{sandboxEvent.competition}</span>
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
            {sandboxOpportunities.map((item) => (
              <button
                type="button"
                key={item.selection.id}
                className={`marketRow dataRow ${selected.selection.id === item.selection.id ? "rowSelected" : ""}`}
                onClick={() => setSelectedId(item.selection.id)}
              >
                <span className="marketName">{item.selection.label}</span>
                <span>{item.marketOdds.toFixed(2)}</span>
                <span>{item.fairOdds.toFixed(2)}</span>
                <span className={item.probabilityEdge > 0 ? "positive" : "muted"}>{pct(item.probabilityEdge)}</span>
                <span>{item.modelAgreement}</span>
                <span className="vetoScore">{item.opportunityScore}</span>
                <span className={`decision ${decisionClass(item.decision)}`}>{item.decision}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="panel intelligence">
          <div className="panelHeader">
            <div>
              <span className="panelIndex">02</span>
              <h2>{dictionary.eventRoom}</h2>
            </div>
          </div>

          <div className="selectionHero">
            <span>{selected.selection.label}</span>
            <strong>VETO {selected.opportunityScore}</strong>
            <em className={decisionClass(selected.decision)}>{selected.decision}</em>
          </div>

          <div className="probabilityBlock">
            <div className="probabilityValue">{pct(selected.fairProbability)}</div>
            <div className="probabilityMeta">
              <span>VETO probability</span>
              <span>Fair price {selected.fairOdds.toFixed(2)}</span>
            </div>
          </div>

          <div className="signalGrid">
            <Signal label="Market price" value={selected.marketOdds.toFixed(2)} />
            <Signal label="Pricing edge" value={pct(selected.probabilityEdge)} />
            <Signal label="Expected value" value={pct(selected.expectedValue)} />
            <Signal label="Model agreement" value={`${selected.modelAgreement}/100`} />
            <Signal label="Data confidence" value={selected.dataConfidence} />
            <Signal label="Risk band" value={selected.risk} />
          </div>

          <div className="rationale">
            <span className="miniLabel">{dictionary.why}</span>
            {selected.rationale.map((line) => <p key={line}>{line}</p>)}
          </div>

          <div className="dataPlane">
            <div>
              <span className="miniLabel">{dictionary.provider}</span>
              <strong>{dictionary.disconnected}</strong>
            </div>
            <p>{dictionary.connectHint}</p>
          </div>
        </aside>
      </section>

      <footer>
        <span>VETO SPORT · MARGARYAN LABS</span>
        <p>{dictionary.noGuarantee}</p>
      </footer>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="signal"><span>{label}</span><strong>{value}</strong></div>;
}
