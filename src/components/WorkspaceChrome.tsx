"use client";

import type { Locale, Sport } from "@/lib/domain/types";
import { SportGlyph } from "@/components/SportGlyph";
import { useEffect, useState } from "react";
import { VetoMark, VetoWordmark } from "@/components/VetoMark";
import { SportAppearanceToggle } from "@/components/SportAppearanceToggle";

export type WorkspaceView =
  | "today"
  | "matches"
  | "check"
  | "history"
  | "research"
  | "system";

const nav: Array<{
  id: WorkspaceView;
  desktop: string;
  mobile: string;
  aria: string;
}> = [
  { id: "today", desktop: "СЕГОДНЯ", mobile: "СЕГОДНЯ", aria: "Сегодня" },
  { id: "matches", desktop: "МАТЧИ", mobile: "МАТЧИ", aria: "Матчи" },
  { id: "check", desktop: "РАЗБОР МАТЧА", mobile: "РАЗБОР", aria: "Разбор матча и данные VETO" },
  { id: "history", desktop: "ИСТОРИЯ", mobile: "ИСТОРИЯ", aria: "История" },
  { id: "research", desktop: "ЛАБОРАТОРИЯ", mobile: "ЛАБ", aria: "Лаборатория" },
];

const sports: Sport[] = ["football","basketball","tennis","hockey"];
const sportLabels: Record<Sport, string> = {
  football: "Football",
  basketball: "Basketball",
  tennis: "Tennis",
  hockey: "Hockey",
  baseball: "Baseball",
  mma: "MMA",
  esports: "Esports",
};

export function WorkspaceChrome({
  activeView,
  onViewChange,
  activeSport,
  onSportChange,
  locale,
  onLocaleChange,
  providerMode,
  children,
}: {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  activeSport: Sport;
  onSportChange: (sport: Sport) => void;
  onJump: (target: string) => void;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  homeCode: string;
  awayCode: string;
  homeScore: string | number;
  awayScore: string | number;
  clock: string;
  competition: string;
  providerMode: string;
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const providerTone =
    providerMode === "LIVE DATA"
      ? "ready"
      : providerMode === "CHECKING DATA"
        ? "checking"
        : "unavailable";

  useEffect(() => {
    setMoreOpen(false);
  }, [activeView]);

  const selectView = (view: WorkspaceView) => {
    setMoreOpen(false);
    onViewChange(view);
  };

  return (
    <main className={`matchShell matchShell-${activeSport}`}>
      <header className="matchShellTop">
        <button className="matchShellBrand" onClick={() => selectView("today")} type="button" aria-label="VETO Sport">
          <VetoMark size={31} />
          <VetoWordmark className="matchShellWordmark" />
          <span>SPORT</span>
        </button>

        <nav className="matchShellNav" aria-label="Primary navigation">
          {nav.map((item) => (
            <button
              className={activeView===item.id?"active":""}
              key={item.id}
              onClick={() => selectView(item.id)}
              type="button"
              aria-current={activeView===item.id ? "page" : undefined}
              aria-label={item.aria}
            >
              {item.desktop}
            </button>
          ))}
          <a className="matchShellWatchLink" href="/research/discovery">DISCOVERY ↗</a>
        </nav>

        <div className="matchShellTools">
          <div className="matchShellSports">
            {sports.map((sport) => (
              <button
                className={activeSport===sport?"active":""}
                key={sport}
                onClick={() => onSportChange(sport)}
                type="button"
                aria-label={sportLabels[sport]}
                title={sportLabels[sport]}
              >
                <SportGlyph sport={sport} size={17} />
              </button>
            ))}
          </div>
          <SportAppearanceToggle />
          <span className={`matchShellStatus ${providerTone}`}><i />{providerMode}</span>
          <div className="matchShellLang">
            {(["ru","en","hy"] as Locale[]).map((item) => (
              <button className={locale===item?"active":""} key={item} onClick={() => onLocaleChange(item)} type="button">{item.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="matchShellBackdrop" aria-hidden>
        <span className="matchShellPitch" />
        <span className="matchShellCut" />
      </div>

      <div className="matchShellCanvas">{children}</div>

      <nav className="matchShellMobile" aria-label="Mobile navigation">
        {nav.slice(0, 3).map((item) => (
          <button
            className={activeView===item.id?"active":""}
            key={item.id}
            onClick={() => selectView(item.id)}
            type="button"
            aria-current={activeView===item.id ? "page" : undefined}
            aria-label={item.aria}
          >
            <span>{item.mobile}</span>
          </button>
        ))}
        <a className="matchShellMobileWatch" href="/research/watchlist" aria-label="Радар матчей и исследовательских рынков">РАДАР</a>
        <button
          aria-expanded={moreOpen}
          className={moreOpen || ["history", "research", "system"].includes(activeView) ? "active" : ""}
          onClick={() => setMoreOpen((open) => !open)}
          type="button"
        >
          <span>ЕЩЁ</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="matchShellMore" role="dialog" aria-label="Дополнительная навигация">
          <div className="matchShellMoreHead">
            <span>VETO SPORT</span>
            <button aria-label="Закрыть" onClick={() => setMoreOpen(false)} type="button">×</button>
          </div>
          <div className="matchShellMoreNav">
            {["history", "research", "system"].map((id) => {
              const item = nav.find((navItem) => navItem.id === id);
              const label = id === "system" ? "СОСТОЯНИЕ ДАННЫХ" : item?.desktop;
              return (
                <button
                  className={activeView === id ? "active" : ""}
                  key={id}
                  onClick={() => selectView(id as WorkspaceView)}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
            <a href="/research/discovery" onClick={()=>setMoreOpen(false)}>AUTONOMOUS DISCOVERY ↗</a>
            <a href="/research/watchlist" onClick={()=>setMoreOpen(false)}>РАДАР РЕАЛЬНЫХ МАТЧЕЙ ↗</a>
            <a href="/plans" onClick={()=>setMoreOpen(false)}>ПЛАНЫ ДОСТУПА ↗</a>
          </div>
          <div className="matchShellMoreMeta">
            <span className={`matchShellStatus ${providerTone}`}><i />{providerMode}</span>
            <div className="matchShellLang">
              {(["ru","en","hy"] as Locale[]).map((item) => (
                <button className={locale===item?"active":""} key={item} onClick={() => onLocaleChange(item)} type="button">{item.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
