"use client";

import type { Sport } from "@/lib/domain/types";
import { SportGlyph } from "@/components/SportGlyph";

export type WorkspaceView = "live" | "intelligence" | "research" | "system";

const primary = [
  ["live", "LIVE", "Now"],
  ["intelligence", "INTELLIGENCE", "Decision"],
  ["research", "RESEARCH", "Deep"],
  ["system", "SYSTEM", "Health"],
] as const;

const sportItems: { sport: Sport; label: string }[] = [
  { sport: "football", label: "Football" },
  { sport: "basketball", label: "Basketball" },
  { sport: "tennis", label: "Tennis" },
  { sport: "hockey", label: "Hockey" },
];

function ModeIcon({ mode }: { mode: WorkspaceView }) {
  if (mode === "live") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M3 13h4l2-5 3.2 10 2.3-7 1.7 2H21" />
      </svg>
    );
  }
  if (mode === "intelligence") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3.1" />
        <path d="M12 4v2M12 18v2M4 12h2M18 12h2" />
      </svg>
    );
  }
  if (mode === "research") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="6" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
        <circle cx="12" cy="18" r="1.8" />
        <path d="m6.5 10.8 4-3.6m3 0 4 3.6m0 2.4-4 3.6m-3 0-4-3.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" />
      <circle cx="9" cy="7" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="11" cy="17" r="1.4" />
    </svg>
  );
}

export function ArenaNavigator({
  activeView,
  onViewChange,
  activeSport,
  onSportChange,
  onJump,
}: {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  activeSport: Sport;
  onSportChange: (sport: Sport) => void;
  onJump: (target: string) => void;
}) {
  return (
    <section className="arenaDock" id="arena">
      <div className="arenaGlow" aria-hidden>
        <span className="arenaPitchLine" />
        <span className="arenaBallTrail">
          <SportGlyph sport={activeSport} size={18} />
        </span>
      </div>

      <div className="arenaPrimary">
        <div className="arenaIdentity">
          <span className="arenaLiveDot" />
          <div>
            <small>VETO ARENA</small>
            <strong>Command workspace</strong>
          </div>
        </div>

        <nav aria-label="Workspace modes">
          {primary.map(([id, label, note]) => (
            <button
              className={activeView === id ? "active" : ""}
              key={id}
              onClick={() => onViewChange(id)}
              type="button"
            >
              <span className="arenaModeIcon"><ModeIcon mode={id} /></span>
              <span className="arenaModeCopy">
                <strong>{label}</strong>
                <small>{note}</small>
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="arenaSecondary">
        {activeView === "live" && (
          <>
            <span className="arenaSecondaryLabel">SPORT</span>
            <div className="arenaSportsMenu">
              {sportItems.map(({ sport, label }) => (
                <button
                  className={activeSport === sport ? "active" : ""}
                  key={sport}
                  onClick={() => onSportChange(sport)}
                  type="button"
                >
                  <SportGlyph sport={sport} size={17} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {activeView === "intelligence" && (
          <>
            <span className="arenaSecondaryLabel">VIEW</span>
            <div className="arenaTextMenu">
              <button onClick={() => onJump("event-overview")} type="button">MATCH</button>
              <button onClick={() => onJump("event-signals")} type="button">SIGNALS</button>
              <button onClick={() => onJump("event-market")} type="button">MARKETS</button>
            </div>
          </>
        )}

        {activeView === "research" && (
          <>
            <span className="arenaSecondaryLabel">LAB</span>
            <div className="arenaTextMenu">
              <button onClick={() => onJump("parallax")} type="button">PARALLAX</button>
              <button onClick={() => onJump("market-surface")} type="button">PROBABILITY</button>
              <button onClick={() => onJump("models")} type="button">MODELS</button>
              <button onClick={() => onJump("validation")} type="button">VALIDATION</button>
            </div>
          </>
        )}

        {activeView === "system" && (
          <>
            <span className="arenaSecondaryLabel">STATUS</span>
            <div className="arenaTextMenu">
              <button onClick={() => onJump("system-health")} type="button">HEALTH</button>
              <button onClick={() => onJump("system-providers")} type="button">PROVIDERS</button>
              <button onClick={() => onJump("system-data")} type="button">DATA PLANE</button>
            </div>
          </>
        )}

        <div className="arenaSportMoment">
          <SportGlyph sport={activeSport} size={15} />
          <span>LIVE STATE</span>
          <i />
        </div>
      </div>
    </section>
  );
}
