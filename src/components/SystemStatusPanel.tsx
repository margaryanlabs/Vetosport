"use client";

import { useEffect, useState } from "react";

type Plane = {
  runtime?: {
    mode?: string;
    sportmonksConfigured?: boolean;
    oddsConfigured?: boolean;
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
    theOddsApi?: { configured?: boolean };
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
  const gateway =
    providers?.providers?.canonicalGateway?.configured ??
    plane?.runtime?.canonicalGatewayConfigured ??
    false;

  return (
    <section className="systemScene">
      <div className="systemHero" id="system-health">
        <span>SYSTEM / HEALTH</span>
        <h2>{selfcheck?.passed ? "Core is healthy." : "Running system checks…"}</h2>
        <p>
          Storage, provider connectivity and the intelligence engine are shown here
          without mixing infrastructure into the live sports workspace.
        </p>
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
          <strong>{sportmonks ? "CONNECTED" : "PENDING"}</strong>
          <small>Sportmonks live event-state adapter.</small>
          <i className={sportmonks ? "ok" : "pending"} />
        </article>

        <article>
          <span>MARKET DATA</span>
          <strong>{odds ? "CONNECTED" : "PENDING"}</strong>
          <small>The Odds API market-price adapter.</small>
          <i className={odds ? "ok" : "pending"} />
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
