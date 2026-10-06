# VETO Sport roadmap

## P0 — foundation (current)

- [x] Next.js / TypeScript application shell
- [x] RU / EN / HY localization foundation
- [x] canonical sport/event/market types
- [x] initial football/basketball/tennis market catalog
- [x] probability math and no-vig primitives
- [x] model council with disagreement + uncertainty
- [x] Opportunity Score and EDGE/WATCH/PASS gates
- [x] dependency graph primitive
- [x] scenario tree primitive
- [x] provider contracts + registry
- [x] immutable-ledger data model
- [x] evaluation API
- [x] first terminal UI
- [x] explicit SANDBOX/live-provider status

## P1 — real data spine

1. Add database schema for canonical events, quotes, snapshots, evidence, predictions and outcomes.
2. Connect one sports-data provider and one odds provider.
3. Normalize provider IDs and market names.
4. Add scheduled pre-match ingestion.
5. Add WebSocket/SSE realtime event state.
6. Store every quote with captured timestamp.
7. Add provider health, latency and freshness observability.
8. Remove synthetic dashboard metrics when real feeds are available.

## P2 — football intelligence

- Poisson / Dixon-Coles baseline.
- Expected-goals and shot-state model.
- Live remaining-goals model.
- 1X2, double chance, Asian handicap, totals, team totals and BTTS.
- Corners/cards/shots modules where feed coverage permits.
- Lineup/injury deltas.
- Game-state model for cards, substitutions and score effects.
- Historical similarity retrieval.
- Calibration layer per competition / market family.

## P3 — basketball + tennis

Basketball:
- pace / possessions;
- offensive + defensive efficiency;
- lineup and usage state;
- totals / spread / moneyline;
- points / rebounds / assists props.

Tennis:
- surface-adjusted Elo;
- serve / return strength;
- fatigue and travel;
- set/game state;
- match, set, total-games and ace markets.

## P4 — live twin

- canonical event graph;
- event delta stream;
- live probability surface;
- repricing detector;
- scenario tree;
- market-lag detector;
- evidence timeline;
- human-readable "what changed?" explanations.

## P5 — intelligence memory

- immutable prediction ledger;
- closing-line capture;
- outcomes;
- calibration dashboards;
- Brier/log-loss dashboards;
- model/feature drift;
- champion/challenger model registry;
- automated retraining proposals with human approval.

## Release gates

No market may be presented as live intelligence until:
- provider freshness is measured;
- IDs and market semantics are validated;
- prediction timestamps are persisted;
- stale-data behavior is tested;
- calibration is evaluated out-of-sample;
- synthetic data is removed from the live surface.
