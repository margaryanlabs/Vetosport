import type { LiveDelta } from "./types";

const weights: Record<LiveDelta["kind"], number> = {
  score: 1,
  card: 0.9,
  injury: 0.78,
  substitution: 0.52,
  lineup: 0.74,
  stat: 0.38,
  odds: 0.44,
  state: 0.34,
  period: 0.32,
  clock: 0.18,
};

export const effectiveMateriality = (delta: LiveDelta) =>
  Math.max(0, Math.min(1, delta.materiality * weights[delta.kind]));

export const shouldReprice = (
  deltas: LiveDelta[],
  threshold = 0.22,
) =>
  deltas.some((delta) => effectiveMateriality(delta) >= threshold);

export const repricePriority = (deltas: LiveDelta[]) => {
  if (deltas.length === 0) return "none" as const;

  const max = Math.max(...deltas.map(effectiveMateriality));
  if (max >= 0.75) return "immediate" as const;
  if (max >= 0.4) return "high" as const;
  if (max >= 0.22) return "normal" as const;
  return "low" as const;
};
