"use client";

import { useEffect, useState } from "react";
import type { Sport } from "@/lib/domain/types";
import { sportEngineRegistry } from "@/lib/sports/registry";
import { SportGlyph } from "@/components/SportGlyph";

type HealthPayload = {
  engines: Partial<Record<Sport, { passed: boolean }>>;
};

export function EngineUniverse({
  activeSport,
  onSelect,
}: {
  activeSport: Sport;
  onSelect: (sport: Sport) => void;
}) {
  const [health, setHealth] = useState<HealthPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/intelligence/selfcheck", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: HealthPayload | null) => {
        if (active && payload) setHealth(payload);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const activeEngines = sportEngineRegistry.filter(
    (engine) => engine.status === "active",
  );
  const futureCount = sportEngineRegistry.length - activeEngines.length;

  return (
    <section className="v2Sports" aria-label="Sports">
      <div className="v2SportsLabel">
        <span>SPORTS</span>
        <small>{futureCount} more in research</small>
      </div>

      <div className="v2SportsTabs">
        {activeEngines.map((engine) => {
          const passed = health?.engines[engine.sport]?.passed;
          return (
            <button
              className={activeSport === engine.sport ? "active" : ""}
              key={engine.sport}
              onClick={() => onSelect(engine.sport)}
              type="button"
            >
              <SportGlyph sport={engine.sport} size={20} />
              <span>{engine.label}</span>
              <i className={passed === false ? "fail" : passed ? "ok" : "checking"} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
