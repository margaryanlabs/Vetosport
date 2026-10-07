"use client";

import type { Locale } from "@/lib/domain/types";

const copy = {
  ru: {
    eyebrow: "HOW IT WORKS",
    title: "Одна логика. Четыре шага.",
    subtitle:
      "VETO сначала читает игру, потом рынок — и только после этого формирует решение.",
    flow: [
      ["01", "Состояние", "Что происходит в матче прямо сейчас."],
      ["02", "Рынок", "Что уже заложено в текущую цену."],
      ["03", "PARALLAX", "Где модель и рынок начинают расходиться."],
      ["04", "Решение", "EDGE, WATCH или PASS — без фальшивой уверенности."],
    ],
    foot:
      "EDGE — исследовательский сигнал, а не обещание результата.",
  },
  en: {
    eyebrow: "HOW IT WORKS",
    title: "One logic. Four steps.",
    subtitle:
      "VETO reads the game first, the market second, and only then forms a decision.",
    flow: [
      ["01", "State", "What is happening in the event right now."],
      ["02", "Market", "What current price already implies."],
      ["03", "PARALLAX", "Where model and market begin to diverge."],
      ["04", "Decision", "EDGE, WATCH or PASS — without fake certainty."],
    ],
    foot:
      "EDGE is a research signal, not a promise of an outcome.",
  },
  hy: {
    eyebrow: "HOW IT WORKS",
    title: "Մեկ տրամաբանություն։ Չորս քայլ։",
    subtitle:
      "VETO-ն նախ կարդում է խաղը, հետո շուկան և միայն դրանից հետո ձևավորում որոշումը։",
    flow: [
      ["01", "Վիճակ", "Ինչ է կատարվում իրադարձությունում հենց հիմա։"],
      ["02", "Շուկա", "Ինչն արդեն ներառված է ընթացիկ գնի մեջ։"],
      ["03", "PARALLAX", "Որտեղ են մոդելն ու շուկան սկսում տարբերվել։"],
      ["04", "Որոշում", "EDGE, WATCH կամ PASS՝ առանց կեղծ վստահության։"],
    ],
    foot:
      "EDGE-ը research signal է, ոչ արդյունքի խոստում։",
  },
} satisfies Record<Locale, unknown>;

export function MissionControlIntro({ locale }: { locale: Locale }) {
  const t = copy[locale] as typeof copy.ru;

  return (
    <section className="v2How" id="how-veto-works">
      <div className="v2HowLead">
        <span>{t.eyebrow}</span>
        <h2>{t.title}</h2>
        <p>{t.subtitle}</p>
      </div>

      <div className="v2HowFlow">
        {t.flow.map(([n, title, description]) => (
          <article key={n}>
            <span>{n}</span>
            <strong>{title}</strong>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <p className="v2HowFoot">{t.foot}</p>
    </section>
  );
}
