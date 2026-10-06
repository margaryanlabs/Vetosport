import type { LiveDelta, LiveTwinState } from "./types";

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const applyLiveDelta = (
  state: LiveTwinState,
  delta: LiveDelta,
): LiveTwinState => {
  const next: LiveTwinState = {
    ...state,
    version: state.version + 1,
    capturedAt: delta.capturedAt,
    lastDeltaAt: delta.capturedAt,
    features: { ...state.features },
    recentDeltaIds: [...state.recentDeltaIds.slice(-49), delta.id],
  };

  switch (delta.kind) {
    case "score": {
      const home = numberValue(delta.payload.home);
      const away = numberValue(delta.payload.away);
      if (home != null && away != null) {
        next.event = {
          ...state.event,
          score: { home, away },
        };
        next.features.score_home = home;
        next.features.score_away = away;
        next.features.goal_difference = home - away;
      }
      break;
    }

    case "clock": {
      const elapsedSeconds = numberValue(delta.payload.elapsedSeconds);
      const remainingSeconds = numberValue(delta.payload.remainingSeconds);

      next.event = {
        ...state.event,
        clock: {
          ...state.event.clock,
          ...(elapsedSeconds == null ? {} : { elapsedSeconds }),
          ...(remainingSeconds == null ? {} : { remainingSeconds }),
        },
      };

      if (elapsedSeconds != null) next.features.elapsed_seconds = elapsedSeconds;
      if (remainingSeconds != null) next.features.remaining_seconds = remainingSeconds;
      break;
    }

    case "period": {
      const period = typeof delta.payload.period === "string"
        ? delta.payload.period
        : undefined;

      if (period) {
        next.event = {
          ...state.event,
          clock: {
            ...state.event.clock,
            period,
          },
        };
        next.features.period = period;
      }
      break;
    }

    case "card": {
      const side = delta.payload.side === "home" || delta.payload.side === "away"
        ? delta.payload.side
        : null;
      const color = delta.payload.color === "red" || delta.payload.color === "yellow"
        ? delta.payload.color
        : null;

      if (side && color) {
        const key = `${side}_${color}_cards`;
        next.features[key] = Number(next.features[key] ?? 0) + 1;
      }
      break;
    }

    case "substitution": {
      next.features.substitutions = Number(next.features.substitutions ?? 0) + 1;
      break;
    }

    case "injury": {
      next.features.injury_events = Number(next.features.injury_events ?? 0) + 1;
      break;
    }

    case "stat":
    case "state":
    case "lineup":
    case "odds": {
      for (const [key, value] of Object.entries(delta.payload)) {
        if (
          typeof value === "number" ||
          typeof value === "string" ||
          typeof value === "boolean" ||
          value === null
        ) {
          next.features[key] = value;
        }
      }
      break;
    }
  }

  return next;
};

export const applyLiveDeltas = (
  state: LiveTwinState,
  deltas: LiveDelta[],
) =>
  deltas
    .slice()
    .sort(
      (a, b) =>
        new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
    )
    .reduce(applyLiveDelta, state);
