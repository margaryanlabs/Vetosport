"use client";

import type { Locale, Sport } from "@/lib/domain/types";
import { SportGlyph } from "@/components/SportGlyph";
import { VetoMark, VetoWordmark } from "@/components/VetoMark";

export type WorkspaceView = "live" | "intelligence" | "research" | "system";

const modes: Array<{ id: WorkspaceView; label: string; short: string }> = [
  { id: "live", label: "Live", short: "LIVE" },
  { id: "intelligence", label: "Intelligence", short: "INTEL" },
  { id: "research", label: "Research", short: "LAB" },
  { id: "system", label: "System", short: "SYS" },
];

const sports: Array<{ id: Sport; label: string }> = [
  { id: "football", label: "Football" },
  { id: "basketball", label: "Basketball" },
  { id: "tennis", label: "Tennis" },
  { id: "hockey", label: "Hockey" },
];

const submenus: Partial<Record<WorkspaceView, Array<[string,string]>>> = {
  intelligence: [["event-overview","Match"],["event-signals","Signals"],["event-market","Markets"]],
  research: [["parallax","Parallax"],["market-surface","Probability"],["models","Models"],["validation","Validate"]],
  system: [["system-health","Health"],["system-providers","Providers"],["system-data","Data plane"]],
};

function ModeIcon({ mode }: { mode: WorkspaceView }) {
  if (mode === "live") return <svg viewBox="0 0 24 24"><path d="M3 13h4l2-5 3 10 2.5-7 1.7 2H21"/></svg>;
  if (mode === "intelligence") return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.6"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3"/></svg>;
  if (mode === "research") return <svg viewBox="0 0 24 24"><path d="M6 18 10.4 6h3.2L18 18M8 13h8"/><path d="M4 20h16"/></svg>;
  return <svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="11" cy="17" r="1.2"/></svg>;
}

export function WorkspaceChrome({
  activeView,
  onViewChange,
  activeSport,
  onSportChange,
  onJump,
  locale,
  onLocaleChange,
  homeCode,
  awayCode,
  homeScore,
  awayScore,
  clock,
  competition,
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
  const submenu = submenus[activeView] ?? [];

  return (
    <main className={`vetoShell vetoShell-${activeSport}`}>
      <aside className="vetoRail">
        <button className="vetoRailBrand" onClick={() => onViewChange("live")} type="button" aria-label="VETO Sport home">
          <VetoMark size={38} />
          <VetoWordmark className="vetoRailWordmark" />
          <span>SPORT</span>
        </button>

        <nav className="vetoRailNav" aria-label="Main navigation">
          {modes.map((mode) => (
            <div className="vetoRailGroup" key={mode.id}>
              <button
                className={activeView === mode.id ? "active" : ""}
                onClick={() => onViewChange(mode.id)}
                type="button"
              >
                <span className="vetoRailIcon"><ModeIcon mode={mode.id} /></span>
                <span className="vetoRailLabel">{mode.label}</span>
              </button>

              {activeView === mode.id && submenu.length > 0 && (
                <div className="vetoSubnav">
                  {submenu.map(([target,label]) => (
                    <button key={target} onClick={() => onJump(target)} type="button">{label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="vetoRailBottom">
          <div className="vetoRailStatus"><i /><span>{providerMode}</span></div>
          <div className="vetoRailLanguages">
            {(["ru","en","hy"] as Locale[]).map((item) => (
              <button className={locale===item?"active":""} key={item} onClick={() => onLocaleChange(item)} type="button">
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="vetoShellMain">
        <header className="vetoWorkspaceTop">
          <div className="vetoWorkspaceTitle">
            <span>{activeView === "live" ? "LIVE MARKET" : activeView.toUpperCase()}</span>
            <strong>{competition}</strong>
          </div>

          <div className="vetoEventTicker">
            <span>{homeCode}</span>
            <strong>{homeScore}<i>:</i>{awayScore}</strong>
            <span>{awayCode}</span>
            <em>{clock}</em>
          </div>

          <div className="vetoSportTabs" aria-label="Sports">
            {sports.map((sport) => (
              <button
                className={activeSport===sport.id?"active":""}
                key={sport.id}
                onClick={() => onSportChange(sport.id)}
                type="button"
                title={sport.label}
              >
                <SportGlyph sport={sport.id} size={18} />
                <span>{sport.label}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="vetoWorkspaceBackdrop" aria-hidden>
          <span className="vetoFieldMark vetoFieldMarkA" />
          <span className="vetoFieldMark vetoFieldMarkB" />
          <span className="vetoFieldSweep" />
          <span className="vetoSportWatermark"><SportGlyph sport={activeSport} size={150} /></span>
        </div>

        <div className="vetoWorkspaceCanvas">{children}</div>
      </section>

      <nav className="vetoMobileNav" aria-label="Mobile navigation">
        {modes.map((mode) => (
          <button className={activeView===mode.id?"active":""} key={mode.id} onClick={() => onViewChange(mode.id)} type="button">
            <ModeIcon mode={mode.id} />
            <span>{mode.short}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
