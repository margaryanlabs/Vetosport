# VETO Sport roadmap

## P0 — intelligence foundation (built)

- [x] Next.js / TypeScript application shell
- [x] RU / EN / HY localization foundation
- [x] canonical sport/event/market types
- [x] football/basketball/tennis market catalog
- [x] probability math and no-vig primitives
- [x] Model Council with disagreement + uncertainty
- [x] Opportunity Score and EDGE/WATCH/PASS gates
- [x] decision modes: Micro Edge / Balanced / Value / High Conviction / Live Pulse
- [x] probability-surface ranking API
- [x] dependency graph primitive
- [x] scenario tree primitive
- [x] provider contracts + registry
- [x] immutable-ledger data model
- [x] Brier / log-loss / calibration primitives
- [x] specialist model catalog by sport
- [x] intelligence evaluation API
- [x] premium live terminal UI v0.2
- [x] live event rail, Event Command, Probability Surface, Decision Core
- [x] Model Council, Scenario Engine, Market Pulse and Evidence Tape UI
- [x] explicit SANDBOX/live-provider status

## P1 — real data spine (in progress)

1. Add persistent canonical storage for events, participants, quotes, snapshots, evidence, predictions and outcomes.
2. Connect one sports-data provider and one odds/exchange provider.
3. Normalize provider IDs and market semantics into VETO canonical IDs.
4. Add scheduled pre-match ingestion.
5. Add realtime event-state transport (WebSocket/SSE).
6. Store every quote and every material state transition with captured timestamp.
7. Add provider health, latency, freshness and coverage observability.
8. Remove synthetic metrics from the live surface once provider data is verified.

## P2 — football intelligence v1 (started)

- [x] football.goal-state.v1 live remaining-goals estimator
- [x] full scoreline probability matrix
- [x] coherent 1X2 / totals / BTTS / team totals / half-line handicap surface
- [x] football surface before/after diff
- [x] Asian totals and handicaps with push / half-win / half-loss fair pricing
- [x] football mathematical self-check endpoint
- [x] Probability Surface Explorer UI
- [x] Asian Lines Board + scoreline distribution UI
- [ ] Dixon-Coles / score-distribution baseline calibration from historical data.
- Expected-goals and shot-state model.
- Live remaining-goals hazard.
- 1X2, double chance, Asian handicap, totals, team totals and BTTS.
- Corners/cards/shots modules where feed coverage permits.
- Lineup/injury deltas.
- Tactical-state updates for cards, substitutions and score effects.
- Historical similarity retrieval.
- Calibration per competition / market family.
- Event dependency graph across correlated football markets.

## P3 — basketball + tennis

Basketball:
- pace / possessions;
- offensive + defensive efficiency;
- live lineup and usage state;
- totals / spread / moneyline;
- points / rebounds / assists props.

Tennis:
- surface-adjusted serve/return strength;
- point -> game -> set hierarchy;
- fatigue and travel;
- live score state;
- match, set, total-games, handicap and ace markets.

## P4 — VETO Live Twin

- canonical event graph;
- event delta stream;
- live probability surface;
- repricing detector;
- scenario tree;
- market-lag detector;
- evidence timeline;
- human-readable "what changed?" explanations;
- low-latency alert routing without auto-bet execution.

## P5 — intelligence memory

- immutable prediction ledger;
- closing-line capture;
- outcomes;
- calibration dashboards;
- Brier/log-loss dashboards;
- champion/challenger model registry;
- model/feature drift;
- automated retraining proposals with human approval;
- performance by sport, league, market, odds band and game state.

## Release gates

No market may be presented as real live intelligence until:
- provider freshness is measured;
- IDs and market semantics are validated;
- prediction timestamps are persisted;
- stale-data behavior is tested;
- calibration is evaluated out-of-sample;
- synthetic data is removed from the live surface;
- the UI never conflates probability, VETO Score and certainty.

## Current infrastructure note

GitHub Actions is configured for install, type-check and production build. At the moment GitHub is refusing to start jobs because the linked account is locked for a billing issue, so CI cannot yet validate the branch.
