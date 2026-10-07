"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/domain/types";

type DataPlaneStatus = {
  model: string;
  generatedAt: string;
  runtime: {
    persistenceConfigured: boolean;
    sportmonksConfigured: boolean;
    oddsConfigured: boolean;
    ingestionSecretConfigured: boolean;
    mode: "OFFLINE" | "STORAGE_ONLY" | "PARTIAL_FEEDS" | "LIVE_READY";
    blockers: string[];
  };
  storageReachable: boolean;
  storageMessage: string;
  capabilities: {
    appendOnlyTruthJournal: boolean;
    bitemporalReplay: boolean;
    historicalBackfillClock: boolean;
    providerRulebookVersions: boolean;
    quoteLineage: boolean;
    liveProviderKeysPresent: boolean;
  };
  migration: {
    required: boolean;
    path: string;
    applied: boolean;
  };
};

export function DataPlanePanel({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<DataPlaneStatus | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/intelligence/data-plane/status", {
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active && payload) setStatus(payload as DataPlaneStatus);
      })
      .catch(() => {
        // Surface remains explicit about unknown connectivity.
      });

    return () => {
      active = false;
    };
  }, []);

  const copy =
    locale === "ru"
      ? {
          title: "PRODUCTION DATA PLANE",
          subtitle:
            "Append-only truth · point-in-time replay · provider lineage · rulebook versions",
          warning:
            "ИНФРАСТРУКТУРНЫЙ STATUS · НИКАКИХ СЕКРЕТОВ НЕ ПОКАЗЫВАЕТСЯ",
          code: "CODE PLANE",
          runtime: "RUNTIME CONNECTIONS",
          blockers: "CURRENT BLOCKERS",
          note:
            "Data Plane код уже пишет live/historical provider data в один bitemporal journal. Но настоящий production moat начинается только после выделенного Supabase проекта, применения migration 009 и подключения provider keys.",
        }
      : locale === "hy"
        ? {
            title: "PRODUCTION DATA PLANE",
            subtitle:
              "Append-only truth · point-in-time replay · provider lineage · rulebook versions",
            warning:
              "ԻՆՖՐԱՍՏՐՈՒԿՏՈՒՐԱՅԻ STATUS · ԳԱՂՏՆԻՔՆԵՐ ՉԵՆ ՑՈՒՑԱԴՐՎՈՒՄ",
            code: "CODE PLANE",
            runtime: "RUNTIME CONNECTIONS",
            blockers: "CURRENT BLOCKERS",
            note:
              "Truth Journal-ը արդեն միացված է VETO Sport-ի մեկուսացված storage bridge-ով ընդհանուր Margaryan Labs Supabase-ին։ Հաջորդ քայլը live provider keys-ն են, իսկ հետագայում storage-ը կարելի է տեղափոխել առանձին Supabase։",
          }
        : {
            title: "PRODUCTION DATA PLANE",
            subtitle:
              "Append-only truth · point-in-time replay · provider lineage · rulebook versions",
            warning:
              "INFRASTRUCTURE STATUS · NO SECRET VALUES ARE EXPOSED",
            code: "CODE PLANE",
            runtime: "RUNTIME CONNECTIONS",
            blockers: "CURRENT BLOCKERS",
            note:
              "Truth Journal is already connected through an isolated VETO Sport storage bridge inside the shared Margaryan Labs Supabase. The next production step is live provider keys; storage can later move to a dedicated Supabase without rewriting the Data Plane.",
          };

  const runtime = status?.runtime;
  const mode = runtime?.mode ?? "OFFLINE";

  const codeChecks = [
    ["APPEND-ONLY JOURNAL", status?.capabilities.appendOnlyTruthJournal ?? true],
    ["POINT-IN-TIME REPLAY", status?.capabilities.bitemporalReplay ?? true],
    ["BACKFILL KNOWLEDGE CLOCK", status?.capabilities.historicalBackfillClock ?? true],
    ["RULEBOOK VERSIONING", status?.capabilities.providerRulebookVersions ?? true],
    ["QUOTE LINEAGE", status?.capabilities.quoteLineage ?? true],
  ] as const;

  const runtimeChecks = [
    ["STORAGE BRIDGE", runtime?.persistenceConfigured ?? false],
    ["TRUTH TABLE", status?.storageReachable ?? false],
    ["SPORTMONKS", runtime?.sportmonksConfigured ?? false],
    ["THE ODDS API", runtime?.oddsConfigured ?? false],
    ["INGEST SECRET", runtime?.ingestionSecretConfigured ?? false],
  ] as const;

  return (
    <section className="dataPlaneSurface">
      <div className="dataPlaneHead">
        <div>
          <span className="miniLabel">PARALLAX IX</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span>{copy.warning}</span>
      </div>

      <div className="dataPlaneHero">
        <div>
          <span>RUNTIME MODE</span>
          <strong className={mode === "LIVE_READY" ? "positive" : "warning"}>
            {mode}
          </strong>
        </div>
        <div>
          <span>SCHEMA</span>
          <strong>veto.data-plane.v1</strong>
        </div>
        <div>
          <span>MIGRATION 009</span>
          <strong className={status?.migration.applied ? "positive" : "warning"}>
            {status?.migration.applied ? "APPLIED" : "NOT APPLIED"}
          </strong>
        </div>
        <div>
          <span>STORAGE PROBE</span>
          <strong className={status?.storageReachable ? "positive" : "warning"}>
            {status?.storageReachable ? "REACHABLE" : "NOT CONNECTED"}
          </strong>
        </div>
      </div>

      <div className="dataPlaneMain">
        <section>
          <div className="dataPlaneSubhead">
            <span>{copy.code}</span>
            <strong>Research integrity primitives</strong>
          </div>
          <div className="dataPlaneChecks">
            {codeChecks.map(([label, ready]) => (
              <div className={ready ? "ready" : "missing"} key={label}>
                <i />
                <span>{label}</span>
                <b>{ready ? "READY" : "MISSING"}</b>
              </div>
            ))}
          </div>

          <div className="dataPlaneClock">
            <div>
              <span>LIVE</span>
              <strong>knowledge = gateway_received_at</strong>
            </div>
            <div>
              <span>HISTORICAL BACKFILL</span>
              <strong>knowledge = provider snapshot time</strong>
            </div>
            <small>
              acquisition_mode remains explicit on every journal row
            </small>
          </div>
        </section>

        <section>
          <div className="dataPlaneSubhead">
            <span>{copy.runtime}</span>
            <strong>Production dependencies</strong>
          </div>
          <div className="dataPlaneChecks">
            {runtimeChecks.map(([label, ready]) => (
              <div className={ready ? "ready" : "missing"} key={label}>
                <i />
                <span>{label}</span>
                <b>{ready ? "CONNECTED" : "ABSENT"}</b>
              </div>
            ))}
          </div>

          <div className="dataPlaneStorageMessage">
            <span>STORAGE MESSAGE</span>
            <p>
              {status?.storageMessage ??
                "Checking production Data Plane status…"}
            </p>
          </div>
        </section>
      </div>

      <div className="dataPlaneBlockers">
        <div>
          <span>{copy.blockers}</span>
          <strong>
            {runtime?.blockers.length ?? 4} dependency
            {(runtime?.blockers.length ?? 4) === 1 ? "" : "ies"} remaining
          </strong>
        </div>

        <div>
          {(runtime?.blockers ?? [
            "Supabase persistence is not configured.",
            "SPORTMONKS_API_TOKEN is not configured.",
            "THE_ODDS_API_KEY is not configured.",
            "INGESTION_SECRET is not configured.",
          ]).map((blocker, index) => (
            <article key={blocker}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{blocker}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="dataPlaneMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.note}</p>
        <code>database/migrations/009_truth_data_plane.sql</code>
      </div>
    </section>
  );
}
