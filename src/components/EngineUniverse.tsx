"use client";

import type { Sport } from "@/lib/domain/types";
import { sportEngineRegistry } from "@/lib/sports/registry";

export function EngineUniverse({
  activeSport,
  onSelect,
}: {
  activeSport: Sport;
  onSelect: (sport: Sport) => void;
}) {
  const activeCount = sportEngineRegistry.filter(
    (engine) => engine.status === "active",
  ).length;

  return (
    <section className="engineUniverse" aria-label="VETO sport engine universe">
      <div className="engineUniverseLead">
        <span>ENGINE UNIVERSE</span>
        <strong>{activeCount} ACTIVE</strong>
        <small>{sportEngineRegistry.length - activeCount} NEXT</small>
      </div>

      <div className="engineUniverseRail">
        {sportEngineRegistry.map((engine) => {
          const enabled = engine.status === "active";

          return (
            <button
              className={[
                "engineUniverseNode",
                enabled ? "available" : "future",
                activeSport === engine.sport ? "active" : "",
              ].join(" ")}
              disabled={!enabled}
              key={engine.sport}
              onClick={() => enabled && onSelect(engine.sport)}
              type="button"
            >
              <div>
                <i />
                <span>{engine.label}</span>
                <em>{enabled ? "ACTIVE" : "NEXT"}</em>
              </div>
              <strong>{engine.engine}</strong>
              <small>{engine.descriptor}</small>
              <b>{engine.families} MARKET FAMILIES</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}
