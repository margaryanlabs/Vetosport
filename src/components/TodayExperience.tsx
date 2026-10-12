"use client";

import type { Sport } from "@/lib/domain/types";
import type { LiveEventSummary } from "@/lib/live/types";
import { SportGlyph } from "@/components/SportGlyph";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const freshness = (event: LiveEventSummary) => {
  if (!event.lastUpdatedAt) return "Время обновления не передано";
  const age = Math.max(0, Math.round((Date.now() - new Date(event.lastUpdatedAt).getTime()) / 1000));
  return age < 60 ? `обновлено ${age}с назад` : `обновлено ${Math.round(age / 60)}м назад`;
};

export function TodayExperience({
  events,
  activeSport,
  sourceMode,
  onOpenEvent,
  onOpenMatches,
  onOpenResearch,
  onSportChange,
}: {
  events: LiveEventSummary[];
  activeSport: Sport;
  sourceMode: "persisted" | "sandbox-fallback";
  onOpenEvent: (id: string) => void;
  onOpenMatches: () => void;
  onOpenResearch: () => void;
  onSportChange: (sport: Sport) => void;
}) {
  const sourceIsLive = sourceMode === "persisted";
  const visibleEvents = events.filter((event) => event.sport === activeSport);
  const displayedEvents = visibleEvents.length ? visibleEvents : events;
  const ready = events.filter((event) => event.intelligenceReady).length;
  const withSignal = events.filter((event) => event.primarySignal && event.primarySignal.decision !== "PASS");
  const sports: Sport[] = ["football", "basketball", "tennis", "hockey"];
  const labels: Record<Sport, string> = {
    football: "Футбол", basketball: "Баскетбол", tennis: "Теннис", hockey: "Хоккей",
    baseball: "Бейсбол", mma: "MMA", esports: "Киберспорт",
  };

  return (
    <section className="todayExperience" aria-label="VETO Sport сегодня">
      <header className="todayHero">
        <div className="todayHeroCopy">
          <span className="todayEyebrow">VETO SPORT · ИНТЕЛЛЕКТУАЛЬНЫЙ ОБЗОР</span>
          <h1>Сначала пойми матч.<br /><em>Потом исследуй цену.</em></h1>
          <p>
            VETO сопоставляет состояние матча, рыночную вероятность и проверяемые
            данные. Решение появляется только там, где пройдены необходимые проверки.
          </p>
          <div className="todayActions">
            <button className="vetoButton primary" onClick={onOpenMatches} type="button">Смотреть матчи <span>→</span></button>
            <button className="vetoButton subtle" onClick={onOpenResearch} type="button">Открыть лабораторию</button>
          </div>
        </div>

        <aside className={`todayAvailability ${sourceIsLive ? "live" : "demo"}`}>
          <div className="todayAvailabilityHead"><span>ДОСТУПНОСТЬ ДАННЫХ</span><i /></div>
          <strong>{sourceIsLive ? "LIVE DATA" : "DEMO / SIMULATION"}</strong>
          <p>
            {sourceIsLive
              ? "Показаны сохранённые наблюдения. Источник и время обновления видны в каждом матче."
              : "Провайдер не передал активные сохранённые матчи. Показан явно помеченный набор симуляции — не live-рынок."}
          </p>
          <dl>
            <div><dt>СОБЫТИЯ</dt><dd>{events.length}</dd></div>
            <div><dt>ПРОВЕРЕНЫ</dt><dd>{ready}</dd></div>
            <div><dt>СИГНАЛЫ</dt><dd>{withSignal.length}</dd></div>
          </dl>
        </aside>
      </header>

      <div className="todaySportPicker" aria-label="Выбор спорта">
        {sports.map((sport) => (
          <button className={activeSport === sport ? "active" : ""} key={sport} onClick={() => onSportChange(sport)} type="button">
            <SportGlyph size={17} sport={sport} /><span>{labels[sport]}</span>
          </button>
        ))}
      </div>

      <section className="todaySection" aria-labelledby="today-live-title">
        <header className="todaySectionHead">
          <div><span>СЕЙЧАС</span><h2 id="today-live-title">Матчи для наблюдения</h2></div>
          <button className="textButton" onClick={onOpenMatches} type="button">Все матчи <span>→</span></button>
        </header>

        <div className="todayMatchGrid">
          {displayedEvents.length ? displayedEvents.slice(0, 4).map((event) => {
            const primary = event.primarySignal;
            const sourceLive = event.source === "persisted";
            return (
              <button className="todayMatchCard" key={event.id} onClick={() => onOpenEvent(event.id)} type="button">
                <div className="todayMatchMeta">
                  <span><SportGlyph size={15} sport={event.sport} /> {event.sportLabel}</span>
                  <em className={sourceLive ? "live" : "demo"}>{sourceLive ? "LIVE DATA" : "DEMO"}</em>
                </div>
                <small>{event.competition}</small>
                <div className="todayScoreline">
                  <span><b>{event.homeName}</b><strong>{event.homeScore}</strong></span>
                  <span><b>{event.awayName}</b><strong>{event.awayScore}</strong></span>
                </div>
                <div className="todayMatchFoot">
                  <span>{event.clock} · {freshness(event)}</span>
                  {primary ? (
                    <strong className={primary.decision.toLowerCase()}>{primary.decision} · {pct(primary.fairProbability)}</strong>
                  ) : (
                    <strong className="neutral">{event.shadowPredictionCount ? "RESEARCH" : "НАБЛЮДЕНИЕ"}</strong>
                  )}
                </div>
              </button>
            );
          }) : (
            <div className="vetoEmptyState"><span>СОБЫТИЯ ПОКА НЕДОСТУПНЫ</span><p>Когда поступит проверенное наблюдение, VETO покажет его здесь вместе с источником и свежестью данных.</p></div>
          )}
        </div>
      </section>

      <div className="todayLowerGrid">
        <section className="todaySection todaySignals" aria-labelledby="today-signal-title">
          <header className="todaySectionHead"><div><span>ИНТЕЛЛЕКТ</span><h2 id="today-signal-title">Что стоит изучить</h2></div></header>
          {withSignal.length ? (
            <div className="todaySignalList">
              {withSignal.slice(0, 3).map((event) => {
                const signal = event.primarySignal!;
                return <button key={event.id} onClick={() => onOpenEvent(event.id)} type="button">
                  <div><span>{event.homeCode} — {event.awayCode}</span><strong>{signal.label}</strong></div>
                  <div><em className={signal.decision.toLowerCase()}>{signal.decision}</em><b>{pct(signal.fairProbability)}</b></div>
                </button>;
              })}
            </div>
          ) : (
            <div className="vetoEmptyState compact"><span>НЕТ ПРОВЕРЕННЫХ СИГНАЛОВ</span><p>VETO не заполняет экран выдуманными возможностями. Можно открыть матч и увидеть, каких проверок не хватает.</p></div>
          )}
        </section>

        <section className="todayResearchCard">
          <span>ЛАБОРАТОРИЯ VETO</span>
          <h2>Глубокое исследование без перегруза главного экрана.</h2>
          <p>Поверхности вероятностей, Parallax, совет моделей, Replay и Decision Proof остаются доступны отдельно от ежедневного обзора.</p>
          <button className="textButton" onClick={onOpenResearch} type="button">Перейти в лабораторию <span>→</span></button>
        </section>
      </div>
    </section>
  );
}
