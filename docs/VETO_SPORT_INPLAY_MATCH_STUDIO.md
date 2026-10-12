# VETO Sport — verified FREE in-play football odds + Match Intelligence (12 Oct 2026)

## Current implementation
All work extends **margaryanlabs/Vetosport**, not a parallel application.

1. Existing API-Football FREE live **match score** cron runs `*/30` (48 nominal requests/day).
2. Additional operator-opt-in **in-play odds** cron runs `0 */2 * * *` (12 nominal requests/day), requests exactly ONE first page of `https://v3.football.api-sports.io/odds/live`. Combined plan: 60 nominal daily provider calls, leaving margin under published 100/day free. These are observed source snapshots, **not continuous 5-second real-time quotes**. If provider usage from other consumers exceeds budget or key quota remaining <= 20, new ingestion is skipped. Retrying the cron itself still consumes a call.
3. Match identity is matched **only on `api-football` persisted state `providerEventId`**. Unknown/ambiguous event identity is skipped. The in-play response does not create any sport event or update authoritative score state.
4. The source in-play docs show `odds[].values[]` but do **not** identify a bookmaker in this payload. Persist the market/selection/handicap/price/status/time and label bookstore `API-Football · букмекер не указан`. No fabricated betting operator.
5. Suspended/blocked/stopped/finished status is conservatively treated as SUSPENDED. Unknown status is also SUSPENDED. Missing source update or updates older than 20min are rejected. No guessed odds or goal event timestamps.
6. Quotes go into VETO market_quotes and Truth Journal with source provider `api-football-live-odds`. No extra external requests from visitors.
7. Graph in Match Intelligence now plots **only real quote history** when >=2 snapshots of the same market. Otherwise a meaningful empty state is shown. Existing source-backed score graph remains.
8. Paper Research ticket saves explicitly hypothetical or stored-snapshot price and virtual stake as **UNSETTLED** in browser localStorage, not a real wager. It does not automatically settle or show fake P&L.

## Operator activation (after passing preview tests)
Set production environment variable `VETO_API_FOOTBALL_INPLAY_ENABLED=true` on the **existing** Vercel project, then redeploy. This is additional opt-in above `VETO_API_FOOTBALL_ENABLED=true`.
API key `API_FOOTBALL_KEY` already exists and MUST remain server-only. No new key needed.

## QA release gates
- Vercel Preview/Production must compile and pass TypeScript.
- `/api/intelligence/providers/api-football-inplay/selfcheck` must be **11/11 PASS** and never call provider.
- Without bearer `CRON_SECRET`, `/api/cron/api-football-inplay` must 401. Public `/api/providers` only reports booleans and projected counts (never secrets).
- Production `/api/providers` should say `apiFootballInPlay.ingestionReady=true` only when operator flag, key and storage are configured.
- After next scheduled poll verify `providerRows`, `mappedFixtures`, `quotesWritten`, `quotaRemaining`. Zero quotes may be correct (no live odds, covered match or eligible market). Never claim verified availability without a successful upstream response.
- The Odds API existing 4-hour quote cron stays unchanged and cannot inherently match every live score from API-Football.
- Existing `VETO_API_FOOTBALL_ENABLED` scores polling 48/day plus 12/day in-play = 60/day, theoretical; quotas may be shared externally or reset differently.
- **PAPER first**. Before discussing manual real-money wagers, validate independent model calibration, out-of-sample ROI with real attainable prices, slippage and exact bookmaker settlement rules, plus personal loss limits.

Docs: https://api-sports.io/documentation/football/v3 and https://www.api-football.com/pricing/
