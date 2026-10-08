"use client";

import type { Locale, Sport } from "@/lib/domain/types";
import { SportGlyph } from "@/components/SportGlyph";
import { VetoMark, VetoWordmark } from "@/components/VetoMark";

export type WorkspaceView = "live" | "intelligence" | "research" | "system";

const nav: Array<[WorkspaceView,string]> = [
  ["live","MATCHES"],
  ["intelligence","MATCH ROOM"],
  ["research","LAB"],
  ["system","SYSTEM"],
];

const sports: Sport[] = ["football","basketball","tennis","hockey"];

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
  return (
    <main className={`matchShell matchShell-${activeSport}`}>
      <header className="matchShellTop">
        <button className="matchShellBrand" onClick={() => onViewChange("intelligence")} type="button" aria-label="VETO Sport">
          <VetoMark size={31} />
          <VetoWordmark className="matchShellWordmark" />
          <span>SPORT</span>
        </button>

        <nav className="matchShellNav">
          {nav.map(([id,label]) => (
            <button className={activeView===id?"active":""} key={id} onClick={() => onViewChange(id)} type="button">
              {label}
            </button>
          ))}
        </nav>

        <div className="matchShellTools">
          <div className="matchShellSports">
            {sports.map((sport) => (
              <button className={activeSport===sport?"active":""} key={sport} onClick={() => onSportChange(sport)} type="button">
                <SportGlyph sport={sport} size={17} />
              </button>
            ))}
          </div>
          <span className="matchShellStatus"><i />{providerMode}</span>
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

      <nav className="matchShellMobile">
        {nav.map(([id,label]) => (
          <button className={activeView===id?"active":""} key={id} onClick={() => onViewChange(id)} type="button">
            <span>{label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
