# VETO Sport — Paid Provider Security / Budget Gate (12 Oct 2026)

## Finding
Production /api/providers reports direct Sportmonks and The Odds API keys missing, and live events are sandbox fallback. **Do not add keys before quota guards are deployed**. Previous code exposed four anonymous GET direct-provider endpoints, each of which could consume provider API quota when keys become available:
- /api/data/odds
- /api/data/football/latest
- /api/data/football/fixtures
- /api/data/football/inplay-odds

These are now restricted by the existing server-side `x-veto-ingestion-secret` request header, never exposed to browser users. Public UI should use persisted read-only /api/live/events and source-observatory instead. The odds read requires exact sport and market allowlists. Upstream error bodies are suppressed to avoid leaking credentials or provider account info.

## Opt-in live odds Cron
Cron is DISABLED by default. Required before it can poll any paid API:
- THE_ODDS_API_KEY, VETO_ODDS_SPORT_KEYS, VETO_ODDS_MARKETS, THE_ODDS_API_REGIONS and persistence + CRON_SECRET.
- `VETO_ODDS_CRON_ENABLED=true` (explicit operator approval).
- `VETO_ODDS_CRON_MAX_ESTIMATED_DAILY_CREDITS` as positive integer at least the **estimated** cost for */5 polling.

Estimated cost per 5-minute tick = unique_sport_keys * unique_markets * unique_regions. Estimated daily credits = per tick * 288. E.g. one sport, one market, one region ~288 credits per 24h, ~8640 per 30d — easily exhausting a free monthly tier. Two sports x three markets x one region ~1728 daily, which must be explicitly approved with budget setting (NOT recommended for initial activation).

The quota forecast isn't a transaction ledger, doesn't track credits actually used or enforce a cumulative monthly cap. Provider headers `x-requests-last`, `x-requests-remaining` must be watched. Historical odds costs may be higher. No keys/secret values may be committed or shared in tickets.

GET /api/providers exposes safe readiness booleans, polling opt-in state and estimated credit cost. It no longer claims live-ready from configured keys alone while budget gate is blocked. GET /api/intelligence/providers/odds-budget/selfcheck has nine deterministic cases and no paid calls.

## QA and Release Gates
- Verify unauthenticated direct provider GET returns 401 **even after key activation**, not a 502 from provider, and never burns credits. Authenticated routes remain operator-only.
- Verify no unexpected calls from frontend, test /api/live/events read-only public path still available.
- Verify cron skip with no opt-in, with no budget, or with over-budget config. Confirm no provider requests occur when skipped.
- Verify configured one-sport/market budget and quota headers, and stop polling if provider monthly credits low (operator task).
- GitHub Actions failure-before-steps tracked in issue #28. Vercel READY is separate from successful Actions CI.
- Do not expose/enable real-money bet execution. Any recommendation engine needs independent calibration, rights, settlement and documented source freshness.
