import type { LiveDelta, LiveTwinExplanation } from "./types";
import { effectiveMateriality } from "./materiality";

const describe = (delta: LiveDelta) => {
  switch (delta.kind) {
    case "score":
      return "Score state changed";
    case "card":
      return "Disciplinary state changed";
    case "injury":
      return "Player availability changed";
    case "substitution":
      return "Lineup composition changed";
    case "odds":
      return "Market price moved";
    case "clock":
      return "Time remaining changed";
    case "period":
      return "Match period changed";
    case "stat":
      return "Live performance metrics changed";
    case "lineup":
      return "Lineup state changed";
    default:
      return "Event state changed";
  }
};

export const explainLiveChange = (
  deltas: LiveDelta[],
): LiveTwinExplanation => {
  const sorted = [...deltas].sort(
    (a, b) => effectiveMateriality(b) - effectiveMateriality(a),
  );
  const top = sorted[0];

  if (!top) {
    return {
      headline: "No material change",
      summary: "No new event-state delta requires repricing.",
      drivers: [],
    };
  }

  const drivers = sorted.slice(0, 4).map((delta) => ({
    label: describe(delta),
    impact: `${Math.round(effectiveMateriality(delta) * 100)} materiality`,
    confidence: Math.max(0.5, Math.min(0.99, 0.55 + delta.materiality * 0.4)),
  }));

  return {
    headline: describe(top),
    summary:
      sorted.length === 1
        ? "One material event-state change may alter the probability surface."
        : `${sorted.length} recent state changes may alter multiple related markets.`,
    drivers,
  };
};
