"use client";

import type { LiveEventSummary } from "@/lib/live/types";

export function HistoryExperience({
  events,
  onOpenEvent,
}: {
  events: LiveEventSummary[];
  onOpenEvent: (id: string) => void;
}) {
  const persisted = events.filter((event) => event.source === "persisted");

  return (
    <section className="historyExperience">
      <header className="sceneHeading">
        <span>ИСТОРИЯ</span>
        <h1>Наблюдения и повтор решений.</h1>
        <p>История не восстанавливается из догадок: подтверждённые точки берутся из неизменяемого реестра, а реконструкции всегда отмечены отдельно.</p>
      </header>

      <section className="historyMethod">
        <article><span>01</span><strong>Откройте матч</strong><p>Выберите событие, чтобы увидеть его состояние, рынок и объяснение VETO.</p></article>
        <article><span>02</span><strong>Перейдите в Replay</strong><p>Шкала покажет, что было известно в выбранный момент.</p></article>
        <article><span>03</span><strong>Проверьте Proof</strong><p>Результат, closing price и источник не смешиваются в одну оценку.</p></article>
      </section>

      <section className="historyEventList">
        <header><div><span>СОХРАНЁННЫЕ НАБЛЮДЕНИЯ</span><h2>{persisted.length ? `${persisted.length} с live-источником` : "Пока нет сохранённых live-наблюдений"}</h2></div><small>DEMO не выдаётся за историю</small></header>
        {persisted.length ? (
          persisted.map((event) => (
            <button key={event.id} onClick={() => onOpenEvent(event.id)} type="button">
              <span>LIVE DATA</span><strong>{event.homeName} — {event.awayName}</strong><em>{event.competition} · {event.clock}</em><b>Открыть Replay →</b>
            </button>
          ))
        ) : (
          <div className="vetoEmptyState"><span>РЕЕСТР ПОКА ПУСТ</span><p>После поступления persisted события оно появится здесь. Пока можно исследовать явно помеченный DEMO-набор и его учебный Replay.</p></div>
        )}
      </section>
    </section>
  );
}
