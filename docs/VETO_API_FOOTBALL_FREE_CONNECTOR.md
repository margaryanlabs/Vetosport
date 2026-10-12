# VETO Sport · API-Football FREE ingestion · 12 Oct 2026
Existing project only; no separate frontend or API key is exposed to visitors.

## Confirmed configuration
- Production Vercel project `vetosport` already contains server-only `API_FOOTBALL_KEY` (value intentionally not read).
- No API-Football live ingest was active on earlier production; /api/live/events returned sandbox fallback.
- Upstream: `https://v3.football.api-sports.io/fixtures?live=all` with server-side `x-apisports-key`. This response supplies match state and score, **not verified bookmaker offers**.
- GET `/api/cron/api-football-live` requires `CRON_SECRET`; disabled by default via `VETO_API_FOOTBALL_ENABLED`.
- Vercel cron `*/30 * * * *` => 48 nominal requests/day. The API-Football free plan is 100/day. This is not true second-by-second LIVE. Provider actual freshness may be unknown; capture is *time of fetch*.
- Cron normalizes up to 30 well-formed LIVE football events, appends to existing canonical store / Truth Journal, and exposes them in `/api/live/events`. It does not calculate or fabricate sportsbook prices. Key errors are redacted.
- `/api/providers` exposes **boolean** activation readiness and request forecast. Source health can be inspected in VETO Sport > System. Selfcheck `/api/intelligence/providers/api-football/selfcheck` requires no provider key and no external calls.
- Operator activation: Vercel > project `vetosport` > Environment Variables, add `VETO_API_FOOTBALL_ENABLED=true` in **production** only, redeploy; verify cron auth and provider response and active match ingestion.
- Do not turn on other direct paid providers before code security PR #31 and rights tests. This API-Football adapter is direct score/state only.
- There is no video streaming, no broadcast or player tracking in the visual PitchVision. UI explains graphics are schematic.
- The Watchlist research PR #29 remains separate, not merged: only makes research suggestions when persisted match timestamps and observed state match, and never claims book odds.
## Acceptance / QA
1. Unauthenticated GET `/api/cron/api-football-live` returns 401 and **does not call upstream**.
2. With toggle off, returns `skipped:true` and **does not call upstream**.
3. With production key, valid upstream response is normalized (not simulated), at most 30 writes.
4. No match from sandbox reclassified as persisted; no fictitious odds.
5. Verify fresh provider match activity exists at test time: if no live matches, `/api/live/events` may remain sandbox fallback. No forced fake entries.
6. Observe quota header and 429. Estimated request budget is based on 30m schedule, but another app using same token can exhaust free plan.
7. CI, Vercel READY, runtime and mobile QA are separate gates.
