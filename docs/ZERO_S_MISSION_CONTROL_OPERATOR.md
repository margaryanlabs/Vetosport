# VETO SPORT — ZERO-S Mission Control / operator handbook (2026-10-11)

**Page:** /research/mission-control
**Current branch:** research/zero-s-late-tail-v02 — PR #26 remains a draft, not production.

## What is implemented
1. A single Russian-language mission dashboard, reachable from the existing VETO Sport LAB and other ZERO-S pages. TODAY / ROADMAP / ODDS / SOURCES tabs.
2. 15 source-backed tasks with scope, built/research/blocker stages, prioritization, next action and objective completion gates. Engineering stages reflect branch source only and are **not mutable by the UI**.
3. Personal task status stored in the user's browser localStorage; export JSON allows backup. It is **not** synchronized to their account, does not update GitHub, and cannot function as an immutable audit or cross-device state.
4. A server-side **zero-cost read-only status API** at GET /api/intelligence/research/mission-control. It surfaces only configuration flags from existing VETO provider factory (The Odds API key presence, tournament allowlist, persistent store and cron). No raw credentials or provider requests. A key does NOT imply fresh/accepted odds. The endpoint does NOT redistribute provider quote data.
5. Odds Desk with a fixed grid of **mathematical** break-even probabilities for hypothetical decimal quotes 1.01…1.20 (all unequivocally **not live prices**).
6. A second table computes model-free pricing floors implied by the *historical* 2012–15 football cohort with score 1:1 after logged minute 80. It displays two levels: empirical sample break-even odds and break-even odds using Wilson 95% **lower** historical success bound. This bound is not a prediction interval under 2026 regime change and cannot support a profitable trade claim.
7. A manual quote log: user enters event, sport, bookmaker, settlement market, selection and decimal price. The browser stores when the **user recorded** that price. **NOT** the bookmaker's provider timestamp, confirmation of execution or acceptance. Age thresholds only indicate age of the manual observation. Export with task states as JSON; not server-persisted.
8. Verified external source directory: The Odds API v4 + markets map, StatsBomb, Andrew Kinsman 2012–15 historical goal times, MLB Baseball Savant, Tennis Match Charting Project (commercially restricted NC dataset), FIVB rules.

## Why we don't show invented live odds
Existing VETO Sport code has The Odds API and Sportmonks integrations and quote journaling, but the dynamic mission-control view is intentionally quota-safe and does **not** call expensive endpoints on load. Live-provider keys, live competitions, terms of redistribution and accepted bookmakers/markets must be verified before exposing anything as current. The Odds API documented endpoints:
- v4 /sports/{sport}/odds for upcoming and live events. In-play does not mean the provider knows the current in-match score/time: kickoff is not a valid current-minute signal.
- v4 /sports/{sport}/events/{eventId}/odds for more specialised markets; these do not necessarily cover alternate totals/current set across sports/regions.
- No guarantee a quote is accepted, and changes/suspensions can occur during feed latency.
- Odds calls have a quota cost **per market x per region**. Never let unauthenticated public-page opens trigger third-party polling; use protected cron + stored quote snapshots only where licensing allows.

## Research pricing floor examples at 1:1, after logged minute 80 (2012–2015)

| Under | Wins/eligible games | Historic hit ratio | Minimum decimal odds, mean | Minimum decimal odds, Wilson lower historical bound |
| --- | ---: | ---: | ---: | ---: |
| 3.5 | 964/1,031 | 93.50% | 1.070 | 1.089 |
| 4.5 | 1,023/1,031 | 99.22% | 1.008 | 1.015 |
| 5.5 | 1,030/1,031 | 99.90% | 1.001 | 1.006 |

**These are not observed/quoted available bookmaker prices.** The empirical 90% condition is not a low loss-severity guarantee (maximum loss of stake) and does not account for accumulated risk across repeated wagers, bookmaker limits, market availability, commission or the changing late-stoppage rule.

## Next production upgrades (deliberately NOT marked as done)

**P0 — Data/odds truth:** Check /api/providers config, then private/legal read-only quote views backed by stored normalized market snapshots; allowlist exact markets, sportsbook timestamps, explicit suspension and quote age; prevent quota-draining public endpoints.

**P1 — Independent evidence:** Bootstrap calibrated 2024–2026 future match-based evaluation across tennis point outcomes, volleyball rally outcomes, and baseball multi-season state outcomes. Honour CC BY-NC-SA limitations of Jeff Sackmann dataset: cannot use for commercial VETO without permission.

**P1 — Human research log:** Attach authorized outcome sources and locked timestamped records to Shadow Journal and include abstention cases. No actual bets or simulated P&L claims sold to customers.

**P2 — Business:** Offer transparent research / graphic dashboard service to sports editors and B2B analytics customers without "guaranteed winning" claims.

### Quality gates
- Vercel preview Next compile, TypeScript, /research/mission-control generated, status API present.
- Confirm status API does not call live provider or publish secret values.
- Confirm every odds figure is labelled mathematical illustration or historical, NOT a current executable quote.
- Confirm personal completion states never change official engineering stages.
- Keep PR in draft until product regression and rights review.
