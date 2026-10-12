"use client";

import type { Sport } from "@/lib/domain/types";
import type { LiveEventSummary } from "@/lib/live/types";
import { SportGlyph } from "@/components/SportGlyph";
import {PitchVision} from "@/components/PitchVision";
import {getObservedFreshness} from "@/lib/live/freshness";

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
  onOpenSystem,
}: {
  events: LiveEventSummary[];
  activeSport: Sport;
  onSportChange: (sport: Sport) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenMatches: () => void;
  onOpenResearch: () => void;
  onOpenSystem: () => void;
}) {
  const sportEvents = events.filter((event) => event.sport === activeSport);
  // Never show another sport as though it belonged to the selected tab.
  const visibleEvents = sportEvents;
  const heroEvent = sportEvents.find(e=>e.source==="persisted") ?? sportEvents[0];
  const sportOptions = Array.from(new Set(events.map((event) => event.sport)));
  const observedCount = events.filter((event) => event.source === "persisted").length;
  const liveCount = events.filter(event=>getObservedFreshness(event).freshLive).length;
  const researchCount = events.filter(event=>event.source==="persisted"&&(event.shadowPredictionCount||event.intelligenceReady)).length;

  return (
    <section className="todayExperience" aria-labelledby="today-title">
      <header className="todayHero">
        <div className="todayKicker"><i />СПОРТИВНЫЙ ИНТЕЛЛЕКТ БЕЗ ВЫДУМКИ</div>
        <div className="todayHeroBody todayHeroBodyShowcase">
          <div className="todayHeroCopy">
            <span className="todayEyebrow">THE GAME. THE EVIDENCE. THE DECISION.</span>
            <h1 id="today-title">Спорт, который<br/><em>можно понять.</em></h1>
            <p>Выбери матч, посмотри счёт и данные, затем проверь вывод VETO. Никаких сложных терминов до того, как увидишь саму игру.</p>
            <div className="todayHeroActions">
              <button type="button" className="todayPrimaryAction" onClick={onOpenMatches}>Смотреть матчи <span>↗</span></button>
              <button type="button" className="todaySecondaryAction" onClick={()=>heroEvent ? onSelectEvent(heroEvent.id):onOpenMatches()}>Разобрать матч <span>→</span></button>
            </div>
            <div className="todayDataTruth todayDataTruthInline" aria-label="Состояние данных">
              <i className={liveCount?"available":"awaiting"}/>
              <span>{liveCount ? `${liveCount} свежих live-событий` : observedCount ? `${observedCount} сохранённых событий · актуальность не подтверждена` : "Сейчас нет подтверждённого live-потока"}</span>
              <button type="button" onClick={onOpenSystem}>Откуда данные? ↗</button>
            </div>
          </div>
          <div className="todayHeroVision">
            {heroEvent ? <PitchVision event={heroEvent} onOpen={()=>onSelectEvent(heroEvent.id)}/> :
              <div className="todayHeroNoVision"><SportGlyph sport={activeSport} size={65}/><strong>Ожидаем события</strong><span>Выбери другой спорт или открой раздел матчей.</span></div>}
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

      <section className="todayStart" aria-label="С чего начать">
        <header><span>VETO / YOUR FIRST 30 SECONDS</span><strong>Три понятных шага — выбери, что тебе нужно.</strong></header>
        <div className="todayStartGrid">
          <button type="button" onClick={onOpenMatches}><span className="todayStartNumber">01</span><strong>Смотреть матчи</strong><small>Счёт, время, турнир и источник информации.</small><b aria-hidden>↗</b></button>
          <button type="button" onClick={()=>heroEvent ? onSelectEvent(heroEvent.id) : onOpenMatches()}><span className="todayStartNumber">02</span><strong>Разобрать игру</strong><small>Понять прогноз, цену и что может пойти не так.</small><b aria-hidden>↗</b></button>
          <button type="button" onClick={onOpenResearch}><span className="todayStartNumber">03</span><strong>Исследовать стратегию</strong><small>Графики, история проверок и лаборатории.</small><b aria-hidden>↗</b></button>
        </div>
      </section>

      <section className="todaySection" aria-labelledby="today-live-title">
        <div className="todaySectionHead">
          <div>
            <span>{liveCount?"СВЕЖИЕ МАТЧИ":"СОБЫТИЯ / ВАЖНО ПРОВЕРИТЬ ИСТОЧНИК"}</span>
            <h2 id="today-live-title">Матчи. Счёт. Что происходит.</h2>
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
                    <i />{live ? "СОХРАНЕНО / ПРОВЕРЬ ВРЕМЯ" : "ДЕМО / НЕ РЕАЛЬНЫЙ МАТЧ"}
                  </span>
                  <span>{event.clock}</span>
                </header>
                <div className="todayCompetition"><SportGlyph sport={event.sport} size={18} />{event.competition}</div>
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
            <span className="todayCount">{researchCount ? `${researchCount} С ИСТОЧНИКОМ` : "RESEARCH / EXPLORE"}</span>
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
