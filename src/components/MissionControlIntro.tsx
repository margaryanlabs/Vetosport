"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/domain/types";

type DataPlaneStatus = {
  runtime?: {
    persistenceConfigured?: boolean;
    sportmonksConfigured?: boolean;
    oddsConfigured?: boolean;
    mode?: string;
  };
  storageReachable?: boolean;
};

type SelfcheckStatus = {
  passed?: boolean;
  researchLayers?: {
    parallax?: { passed?: boolean };
  };
};

type GlyphName = "pulse" | "radar" | "orbit" | "bolt" | "shield" | "target";

const copy = {
  ru: {
    eyebrow: "MISSION CONTROL / START HERE",
    title: "Пойми VETO за 30 секунд",
    subtitle:
      "Система сначала реконструирует состояние матча, затем рынок — и ищет места, где цена не совпадает с наиболее обоснованной картиной мира.",
    philosophy: "VETO не выбирает победителя. VETO проверяет цену.",
    cards: [
      ["Live Match State", "Что реально происходит в матче прямо сейчас.", "pulse"],
      ["Market Intelligence", "Как букмекеры и связанные рынки реагируют на новую информацию.", "radar"],
      ["PARALLAX Engine", "Скрытые состояния, coherence, propagation и смена regime.", "orbit"],
      ["Shock Detection", "Отделяет информационный шок от шума, ликвидности и feed anomaly.", "bolt"],
      ["Authority Frontier", "Определяет, когда доказательств уже достаточно, чтобы доверять сигналу.", "shield"],
      ["Decision Layer", "EDGE / WATCH / PASS вместо фальшивой уверенности.", "target"],
    ] as const,
    how: "Как читать терминал",
    steps: [
      "Выбери матч",
      "Проверь live state",
      "Посмотри реакцию рынка",
      "Открой PARALLAX",
      "Оцени authority",
      "Читай EDGE / WATCH / PASS",
    ],
    system: "SYSTEM READINESS",
    core: "CORE",
    storage: "TRUTH JOURNAL",
    feeds: "LIVE FEEDS",
    parallax: "PARALLAX",
    ready: "READY",
    connected: "CONNECTED",
    pending: "PENDING",
    passed: "PASSED",
    tourTitle: "Добро пожаловать в VETO Sport",
    tourSubtitle: "Это не сервис прогнозов. Это исследовательский терминал, который проверяет цену рынка.",
    tourSlides: [
      ["01 · STATE", "Сначала VETO строит текущее состояние события: счёт, темп, контекст, live-факторы."],
      ["02 · MARKET", "Затем система сравнивает это состояние с тем, что уже заложено в линии и связанных рынках."],
      ["03 · DECISION", "Только после проверки uncertainty, regime и authority появляется EDGE, WATCH или PASS."],
    ],
    skip: "Пропустить",
    next: "Дальше",
    open: "Открыть терминал",
  },
  en: {
    eyebrow: "MISSION CONTROL / START HERE",
    title: "Understand VETO in 30 seconds",
    subtitle:
      "The system reconstructs the match state, reconstructs the market-implied world, then looks for places where price and evidence diverge.",
    philosophy: "VETO doesn’t pick winners. VETO audits the price.",
    cards: [
      ["Live Match State", "What is actually happening inside the game right now.", "pulse"],
      ["Market Intelligence", "How bookmakers and linked markets react to new information.", "radar"],
      ["PARALLAX Engine", "Hidden state, coherence, propagation and regime transitions.", "orbit"],
      ["Shock Detection", "Separates information shock from noise, liquidity and feed anomalies.", "bolt"],
      ["Authority Frontier", "Decides when evidence is strong enough to trust an early signal.", "shield"],
      ["Decision Layer", "EDGE / WATCH / PASS instead of fake certainty.", "target"],
    ] as const,
    how: "How to read the terminal",
    steps: [
      "Select a match",
      "Read live state",
      "Inspect market reaction",
      "Open PARALLAX",
      "Check authority",
      "Read EDGE / WATCH / PASS",
    ],
    system: "SYSTEM READINESS",
    core: "CORE",
    storage: "TRUTH JOURNAL",
    feeds: "LIVE FEEDS",
    parallax: "PARALLAX",
    ready: "READY",
    connected: "CONNECTED",
    pending: "PENDING",
    passed: "PASSED",
    tourTitle: "Welcome to VETO Sport",
    tourSubtitle: "This is not a prediction service. It is a research terminal that audits market price.",
    tourSlides: [
      ["01 · STATE", "VETO first models the current event state: score, tempo, context and live factors."],
      ["02 · MARKET", "It then compares that state with what the price and linked markets already imply."],
      ["03 · DECISION", "Only after uncertainty, regime and authority checks does VETO return EDGE, WATCH or PASS."],
    ],
    skip: "Skip",
    next: "Next",
    open: "Open terminal",
  },
  hy: {
    eyebrow: "MISSION CONTROL / START HERE",
    title: "Հասկացիր VETO-ն 30 վայրկյանում",
    subtitle:
      "Համակարգը վերականգնում է խաղի վիճակը, շուկայի ենթադրվող աշխարհը և գտնում է այն կետերը, որտեղ գինը շեղվում է ապացույցներից։",
    philosophy: "VETO-ն չի ընտրում հաղթողին։ VETO-ն ստուգում է գինը։",
    cards: [
      ["Live Match State", "Ինչ է իրականում տեղի ունենում խաղում հենց հիմա։", "pulse"],
      ["Market Intelligence", "Ինչպես են բուքմեյքերներն ու կապված շուկաները արձագանքում։", "radar"],
      ["PARALLAX Engine", "Թաքնված վիճակներ, coherence, propagation և regime transitions։", "orbit"],
      ["Shock Detection", "Տարբերակում է ինֆորմացիոն շոկը աղմուկից և feed anomaly-ից։", "bolt"],
      ["Authority Frontier", "Որոշում է՝ երբ ապացույցները բավարար են ազդանշանին վստահելու համար։", "shield"],
      ["Decision Layer", "EDGE / WATCH / PASS՝ կեղծ վստահության փոխարեն։", "target"],
    ] as const,
    how: "Ինչպես կարդալ տերմինալը",
    steps: [
      "Ընտրիր խաղը",
      "Կարդա live state-ը",
      "Դիտիր շուկայի արձագանքը",
      "Բացիր PARALLAX-ը",
      "Ստուգիր authority-ն",
      "Կարդա EDGE / WATCH / PASS",
    ],
    system: "SYSTEM READINESS",
    core: "CORE",
    storage: "TRUTH JOURNAL",
    feeds: "LIVE FEEDS",
    parallax: "PARALLAX",
    ready: "READY",
    connected: "CONNECTED",
    pending: "PENDING",
    passed: "PASSED",
    tourTitle: "Բարի գալուստ VETO Sport",
    tourSubtitle: "Սա կանխատեսումների ծառայություն չէ։ Սա շուկայի գինը ստուգող research terminal է։",
    tourSlides: [
      ["01 · STATE", "VETO-ն նախ մոդելավորում է իրադարձության ներկա վիճակը։"],
      ["02 · MARKET", "Այն համեմատում է վիճակը շուկայական գնի և կապված շուկաների հետ։"],
      ["03 · DECISION", "Միայն uncertainty, regime և authority ստուգումներից հետո ստացվում է EDGE, WATCH կամ PASS։"],
    ],
    skip: "Բաց թողնել",
    next: "Հաջորդը",
    open: "Բացել տերմինալը",
  },
} satisfies Record<Locale, unknown>;

function Glyph({ name }: { name: GlyphName }) {
  if (name === "pulse") {
    return <svg viewBox="0 0 28 28" aria-hidden><path d="M3 15h5l2.2-6 4.1 12 2.5-8 2.2 2H25" /><circle cx="14" cy="14" r="10.5" /></svg>;
  }
  if (name === "radar") {
    return <svg viewBox="0 0 28 28" aria-hidden><circle cx="14" cy="14" r="10.5" /><circle cx="14" cy="14" r="6.2" /><circle cx="14" cy="14" r="2.1" /><path d="M14 14 22 8" /></svg>;
  }
  if (name === "orbit") {
    return <svg viewBox="0 0 28 28" aria-hidden><circle cx="14" cy="14" r="3" /><ellipse cx="14" cy="14" rx="11" ry="5.2" transform="rotate(35 14 14)" /><ellipse cx="14" cy="14" rx="11" ry="5.2" transform="rotate(-35 14 14)" /><circle cx="22" cy="10" r="1.4" /></svg>;
  }
  if (name === "bolt") {
    return <svg viewBox="0 0 28 28" aria-hidden><path d="M16.5 2.8 7 15h6l-1.5 10.2L21 12.5h-6L16.5 2.8Z" /></svg>;
  }
  if (name === "shield") {
    return <svg viewBox="0 0 28 28" aria-hidden><path d="M14 3 23 6.5v6.8c0 5.5-3.6 9.5-9 11.7-5.4-2.2-9-6.2-9-11.7V6.5L14 3Z" /><path d="m9.5 14 3 3 6-6" /></svg>;
  }
  return <svg viewBox="0 0 28 28" aria-hidden><circle cx="14" cy="14" r="10.5" /><circle cx="14" cy="14" r="5.2" /><circle cx="14" cy="14" r="1.7" /><path d="M14 3v3M14 22v3M3 14h3M22 14h3" /></svg>;
}

export function MissionControlIntro({ locale }: { locale: Locale }) {
  const t = copy[locale] as typeof copy.ru;
  const [dataPlane, setDataPlane] = useState<DataPlaneStatus | null>(null);
  const [selfcheck, setSelfcheck] = useState<SelfcheckStatus | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/intelligence/data-plane/status", { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/intelligence/selfcheck", { cache: "no-store" }).then((r) => r.ok ? r.json() : null),
    ])
      .then(([plane, check]) => {
        if (!active) return;
        setDataPlane(plane as DataPlaneStatus | null);
        setSelfcheck(check as SelfcheckStatus | null);
      })
      .catch(() => {});

    try {
      if (!window.localStorage.getItem("veto-sport-intro-seen-v1")) {
        setShowTour(true);
      }
    } catch {}

    return () => {
      active = false;
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem("veto-sport-intro-seen-v1", "1");
    } catch {}
    setShowTour(false);
    setTourStep(0);
  };

  const statuses = useMemo(() => {
    const feeds =
      Boolean(dataPlane?.runtime?.sportmonksConfigured) &&
      Boolean(dataPlane?.runtime?.oddsConfigured);

    return [
      [t.core, Boolean(selfcheck?.passed), t.ready],
      [t.storage, Boolean(dataPlane?.storageReachable), t.connected],
      [t.feeds, feeds, feeds ? t.connected : t.pending],
      [t.parallax, Boolean(selfcheck?.researchLayers?.parallax?.passed ?? selfcheck?.passed), t.passed],
    ] as const;
  }, [dataPlane, selfcheck, t]);

  return (
    <>
      <section className="missionControl" id="how-veto-works">
        <div className="missionBackdrop" aria-hidden>
          <span className="missionOrb missionOrbOne" />
          <span className="missionOrb missionOrbTwo" />
          <span className="missionSweep" />
        </div>

        <div className="missionHead">
          <div>
            <span className="missionEyebrow"><i /> {t.eyebrow}</span>
            <h2>{t.title}</h2>
            <p>{t.subtitle}</p>
          </div>

          <div className="missionPhilosophy">
            <span>CORE THESIS</span>
            <strong>{t.philosophy}</strong>
          </div>
        </div>

        <div className="missionReadiness">
          <span className="missionReadinessLabel">{t.system}</span>
          <div className="missionReadinessGrid">
            {statuses.map(([label, ok, state]) => (
              <div className={ok ? "ready" : "pending"} key={label}>
                <i />
                <span>{label}</span>
                <b>{state}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="missionCards">
          {t.cards.map(([title, description, glyph], index) => (
            <article className="missionCard" key={title}>
              <div className="missionCardTop">
                <span className="missionGlyph"><Glyph name={glyph as GlyphName} /></span>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <div className="missionCardLine"><span /></div>
            </article>
          ))}
        </div>

        <div className="missionSteps">
          <div className="missionStepsHead">
            <span>{t.how}</span>
            <small>STATE → MARKET → PARALLAX → AUTHORITY → DECISION</small>
          </div>
          <div className="missionStepsRail">
            {t.steps.map((step, index) => (
              <a href={index === 0 ? "#live" : index === 3 ? "#parallax" : "#events"} key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
                {index < t.steps.length - 1 && <i>→</i>}
              </a>
            ))}
          </div>
        </div>
      </section>

      {showTour && (
        <div className="vetoTourOverlay" role="dialog" aria-modal="true" aria-label={t.tourTitle}>
          <div className="vetoTourCard">
            <div className="vetoTourAura" aria-hidden />
            <button className="vetoTourSkip" type="button" onClick={dismiss}>{t.skip}</button>

            <div className="vetoTourMark">
              <span><Glyph name={tourStep === 0 ? "pulse" : tourStep === 1 ? "radar" : "target"} /></span>
              <i>VETO / FIRST RUN</i>
            </div>

            <h2>{tourStep === 0 ? t.tourTitle : t.tourSlides[tourStep][0]}</h2>
            <p>{tourStep === 0 ? t.tourSubtitle : t.tourSlides[tourStep][1]}</p>

            <div className="vetoTourMiniFlow">
              {t.tourSlides.map(([label], index) => (
                <button
                  className={tourStep === index + 1 ? "active" : ""}
                  key={label}
                  onClick={() => setTourStep(index + 1)}
                  type="button"
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{label.split("·")[1]?.trim() ?? label}</b>
                </button>
              ))}
            </div>

            <div className="vetoTourFooter">
              <div>
                {[0, 1, 2, 3].map((dot) => <i className={tourStep === dot ? "active" : ""} key={dot} />)}
              </div>
              <button
                className="vetoTourPrimary"
                type="button"
                onClick={() => {
                  if (tourStep < 3) setTourStep((step) => step + 1);
                  else dismiss();
                }}
              >
                {tourStep < 3 ? t.next : t.open}
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
