"use client";

import { useState } from "react";
import type { Locale, Sport } from "@/lib/domain/types";
import { SportGlyph } from "@/components/SportGlyph";
import { VetoMark, VetoWordmark } from "@/components/VetoMark";

export type WorkspaceView =
  | "today"
  | "matches"
  | "check"
  | "history"
  | "research"
  | "system";

const nav: Array<{
  id: WorkspaceView;
  label: string;
  mobile?: string;
  aria: string;
}> = [
  { id: "today", label: "СЕГОДНЯ", mobile: "СЕГОДНЯ", aria: "Главная VETO Sport" },
  { id: "matches", label: "МАТЧИ", mobile: "МАТЧИ", aria: "Все матчи" },
  { id: "check", label: "ПРОВЕРИТЬ", mobile: "ПРОВЕРИТЬ", aria: "Проверить выбранный матч" },
  { id: "history", label: "ИСТОРИЯ", aria: "История и повтор" },
  { id: "research", label: "ЛАБОРАТОРИЯ", mobile: "ЛАБ", aria: "Исследовательская лаборатория" },
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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const providerTone =
    /READY|CONFIGURED/.test(providerMode)
      ? "ready"
      : providerMode === "CHECKING"
        ? "checking"
        : "demo";

  const mobileNav = nav.filter((item) => item.mobile);
  const secondaryNav = nav.filter((item) => !item.mobile);

  return (
    <main className={`matchShell matchShell-${activeSport}`}>
      <header className="matchShellTop">
        <button className="matchShellBrand" onClick={() => onViewChange("today")} type="button" aria-label="VETO Sport · Сегодня">
          <VetoMark size={31} />
          <VetoWordmark className="matchShellWordmark" />
          <span>SPORT</span>
        </button>

        <nav className="matchShellNav" aria-label="Primary navigation">
          {nav.map((item) => (
            <button
              className={activeView===item.id?"active":""}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              type="button"
              aria-current={activeView===item.id ? "page" : undefined}
              aria-label={item.aria}
            >
              {item.label}
            </button>
          ))}
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
          <span className={`matchShellStatus ${providerTone}`}><i />{providerMode}</span>
          <div className="matchShellLang">
            {(["ru","en","hy"] as Locale[]).map((item) => (
              <button className={locale===item?"active":""} key={item} onClick={() => onLocaleChange(item)} type="button">{item.toUpperCase()}</button>
            ))}
          </div>
          <button
            aria-expanded={mobileMoreOpen}
            aria-label="Дополнительная навигация"
            className="matchShellMore"
            onClick={() => setMobileMoreOpen((value) => !value)}
            type="button"
          >
            ЕЩЁ
          </button>
        </div>
      </header>

      {mobileMoreOpen && (
        <div className="matchShellMoreMenu" role="menu" aria-label="Дополнительная навигация">
          {secondaryNav.map((item) => (
            <button
              aria-current={activeView === item.id ? "page" : undefined}
              className={activeView === item.id ? "active" : ""}
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                setMobileMoreOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              {item.label}
            </button>
          ))}
          <button onClick={() => { onViewChange("system"); setMobileMoreOpen(false); }} role="menuitem" type="button">
            СТАТУС ДАННЫХ
          </button>
        </div>
      )}

      <div className="matchShellBackdrop" aria-hidden>
        <span className="matchShellPitch" />
        <span className="matchShellCut" />
      </div>

      <div className="matchShellCanvas">{children}</div>

      <nav className="matchShellMobile" aria-label="Mobile navigation">
        {mobileNav.map((item) => (
          <button
            className={activeView===item.id?"active":""}
            key={item.id}
            onClick={() => onViewChange(item.id)}
            type="button"
            aria-current={activeView===item.id ? "page" : undefined}
            aria-label={item.aria}
          >
            <span>{item.mobile ?? item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
