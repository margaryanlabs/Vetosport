"use client";

import type { Sport } from "@/lib/domain/types";
import type { LiveEventSummary } from "@/lib/live/types";
import { SportGlyph } from "@/components/SportGlyph";

const sportNames: Record<Sport, string> = {
  football: "Футбол",
  basketball: "Баскетбол",
  tennis: "Теннис",
  hockey: "Хоккей",
  baseball: "Бейсбол",
  mma: "MMA",
  esports: "Esports",
};

const readinessLabel = (event: LiveEventSummary) => {
  if (event.source === "sandbox") return "СИМУЛЯЦИЯ";
  if (event.primarySignal) return "АНАЛИЗ ДОСТУПЕН";
  if (event.shadowPredictionCount) return "ИССЛЕДОВАНИЕ";

  switch (event.decisionReadiness?.status) {
    case "DATA_PENDING":
      return "ОЖИДАЕМ ДАННЫЕ";
    case "MODEL_INPUT_INCOMPLETE":
      return "НЕ ХВАТАЕТ ВХОДОВ";
    case "MARKET_MAPPING_INCOMPLETE":
      return "ПРОВЕРЯЕМ РЫНКИ";
    case "GOVERNANCE_BLOCKED":
      return "ПРОВЕРКА БЛОКИРУЕТ";
    case "DECISION_READY":
      return "ПРОВЕРКА ГОТОВА";
    default:
      return "НАБЛЮДЕНИЕ";
  }
};

const freshness = (event: LiveEventSummary) => {
  if (!event.lastUpdatedAt) return event.source === "persisted" ? "Время обновления не передано" : "Учебный набор данных";
  const timestamp = new Date(event.lastUpdatedAt).getTime();
  if (!Number.isFinite(timestamp)) return "Время обновления не передано";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  return seconds < 60 ? `Обновлено ${seconds} сек. назад` : `Обновлено ${Math.round(seconds / 60)} мин. назад`;
};

export function TodayExperience({
  events,
  activeSport,
  onSportChange,
  onSelectEvent,
  onOpenMatches,
  onOpenResearch,
}: {
  events: LiveEventSummary[];
  activeSport: Sport;
  onSportChange: (sport: Sport) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenMatches: () => void;
  onOpenResearch: () => void;
}) {
  const sportEvents = events.filter((event) => event.sport === activeSport);
  const visibleEvents = sportEvents.length ? sportEvents : events;
  const sportOptions = Array.from(new Set(events.map((event) => event.sport)));
  const liveCount = events.filter((event) => event.source === "persisted").length;
  const researchCount = events.filter((event) => event.shadowPredictionCount || event.intelligenceReady).length;

  return (
    <section className="todayExperience" aria-labelledby="today-title">
      <header className="todayHero">
        <div className="todayKicker"><i />СПОРТИВНЫЙ ИНТЕЛЛЕКТ БЕЗ ВЫДУМКИ</div>
        <div className="todayHeroBody">
          <div>
            <h1 id="today-title">Понимай матч прежде, чем делать выводы.</h1>
            <p>
              VETO Sport сопоставляет состояние игры, рыночные цены и доказательства.
              Если данных недостаточно, это видно сразу.
            </p>
          </div>
          <div className="todayDataTruth" aria-label="Состояние данных">
            <span>ДАННЫЕ СЕЙЧАС</span>
            <strong>{liveCount ? `${liveCount} LIVE` : "НЕТ LIVE"}</strong>
            <small>{liveCount ? "События с сохранённой линией источника" : "Показаны только явно отмеченные симуляции"}</small>
          </div>
        </div>
        <div className="todaySportPicker" aria-label="Выбор спорта">
          {sportOptions.map((sport) => (
            <button
              aria-pressed={activeSport === sport}
              className={activeSport === sport ? "active" : ""}
              key={sport}
              onClick={() => onSportChange(sport)}
              type="button"
            >
              <SportGlyph sport={sport} size={17} />
              <span>{sportNames[sport]}</span>
            </button>
          ))}
        </div>
      </header>

      <section className="todaySection" aria-labelledby="today-live-title">
        <div className="todaySectionHead">
          <div>
            <span>СЕЙЧАС В ФОКУСЕ</span>
            <h2 id="today-live-title">Матчи и состояние информации</h2>
          </div>
          <button className="todayTextAction" onClick={onOpenMatches} type="button">Все матчи <span>→</span></button>
        </div>

        <div className="todayMatchGrid">
          {visibleEvents.length ? visibleEvents.slice(0, 6).map((event) => {
            const live = event.source === "persisted";
            return (
              <article className={`todayMatchCard source-${event.source}`} key={event.id}>
                <header>
                  <span className={`todaySourceBadge ${live ? "live" : "simulation"}`}>
                    <i />{live ? "LIVE DATA" : "SIMULATION"}
                  </span>
                  <span>{event.clock}</span>
                </header>
                <div className="todayCompetition"><SportGlyph sport={event.sport} size={15} />{event.competition}</div>
                <div className="todayScore">
                  <div><strong>{event.homeName}</strong><span>{event.homeCode}</span></div>
                  <b>{event.homeScore}<i>:</i>{event.awayScore}</b>
                  <div><strong>{event.awayName}</strong><span>{event.awayCode}</span></div>
                </div>
                <div className="todayCardFooter">
                  <div>
                    <span>{readinessLabel(event)}</span>
                    <small>{freshness(event)}</small>
                  </div>
                  <button onClick={() => onSelectEvent(event.id)} type="button">Проверить</button>
                </div>
              </article>
            );
          }) : (
            <div className="todayEmptyState">
              <strong>Для этого спорта нет доступных событий.</strong>
              <p>VETO не создаёт карточки из предположений. Выберите другой спорт или откройте все матчи.</p>
              <button onClick={onOpenMatches} type="button">Открыть матчи</button>
            </div>
          )}
        </div>
      </section>

      <div className="todayLowerGrid">
        <section className="todaySection todayHighlights" aria-labelledby="today-highlights-title">
          <div className="todaySectionHead">
            <div>
              <span>ПРИОРИТЕТ ИНТЕЛЛЕКТА</span>
              <h2 id="today-highlights-title">Что можно изучить</h2>
            </div>
            <span className="todayCount">{researchCount} ДОСТУПНО</span>
          </div>
          <div className="todayResearchList">
            <article>
              <span>01</span>
              <div><strong>Parallax</strong><p>Разница между оценкой VETO и вероятностью, заложенной в цене.</p></div>
              <button onClick={onOpenResearch} type="button">Открыть</button>
            </article>
            <article>
              <span>02</span>
              <div><strong>Replay</strong><p>Что именно было известно в каждый сохранённый момент.</p></div>
              <button onClick={onOpenResearch} type="button">Открыть</button>
            </article>
            <article>
              <span>03</span>
              <div><strong>Decision Proof</strong><p>Проверка источника, времени, расчёта и последующего результата.</p></div>
              <button onClick={onOpenResearch} type="button">Открыть</button>
            </article>
          </div>
        </section>

        <aside className="todayIntegrity">
          <span>КАК ЧИТАТЬ VETO</span>
          <h2>Сигнал — не обещание.</h2>
          <p>Оценка модели, цена рынка и итоговая проверка показываются отдельно, чтобы не выдавать гипотезу за факт.</p>
          <ul>
            <li><i className="live" />Live data — источник и свежесть сохранены.</li>
            <li><i className="research" />Research — материал для изучения, не рекомендация.</li>
            <li><i className="simulation" />Simulation — демонстрационный набор данных.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
