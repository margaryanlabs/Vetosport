"use client";

import { useEffect, useState } from "react";

type Plane = {
  runtime?: {
    mode?: string;
    sportmonksConfigured?: boolean;
    oddsConfigured?: boolean;
    oddsSportKeysConfigured?: boolean;
    oddsSportKeysCount?: number;
    canonicalGatewayConfigured?: boolean;
    blockers?: string[];
    directAdapterGaps?: string[];
  };
  storageReachable?: boolean;
  storageMessage?: string;
  capabilities?: Record<string, boolean>;
};

type Providers = {
  mode?: string;
  providers?: {
    canonicalGateway?: { configured?: boolean };
    sportmonks?: { configured?: boolean };
    theOddsApi?: {
      configured?: boolean;
      sportKeysConfigured?: boolean;
      sportKeysCount?: number;
      ingestionReady?: boolean;
    };
  };
};

type Selfcheck = {
  passed?: boolean;
  generatedAt?: string;
};

export function SystemStatusPanel() {
  const [plane, setPlane] = useState<Plane | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [selfcheck, setSelfcheck] = useState<Selfcheck | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/intelligence/data-plane/status", { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/providers", { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/intelligence/selfcheck", { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
    ])
      .then(([p, pr, s]) => {
        if (!active) return;
        setPlane(p);
        setProviders(pr);
        setSelfcheck(s);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const sportmonks =
    providers?.providers?.sportmonks?.configured ??
    plane?.runtime?.sportmonksConfigured ??
    false;
  const odds =
    providers?.providers?.theOddsApi?.configured ??
    plane?.runtime?.oddsConfigured ??
    false;
  const oddsAllowlist =
    providers?.providers?.theOddsApi?.sportKeysConfigured ??
    plane?.runtime?.oddsSportKeysConfigured ??
    false;
  const marketReady = odds && oddsAllowlist;
  const gateway =
    providers?.providers?.canonicalGateway?.configured ??
    plane?.runtime?.canonicalGatewayConfigured ??
    false;
  const operational =
    Boolean(selfcheck?.passed) &&
    Boolean(plane?.storageReachable) &&
    gateway;

  return (
    <section className="systemScene">
      <div className="systemHero" id="system-health">
        <span>SYSTEM / HEALTH</span>
        <h2>{operational ? "Operational core is ready." : "Validating the decision stack…"}</h2>
        <p>
          One view for model health, immutable storage and live-ingress readiness.
          Direct data vendors are optional when the canonical gateway is active.
        </p>
        <div className="systemHeroSummary">
          <div>
            <span>RUNTIME</span>
            <strong>{plane?.runtime?.mode ?? "CHECKING"}</strong>
          </div>
          <div>
            <span>LIVE INGRESS</span>
            <strong>{gateway ? "GATEWAY READY" : "PENDING"}</strong>
          </div>
        </div>
        <div className="systemHeroPulse" aria-hidden><i /><i /><i /></div>
      </div>

      <div className="systemStatusGrid">
        <article>
          <span>INTELLIGENCE CORE</span>
          <strong>{selfcheck?.passed ? "READY" : "CHECKING"}</strong>
          <small>{selfcheck?.passed ? "All research self-checks passed." : "Waiting for self-check response."}</small>
          <i className={selfcheck?.passed ? "ok" : "wait"} />
        </article>

        <article id="system-data">
          <span>TRUTH JOURNAL</span>
          <strong>{plane?.storageReachable ? "CONNECTED" : "CHECKING"}</strong>
          <small>{plane?.storageMessage ?? "Checking storage bridge."}</small>
          <i className={plane?.storageReachable ? "ok" : "wait"} />
        </article>

        <article id="system-providers">
          <span>SPORT DATA</span>
          <strong>{sportmonks ? "DIRECT READY" : gateway ? "GATEWAY ONLY" : "PENDING"}</strong>
          <small>SportMonks direct football adapter is optional when canonical push is used.</small>
          <i className={sportmonks || gateway ? "ok" : "pending"} />
        </article>

        <article>
          <span>MARKET DATA</span>
          <strong>{marketReady ? "DIRECT READY" : odds ? "NEEDS ALLOWLIST" : gateway ? "GATEWAY ONLY" : "PENDING"}</strong>
          <small>
            {marketReady
              ? `Odds adapter armed · ${providers?.providers?.theOddsApi?.sportKeysCount ?? plane?.runtime?.oddsSportKeysCount ?? 0} sport keys allowed.`
              : odds
                ? "API key exists, but VETO_ODDS_SPORT_KEYS is empty. Polling remains disabled."
                : gateway
                  ? "Market quotes can arrive through the canonical gateway."
                  : "No market-data ingress is configured."}
          </small>
          <i className={marketReady || gateway ? "ok" : "pending"} />
        </article>

        <article>
          <span>LIVE GATEWAY</span>
          <strong>{gateway ? "READY" : "PENDING"}</strong>
          <small>Provider-neutral normalized push into the Truth Journal.</small>
          <i className={gateway ? "ok" : "pending"} />
        </article>
      </div>

      <div className="systemModeBand">
        <div>
          <span>CURRENT MODE</span>
          <strong>{plane?.runtime?.mode ?? providers?.mode ?? "CHECKING"}</strong>
        </div>
        <p>
          {plane?.runtime?.blockers?.length
            ? plane.runtime.blockers.join(" · ")
            : plane?.runtime?.directAdapterGaps?.length
              ? `Gateway ready · optional direct adapters: ${plane.runtime.directAdapterGaps.join(" · ")}`
              : "No active infrastructure blockers reported."}
        </p>
      </div>
    </section>
  );
}
