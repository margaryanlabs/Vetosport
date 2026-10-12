"use client";

import type {LiveEventSummary} from "@/lib/live/types";
import {SportGlyph} from "@/components/SportGlyph";

/**
 * Graphic matchcast, not a video feed or player tracking.
 * Every numeral comes exclusively from the supplied event snapshot.
 * The pitch lines and sweep are decorative and never imply ball coordinates.
 */
export function PitchVision({
  event,
  onOpen,
  compact = false,
}: {
  event: LiveEventSummary;
  onOpen?: () => void;
  compact?: boolean;
}) {
  const football = event.sport === "football";
  const persisted = event.source === "persisted";
  const sourceLabel = persisted ? "СОХРАНЁННЫЕ ДАННЫЕ" : "ДЕМОНСТРАЦИЯ";
  const sourceTime = event.lastUpdatedAt && Number.isFinite(Date.parse(event.lastUpdatedAt))
    ? new Date(event.lastUpdatedAt).toISOString().slice(11,16) + " UTC"
    : "НЕ ПОДТВЕРЖДЕНО";
  return (
    <section className={`pitchVision ${compact ? "pitchVisionCompact" : "pitchVisionHero"} ${football ? "" : "pitchVisionOther"}`}
      aria-label={football ? "Схематическое футбольное поле и счёт матча" : "Графический экран матча"}>
      <header className="pitchVisionTop">
        <span className="pitchVisionIdentity"><i/> VETO / MATCHCAST</span>
        <span className={`pitchVisionSource ${persisted ? "observed" : "demo"}`}>{sourceLabel}</span>
      </header>
      <div className="pitchVisionArena">
        {football ? (
          <svg className="pitchVisionField" viewBox="0 0 620 350" role="img" aria-label="Схема футбольного поля без положения игроков и мяча">
            <defs>
              <linearGradient id="veto-pitch-grass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#173c31"/>
                <stop offset="1" stopColor="#0b241e"/>
              </linearGradient>
              <pattern id="veto-pitch-stripes" width="110" height="350" patternUnits="userSpaceOnUse">
                <rect width="55" height="350" fill="#ffffff" fillOpacity=".025"/>
              </pattern>
              <radialGradient id="veto-pitch-halo">
                <stop offset="0" stopColor="#daebdc" stopOpacity=".10"/>
                <stop offset="1" stopColor="#daebdc" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect x="10" y="10" width="600" height="330" rx="13" fill="url(#veto-pitch-grass)"/>
            <rect x="10" y="10" width="600" height="330" rx="13" fill="url(#veto-pitch-stripes)"/>
            <rect x="27" y="27" width="566" height="296" fill="none" stroke="#d3e8dc" strokeOpacity=".67" strokeWidth="2"/>
            <line x1="310" y1="27" x2="310" y2="323" stroke="#d3e8dc" strokeOpacity=".64" strokeWidth="2"/>
            <circle cx="310" cy="175" r="56" fill="none" stroke="#d3e8dc" strokeOpacity=".64" strokeWidth="2"/>
            <circle cx="310" cy="175" r="3" fill="#d3e8dc" fillOpacity=".78"/>
            <rect x="27" y="99" width="96" height="152" fill="none" stroke="#d3e8dc" strokeOpacity=".68" strokeWidth="2"/>
            <rect x="497" y="99" width="96" height="152" fill="none" stroke="#d3e8dc" strokeOpacity=".68" strokeWidth="2"/>
            <rect x="27" y="134" width="33" height="82" fill="none" stroke="#d3e8dc" strokeOpacity=".68" strokeWidth="2"/>
            <rect x="560" y="134" width="33" height="82" fill="none" stroke="#d3e8dc" strokeOpacity=".68" strokeWidth="2"/>
            <circle cx="91" cy="175" r="3" fill="#d3e8dc" fillOpacity=".75"/>
            <circle cx="529" cy="175" r="3" fill="#d3e8dc" fillOpacity=".75"/>
            <path d="M123 135 A55 55 0 0 1 123 215M497 135 A55 55 0 0 0 497 215" fill="none" stroke="#d3e8dc" strokeOpacity=".68" strokeWidth="2"/>
            <circle cx="310" cy="175" r="145" fill="url(#veto-pitch-halo)" className="pitchVisionHalo"/>
            <rect x="13" y="159" width="14" height="32" rx="3" fill="none" stroke="#d3e8dc" strokeOpacity=".75"/>
            <rect x="593" y="159" width="14" height="32" rx="3" fill="none" stroke="#d3e8dc" strokeOpacity=".75"/>
          </svg>
        ) : (
          <div className="pitchVisionAlternate" aria-hidden="true">
            <span className="pitchVisionAlternateRing"/>
            <SportGlyph sport={event.sport} size={92}/>
          </div>
        )}
        <span className="pitchVisionSweep" aria-hidden="true"/>
        <div className="pitchVisionMatch">
          <div className="pitchVisionTeams">
            <div><small>HOME</small><strong>{event.homeName}</strong></div>
            <div className="pitchVisionScore" aria-label={`Счёт ${event.homeScore} : ${event.awayScore}`}>
              {event.homeScore}<span>:</span>{event.awayScore}
            </div>
            <div className="pitchVisionAway"><small>AWAY</small><strong>{event.awayName}</strong></div>
          </div>
          <div className="pitchVisionClock"><span>{event.status === "live" ? "В МАТЧЕ" : event.status === "finished" ? "ЗАВЕРШЁН" : "СОБЫТИЕ"}</span><strong>{event.clock || "—"}</strong></div>
        </div>
      </div>
      <footer className="pitchVisionFooter">
        <div><span>{event.competition}</span><small>{persisted ? `Последняя запись: ${sourceTime}` : "Пример для знакомства с интерфейсом"}</small></div>
        {onOpen && <button type="button" onClick={onOpen}>Разобрать матч <span aria-hidden>↗</span></button>}
      </footer>
      <p className="pitchVisionNotice">
        {football ? "Визуальная схема поля, не видеотрансляция и не трекинг мяча." : "Графический обзор, не видеотрансляция."}
        {persisted ? " Счёт и состояние — из сохранённого источника; актуальность проверяйте отдельно." : " Счёт демонстрационный."}
      </p>
    </section>
  );
}
