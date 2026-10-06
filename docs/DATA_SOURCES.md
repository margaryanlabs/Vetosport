# VETO Sport data sources

## Initial provider strategy

The first production data spine is intentionally provider-agnostic.

### Sportmonks — football state layer

Initial role:
- football fixtures;
- canonical event discovery;
- fixture state;
- participants;
- latest-updated fixture polling;
- in-play odds where available.

Useful endpoints integrated by the current adapter:
- `GET /v3/football/fixtures/date/{date}`
- `GET /v3/football/fixtures/between/{start}/{end}`
- `GET /v3/football/fixtures/latest`
- `GET /v3/football/odds/inplay/fixtures/{fixtureId}`

The `latest` feed is particularly useful as a bridge for VETO Live Twin because it exposes recently changed fixtures without repeatedly scanning the full schedule.

### The Odds API — multi-book price layer

Initial role:
- upcoming + live bookmaker prices;
- h2h / spread / total baseline markets;
- event-specific market discovery;
- later historical price snapshots for backtesting and closing-line analysis.

The adapter tracks quota information from response headers when available.

## Upgrade path

These providers are not hard-coded into intelligence logic.

Higher-grade feeds can be introduced behind the same adapters:
- Sportradar live odds and sport-event markets;
- Sportradar live probabilities as an external benchmark, not the VETO truth model;
- Stats Perform / Opta for premium event, player and tracking data;
- exchange feeds for liquidity / traded-price intelligence.

## Provider rule

No provider owns a VETO entity.

External IDs are references. VETO keeps canonical:
- event IDs;
- participant IDs;
- market semantics;
- selection semantics;
- prediction snapshots;
- decision history.

This prevents a future provider migration from invalidating intelligence memory.

## Secrets

Provider tokens are server-side only.

Never expose:
- `SPORTMONKS_API_TOKEN`
- `THE_ODDS_API_KEY`
- database service-role credentials

through `NEXT_PUBLIC_*` variables or client components.

## Current state

Adapters are implemented, but the repository does not contain production credentials. Until keys are configured, the visible terminal remains explicitly labeled SANDBOX.
