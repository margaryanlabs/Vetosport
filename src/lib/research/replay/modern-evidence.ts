/**
 * Reproduced from StatsBomb Open Data, Bundesliga 2023/24 available season 281.
 * Repository has 34 Bayer Leverkusen matches ONLY, not the complete league.
 * All 34 event files checked against fixture final scores for 1X2 goals.
 *
 * Read-only historical research sample, not a live prediction or odds replay.
 * Source: https://github.com/hudl/open-data
 * Reproduce: node scripts/research/statsbomb-modern-replay.mjs --competition 9 --season 281
 */
export const MODERN_EVENT_OBSERVATION = {
  source: "StatsBomb Open Data",
  sourceUrl: "https://github.com/hudl/open-data",
  competition: "Bundesliga 2023/24 — Bayer Leverkusen match subset",
  total: 34,
  validFinalScores: 34,
  eligibleAtEndOfMinute80: 3,
  twoOrMoreLater: 1,
  sampleIsRepresentative: false,
  bettingOddsAvailable: false,
  verdict: "INSUFFICIENT_FOR_CALIBRATION",
  cases: [
    { id:3895074, date:"2023-09-15", match:"Bayern Munich — Bayer Leverkusen", scoreAt80:"1:1", finalScore:"2:2", futureGoals:2, whistleMinute:98, detail:"Late goals in event minutes 85 and 93." },
    { id:3895158, date:"2023-12-03", match:"Bayer Leverkusen — Borussia Dortmund", scoreAt80:"1:1", finalScore:"1:1", futureGoals:0, whistleMinute:94, detail:"No further goals after minute 80." },
    { id:3895167, date:"2023-12-10", match:"VfB Stuttgart — Bayer Leverkusen", scoreAt80:"1:1", finalScore:"1:1", futureGoals:0, whistleMinute:95, detail:"No further goals after minute 80." },
  ],
  sanityExamples: [
    {id:3895095,description:"Own Goal For and Own Goal Against are mirrored records at 17:34, not 2 separate goals."},
    {id:3895292,description:"Goal at minute 52 in period 1 means first-half added time, so raw minute sorting across periods is wrong."},
  ],
  limitations:[
    "Subset deliberately restricted by upstream data licensing; cannot estimate league-wide risk.",
    "Only three 1:1 observations at end minute 80 — no meaningful predictive interval.",
    "Event time and bookmaker-quoted time are different; no accepted market prices or limits.",
    "No direct sample of modern 2026 matches; do not extrapolate.",
  ],
} as const;
