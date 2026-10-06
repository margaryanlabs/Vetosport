export type FreshnessBand = "fresh" | "aging" | "stale";

export interface FreshnessAssessment {
  ageSeconds: number;
  band: FreshnessBand;
  acceptable: boolean;
}

export const assessFreshness = (
  capturedAt: string,
  now = new Date(),
  limits = { freshSeconds: 15, staleSeconds: 60 },
): FreshnessAssessment => {
  const captured = new Date(capturedAt).getTime();
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - captured) / 1000));

  if (ageSeconds <= limits.freshSeconds) {
    return { ageSeconds, band: "fresh", acceptable: true };
  }
  if (ageSeconds <= limits.staleSeconds) {
    return { ageSeconds, band: "aging", acceptable: true };
  }
  return { ageSeconds, band: "stale", acceptable: false };
};

export const latencyBand = (latencyMs: number) => {
  if (latencyMs <= 250) return "excellent";
  if (latencyMs <= 800) return "good";
  if (latencyMs <= 2000) return "degraded";
  return "poor";
};
