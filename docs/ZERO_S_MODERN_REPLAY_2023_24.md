# Project ZERO-S / Modern event replay audit — 11 Oct 2026

Status: independent source sanity audit. NOT a live betting forecast.

## Source and selection
Source: https://github.com/hudl/open-data (StatsBomb Open Data), Bundesliga 2023/24, competition 9 / season 281.
The public sample is **34 Bayer Leverkusen fixtures**, NOT the whole Bundesliga. This is a very biased and small subset.
Inspected match metadata and all 34 event JSONs; reconstruction of 34/34 final scores matched.
Count goals as Shot+Goal outcome and Own Goal For, excluding mirrored Own Goal Against.
Sort events by (period, event.index), not by raw minute across halves. Count minute<=80 from both first half and second half for the completed minute 80 snapshot.

## All eligible 1:1 at completed minute 80 examples
| Match | Date | 80' score | Fulltime | Goals after minute 80 | Recorded fulltime minute |
|---|---|---|---|---:|---:|
| Bayern Munich — Bayer Leverkusen | 2023-09-15 | 1:1 | 2:2 | 2 (85',93') | 98 |
| Bayer Leverkusen — Borussia Dortmund | 2023-12-03 | 1:1 | 1:1 | 0 | 94 |
| VfB Stuttgart — Bayer Leverkusen | 2023-12-10 | 1:1 | 1:1 | 0 | 95 |

Only 3 eligible matches and 1 2+ late goals outcome. Too few for any calibrated probability or betting edge.
Across 34 records median final whistle event minute 94 (range 89–98). Data minute is floored, e.g. minute 89 may be near 90:00.

## Critical correctness traps
1. Match 3895292 Union Berlin vs Bayer Leverkusen contains period 1, minute 52 goal. A raw minute sort can put a first-half event later than period 2 events.
2. Match 3895095 Mainz vs Bayer has mirrored Own Goal For and Own Goal Against at 17:34. Double counting would corrupt the score.
Tests cover both cases in src/lib/research/replay/statsbomb-selfcheck.ts.

## IFAB law context
Current IFAB Law 7 permits additional time for injuries, VAR, substitutions, goals and other delays and defines announced time as a minimum that may grow.
Source: https://www.theifab.com/laws/latest/the-duration-of-the-match/
Thus exposure time is uncertain and state/era-dependent, not simply 90 - live minute.

## Reproduce
Node 18+ and internet: node scripts/research/statsbomb-modern-replay.mjs --competition 9 --season 281
Script downloads JSON to local .cache/veto-statsbomb, not into Git; it prints transparent selection diagnostics.
Publishing StatsBomb research requires source credit and checking their official logo/media pack and other usage terms.

## Next quality gates
- Broader recent leagues and teams with licensed event data, correct added time, and match-level holdout.
- Contemporaneous odds with provenance and accepted market semantics. No true ROI or CLV otherwise.
- Out-of-sample Brier, log loss and calibration with no outcome leakage.
- No player-facing EDGE before scientific and pricing validation; no betting automation.