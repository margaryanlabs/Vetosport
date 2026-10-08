"use client";

import type { Locale, Sport } from "@/lib/domain/types";
import { SportGlyph } from "@/components/SportGlyph";
import { VetoMark, VetoWordmark } from "@/components/VetoMark";

export type WorkspaceView = "live" | "intelligence" | "research" | "system";

const nav: Array<{
  id: WorkspaceView;
  desktop: string;
  mobile: string;
  aria: string;
}> = [
  { id: "live", desktop: "MATCHES", mobile: "LIVE", aria: "Live and observed matches" },
  { id: "intelligence", desktop: "MATCH ROOM", mobile: "MATCH", aria: "Match intelligence room" },
  { id: "research", desktop: "LAB", mobile: "LAB", aria: "Research laboratory" },
  { id: "system", desktop: "SYSTEM", mobile: "SYSTEM", aria: "System status" },
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
  const providerTone =
    /READY|CONFIGURED/.test(providerMode)
      ? "ready"
      : providerMode === "CHECKING"
        ? "checking"
        : "demo";

  return (
    <main className={`matchShell matchShell-${activeSport}`}>
      <header className="matchShellTop">
        <button className="matchShellBrand" onClick={() => onViewChange("intelligence")} type="button" aria-label="VETO Sport">
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
              {item.desktop}
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
        </div>
      </header>

      <div className="matchShellBackdrop" aria-hidden>
        <span className="matchShellPitch" />
        <span className="matchShellCut" />
      </div>

      <div className="matchShellCanvas">{children}</div>

      <nav className="matchShellMobile" aria-label="Mobile navigation">
        {nav.map((item) => (
          <button
            className={activeView===item.id?"active":""}
            key={item.id}
            onClick={() => onViewChange(item.id)}
            type="button"
            aria-current={activeView===item.id ? "page" : undefined}
            aria-label={item.aria}
          >
            <span>{item.mobile}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
