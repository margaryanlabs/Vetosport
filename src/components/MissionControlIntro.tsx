"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/domain/types";

type DataPlaneStatus = {
  runtime?: {
    sportmonksConfigured?: boolean;
    oddsConfigured?: boolean;
  };
  storageReachable?: boolean;
};

type SelfcheckStatus = {
  passed?: boolean;
  researchLayers?: {
    parallax?: { passed?: boolean };
  };
};

const copy = {
  ru: {
    eyebrow: "START HERE",
    title: "Как работает VETO",
    subtitle:
      "Четыре шага: состояние матча → реакция рынка → PARALLAX → решение.",
    flow: [
      ["01", "STATE", "Что происходит сейчас"],
      ["02", "MARKET", "Что уже заложено в цене"],
      ["03", "PARALLAX", "Где две картины расходятся"],
      ["04", "DECISION", "EDGE / WATCH / PASS"],
    ],
    status: "SYSTEM",
    decisions: [
      ["EDGE", "Сигнал прошёл ключевые гейты. Не гарантия исхода."],
      ["WATCH", "Есть интерес, но доказательств пока недостаточно."],
      ["PASS", "Нет достаточного преимущества или слишком высокая неопределённость."],
    ],
    details: "Что анализирует PARALLAX",
    modules: [
      ["LIVE STATE", "Счёт, темп, контекст и изменения состояния."],
      ["MARKET RESPONSE", "Как и с какой задержкой двигается цена."],
      ["SHOCK", "Информация, шум, ликвидность и feed anomalies."],
      ["REGIME", "Скрытое состояние и вероятность перехода."],
      ["AUTHORITY", "Достаточно ли доказательств доверять сигналу."],
      ["COUNTERFACTUAL", "Что должно измениться, чтобы сигнал исчез."],
    ],
    connected: "CONNECTED",
    ready: "READY",
    pending: "PENDING",
    checking: "CHECKING",
  },
  en: {
    eyebrow: "START HERE",
    title: "How VETO works",
    subtitle:
      "Four steps: match state → market reaction → PARALLAX → decision.",
    flow: [
      ["01", "STATE", "What is happening now"],
      ["02", "MARKET", "What price already implies"],
      ["03", "PARALLAX", "Where the two worlds diverge"],
      ["04", "DECISION", "EDGE / WATCH / PASS"],
    ],
    status: "SYSTEM",
    decisions: [
      ["EDGE", "The signal survives key gates. It is not a guaranteed outcome."],
      ["WATCH", "Interesting setup, but evidence is still incomplete."],
      ["PASS", "No sufficient advantage or uncertainty remains too high."],
    ],
    details: "What PARALLAX analyzes",
    modules: [
      ["LIVE STATE", "Score, tempo, context and state changes."],
      ["MARKET RESPONSE", "How and how fast price reacts."],
      ["SHOCK", "Information, noise, liquidity and feed anomalies."],
      ["REGIME", "Latent state and transition probability."],
      ["AUTHORITY", "Whether evidence is strong enough to trust."],
      ["COUNTERFACTUAL", "What must change for the signal to disappear."],
    ],
    connected: "CONNECTED",
    ready: "READY",
    pending: "PENDING",
    checking: "CHECKING",
  },
  hy: {
    eyebrow: "START HERE",
    title: "Ինչպես է աշխատում VETO-ն",
    subtitle:
      "Չորս քայլ՝ խաղի վիճակ → շուկայի արձագանք → PARALLAX → որոշում։",
    flow: [
      ["01", "STATE", "Ինչ է կատարվում հիմա"],
      ["02", "MARKET", "Ինչն արդեն գնի մեջ է"],
      ["03", "PARALLAX", "Որտեղ են պատկերները տարբերվում"],
      ["04", "DECISION", "EDGE / WATCH / PASS"],
    ],
    status: "SYSTEM",
    decisions: [
      ["EDGE", "Ազդանշանն անցել է հիմնական gates-ը։ Սա երաշխիք չէ։"],
      ["WATCH", "Սցենարը հետաքրքիր է, բայց ապացույցները դեռ քիչ են։"],
      ["PASS", "Բավարար առավելություն չկա կամ uncertainty-ն բարձր է։"],
    ],
    details: "Ինչ է վերլուծում PARALLAX-ը",
    modules: [
      ["LIVE STATE", "Հաշիվ, տեմպ, կոնտեքստ և state changes։"],
      ["MARKET RESPONSE", "Ինչպես և որքան արագ է փոխվում գինը։"],
      ["SHOCK", "Ինֆորմացիա, աղմուկ, liquidity և feed anomalies։"],
      ["REGIME", "Թաքնված state և transition probability։"],
      ["AUTHORITY", "Բավարար են արդյոք ապացույցները։"],
      ["COUNTERFACTUAL", "Ինչ պետք է փոխվի, որ signal-ը անհետանա։"],
    ],
    connected: "CONNECTED",
    ready: "READY",
    pending: "PENDING",
    checking: "CHECKING",
  },
} satisfies Record<Locale, unknown>;

export function MissionControlIntro({ locale }: { locale: Locale }) {
  const t = copy[locale] as typeof copy.ru;
  const [dataPlane, setDataPlane] = useState<DataPlaneStatus | null>(null);
  const [selfcheck, setSelfcheck] = useState<SelfcheckStatus | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/intelligence/data-plane/status", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/intelligence/selfcheck", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([plane, check]) => {
        if (!active) return;
        setDataPlane(plane as DataPlaneStatus | null);
        setSelfcheck(check as SelfcheckStatus | null);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const statuses = useMemo(() => {
    const core =
      selfcheck == null ? null : Boolean(selfcheck.passed);
    const storage =
      dataPlane == null ? null : Boolean(dataPlane.storageReachable);
    const feeds =
      dataPlane == null
        ? null
        : Boolean(dataPlane.runtime?.sportmonksConfigured) &&
          Boolean(dataPlane.runtime?.oddsConfigured);
    const parallax =
      selfcheck == null
        ? null
        : Boolean(selfcheck.researchLayers?.parallax?.passed ?? selfcheck.passed);

    return [
      ["CORE", core, core == null ? t.checking : core ? t.ready : t.pending],
      ["TRUTH JOURNAL", storage, storage == null ? t.checking : storage ? t.connected : t.pending],
      ["LIVE FEEDS", feeds, feeds == null ? t.checking : feeds ? t.connected : t.pending],
      ["PARALLAX", parallax, parallax == null ? t.checking : parallax ? t.ready : t.pending],
    ] as const;
  }, [dataPlane, selfcheck, t]);

  return (
    <section className="missionControl missionControlCompact" id="how-veto-works">
      <div className="missionCompactHead">
        <div>
          <span className="missionEyebrow"><i /> {t.eyebrow}</span>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>

        <div className="missionStatusCompact" aria-label={t.status}>
          {statuses.map(([label, state, text]) => (
            <span
              className={state == null ? "checking" : state ? "ready" : "pending"}
              key={label}
            >
              <i />
              <b>{label}</b>
              <em>{text}</em>
            </span>
          ))}
        </div>
      </div>

      <div className="missionFlowCompact">
        {t.flow.map(([number, label, description], index) => (
          <div key={label}>
            <span>{number}</span>
            <strong>{label}</strong>
            <small>{description}</small>
            {index < t.flow.length - 1 && <i>→</i>}
          </div>
        ))}
      </div>

      <div className="decisionLanguage decisionLanguageCompact">
        {t.decisions.map(([decision, description]) => (
          <article className={decision.toLowerCase()} key={decision}>
            <div><i /><strong>{decision}</strong></div>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <details className="missionDetails">
        <summary>
          <span>{t.details}</span>
          <i>+</i>
        </summary>
        <div className="missionDetailGrid">
          {t.modules.map(([title, description]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
