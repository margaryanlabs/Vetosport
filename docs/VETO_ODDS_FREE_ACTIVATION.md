# The Odds API FREE activation for VETO Sport — 12 October 2026

The user already created the account and added the secret `THE_ODDS_API_KEY` to Production Vercel `vetosport`. Do not ask the user to copy it into chat.

Provider: https://the-odds-api.com/liveapi/guides/v4/
Published free allowance: 500 usage credits per month. Standard sport odds endpoint cost roughly markets × regions *per request*, independently for each sport. The provider response contains x-requests-last and x-requests-remaining.

## First measured profile (very small, deliberately)
- `VETO_ODDS_SPORT_KEYS=soccer_epl`
- `VETO_ODDS_MARKETS=h2h,totals`
- `THE_ODDS_API_REGIONS=eu` (one region)
- `VETO_ODDS_CRON_ENABLED=true`
- `VETO_ODDS_CRON_MAX_ESTIMATED_DAILY_CREDITS=12`
- `VETO_ODDS_CRON_MAX_ESTIMATED_MONTHLY_CREDITS=400`
- Cron: `0 */4 * * *` (six runs/day). Cost per nonempty call approximately 2 credits; theoretical 31-day maximum 372 credits, below 400 operational cap and 500 free quota. **This is a forecast, not a transactional provider-side enforcement of monthly spending.** Avoid other consumers of this same key. The free quota may already be partially used and the monthly provider reset date need not coincide with our billing window.
- This cadence is for bookmaker market RESEARCH; not real-time live odds or wagering execution. Values may be older than when they are rendered.
- Stop calling other sports if upstream remaining credits reported ≤100. With a single configured sport, the first request in a run still consumes a small amount; VETO does not have an authoritative shared ledger for quota used elsewhere.
- Results are stored in VETO Supabase Truth Journal. Visitors see read-only persisted quotes, not direct quota-consuming endpoints. Password and API key are never exposed on the website.
- The raw bookmaker odds feed **does not include authoritative match status**; normalized standalone event status must never be inferred as LIVE purely because kickoff was in the past.
- To check prices: VETO > "Что посмотреть" > choose persisted football match > "Сохранённая букмекерская линия" OR open Match detail > recent quote tape. Exact match correspondence depends on kickoff/team matching. EPL-only quotes will not attach to unrelated leagues; the source feed may legitimately have zero bookmaker quotes. Alternate 4.5 totals are not guaranteed.

## Verification
1. /api/providers reports both key configured and scheduled polling permitted, with 31-day projected cost.
2. /api/intelligence/providers/odds-budget/selfcheck returns passed=true (now 12 tests).
3. /api/cron/live-odds without CRON_SECRET returns 401.
4. Wait for the next scheduled protected 4-hour cron run and examine quote counts. No synthetic values or live claims if none.
5. Confirm /api/live/workspace for a matching real fixture contains quotes and original provider timestamps. Do NOT issue anonymous direct /api/data/odds GET; it is protected to prevent quota abuse.
6. If quota is lower than expected, turn `VETO_ODDS_CRON_ENABLED=false`, redeploy; do not spend more without first inspecting actual provider header usage.

The user does not need to do anything else now. Dashboard for verifying remaining credits: https://the-odds-api.com/ (account email).
