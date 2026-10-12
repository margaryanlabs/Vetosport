"use client";

import { useMemo, useState } from "react";
import type { Opportunity } from "@/lib/domain/types";
import type { LiveWorkspace } from "@/lib/sandbox/workspaces";

type PromptId = "match" | "change" | "risks" | "number" | "history" | "missing";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} п.п.`;

const prompts: Array<{ id: PromptId; label: string }> = [
  { id: "match", label: "Объяснить матч" },
  { id: "change", label: "Почему изменилась вероятность?" },
  { id: "risks", label: "Главные риски" },
  { id: "number", label: "Объяснить число" },
  { id: "history", label: "Показать историю" },
  { id: "missing", label: "Чего не хватает?" },
];

export function ExplanationAssistant({
  workspace,
  selected,
  source,
  onOpenReplay,
}: {
  workspace: LiveWorkspace;
  selected: Opportunity;
  source: "persisted" | "sandbox";
  onOpenReplay: () => void;
}) {
  const [active, setActive] = useState<PromptId>("match");
  const marketProbability = 1 / selected.marketOdds;
  const gap = selected.fairProbability - marketProbability;
  const content = useMemo<Record<PromptId, { title: string; body: string; facts: string[] }>>(() => ({
    match: {
      title: "Коротко о матче",
      body: `${workspace.reasonHeadline} VETO анализирует «${selected.selection.label}», но не заменяет рыночную проверку результатом модели.`,
      facts: [`VETO: ${pct(selected.fairProbability)}`, `Рынок: ${pct(marketProbability)}`, `Статус: ${selected.decision}`],
    },
    change: {
      title: "Почему поменялась оценка",
      body: workspace.reasonSummary,
      facts: workspace.changes.slice(0, 3).map((change) => `${change.label}: ${change.delta >= 0 ? "+" : ""}${(change.delta * 100).toFixed(1)} п.п.`),
    },
    risks: {
      title: "Что может опровергнуть гипотезу",
      body: workspace.invalidation,
      facts: [`Риск: ${selected.risk}`, `Согласие моделей: ${selected.modelAgreement}/100`, `Свежесть: ${selected.freshnessSeconds}с`],
    },
    number: {
      title: "Как читать это число",
      body: `Вероятность VETO — оценка модели; вероятность рынка получается из текущего коэффициента ${selected.marketOdds.toFixed(2)}. Разница — не обещание положительного результата.`,
      facts: [`Вероятность VETO: ${pct(selected.fairProbability)}`, `Имплайд рынка: ${pct(marketProbability)}`, `Разница: ${pp(gap)}`],
    },
    history: {
      title: "Как проверяется история",
      body: "В Replay VETO отделяет точки неизменяемого реестра от восстановленных из сохранённой шкалы вероятностей. Это разные уровни доказательности.",
      facts: [source === "persisted" ? "Контекст: сохранённое наблюдение" : "Контекст: DEMO / simulation", "Ledger: проверяется отдельно", "Replay: не является новой рекомендацией"],
    },
    missing: {
      title: "Что ещё не подтверждено",
      body: source === "persisted"
        ? "Даже при сохранённом событии VETO показывает только те решения, которые прошли проверки входных данных, карты рынка и governance."
        : "Этот экран использует явно помеченный набор симуляции. Его цифры не являются текущими котировками или live-подтверждением.",
      facts: [source === "persisted" ? "Источник события: persisted" : "Источник события: demo", "Рыночная цена должна быть актуальной", "Итог может быть не подтверждён"],
    },
  }), [gap, marketProbability, selected, source, workspace]);
  const current = content[active];

  return (
    <section className="explanationAssistant" aria-label="Пояснения VETO">
      <header><span>VETO EXPLAIN</span><strong>Пояснение на основе текущих данных</strong><small>Без подключённого AI-диалога</small></header>
      <div className="explanationActions">
        {prompts.map((prompt) => (
          <button className={active === prompt.id ? "active" : ""} key={prompt.id} onClick={() => {
            setActive(prompt.id);
            if (prompt.id === "history") onOpenReplay();
          }} type="button">{prompt.label}</button>
        ))}
      </div>
      <div className="explanationAnswer" aria-live="polite">
        <div><span>ОТВЕТ</span><h3>{current.title}</h3><p>{current.body}</p></div>
        <ul>{current.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
      </div>
    </section>
  );
}
