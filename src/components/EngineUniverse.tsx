"use client";

import { useEffect, useState } from "react";
import type { Sport } from "@/lib/domain/types";
import { sportEngineRegistry } from "@/lib/sports/registry";
import { SportGlyph } from "@/components/SportGlyph";

type HealthPayload = {
  passed: boolean;
  engines: Partial<
    Record<
      Sport,
      {
        model: string;
        passed: boolean;
      }
    >
  >;
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
      .catch(() => {
        // Registry status remains the safe fallback.
      });

    return () => {
      active = false;
    };
  }, []);

  const activeCount = sportEngineRegistry.filter(
    (engine) => engine.status === "active",
  ).length;
  const verifiedCount = sportEngineRegistry.filter(
    (engine) =>
      engine.status === "active" &&
      health?.engines[engine.sport]?.passed === true,
  ).length;

  return (
    <section className="engineUniverse" aria-label="VETO sport engine universe">
      <div className="engineUniverseLead">
        <span>ENGINE UNIVERSE</span>
        <strong>
          {health ? verifiedCount : activeCount} {health ? "VERIFIED" : "ACTIVE"}
        </strong>
        <small>{sportEngineRegistry.length - activeCount} NEXT</small>
      </div>

      <div className="engineUniverseRail">
        {sportEngineRegistry.map((engine) => {
          const enabled = engine.status === "active";
          const engineHealth = health?.engines[engine.sport];
          const healthState = !enabled
            ? "next"
            : engineHealth == null
              ? "checking"
              : engineHealth.passed
                ? "verified"
                : "failed";

          return (
            <button
              className={[
                "engineUniverseNode",
                enabled ? "available" : "future",
                activeSport === engine.sport ? "active" : "",
                `health-${healthState}`,
              ].join(" ")}
              disabled={!enabled}
              key={engine.sport}
              onClick={() => enabled && onSelect(engine.sport)}
              type="button"
            >
              <div>
                <span className="engineSportGlyph">
                  <SportGlyph sport={engine.sport} size={17} />
                </span>
                <i />
                <span>{engine.label}</span>
                <em>
                  {healthState === "verified"
                    ? "VERIFIED"
                    : healthState === "failed"
                      ? "FAIL"
                      : healthState === "checking"
                        ? "CHECK"
                        : "NEXT"}
                </em>
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
