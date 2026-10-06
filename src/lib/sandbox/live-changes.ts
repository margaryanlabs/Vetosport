import type { LiveDelta } from "@/lib/live-twin/types";

export const sandboxLiveDeltas: LiveDelta[] = [
  {
    id: "delta-18429",
    eventId: "sandbox-ars-liv",
    kind: "stat",
    capturedAt: "2026-10-06T08:04:05.000Z",
    source: "sandbox-state",
    payload: { attack_tempo: 71, attack_tempo_delta_10m: -0.19 },
    materiality: 0.74,
  },
  {
    id: "delta-18428",
    eventId: "sandbox-ars-liv",
    kind: "state",
    capturedAt: "2026-10-06T08:03:36.000Z",
    source: "sandbox-tactical",
    payload: { arsenal_block: "lower", transition_risk: "low" },
    materiality: 0.66,
  },
  {
    id: "delta-18427",
    eventId: "sandbox-ars-liv",
    kind: "odds",
    capturedAt: "2026-10-06T08:02:51.000Z",
    source: "sandbox-market",
    payload: { under_3_5: 1.43, saka_shots_over_1_5: 1.82 },
    materiality: 0.43,
  },
];

export const sandboxAffectedMarkets = [
  "football.total_goals",
  "football.team_total",
  "football.btts",
  "football.1x2",
  "football.player_shots",
];
