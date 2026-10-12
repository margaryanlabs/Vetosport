# ZERO-S Research Watchlist (12 October 2026)

## Purpose
Owner-facing **/research/watchlist** answers “which markets should I inspect?” and “what exactly must I verify?” It is not a betting signal feed, bookmaker integration, or recommendation service.

## Data and authority
- Read-only GET /api/live/events; **only mode=persisted and source=persisted** may produce a match candidate. Sandbox fallback is always excluded.
- The first event-backed screener is football, live score **1:1** at a parseable **80–105 minute** clock. It only suggests checking whether a specific **Total Under 4.5** contract exists.
- Stored events with missing or >120-second old lastUpdatedAt timestamps are explicitly marked unverified/stale. Neither fresh timestamp nor visible event indicates a current bookmaker price.
- GET /api/intelligence/research/source-observatory is a bounded storage-only read. It returns source health aggregates even when public price display is disabled. No quote API call or odds quota spending on page visits.
- No player can place a stake from this page. No payout, auto-wager, trade/decision or public model EDGE promotion.
- Hypothesis cards are derived from existing HIGH_HIT_CATALOG. Old retrospective rates, an official baseball example, and unverified hypotheses are separated.
- Editable odds in the calculator are *manual* and only calculate 1/odds break-even. This is not market data or an independent model.
- Case copy is manual browser clipboard for ChatGPT; no OpenAI API and no unattended alerts.
- Visible candidate means “review source, clock, exact market, odds quote, suspension, market settlement, time sync and calibrated probability.” Verdict remains PASS_RESEARCH_ONLY.

## Routes and navigation
- /research/watchlist is linked as card **00** in existing terminal LAB.
- Mission Control TODAY points to the watchlist.
- Cross-Sport High-Hit Radar points to the watchlist.
- GET /api/intelligence/research/watchlist/selfcheck runs deterministic fail-closed cases without external requests.

## QA checklist before any production merge
1. Confirm browser layout on small Android mobile viewport and desktop.
2. Empty persisted storage: 0 candidates, honest fallback copy, no fabricated odds.
3. Sandbox endpoint fallback: 0 candidates.
4. Persisted 1:1 79': 0; 1:1 80' live: research only; 2:1 80': 0; stale 1:1: explicitly stale.
5. Stale/missing timestamps do not appear as current verified quotes.
6. Validate exact contract availability, data licensing, provider timestamps and suspension via privileged workflows, not frontend flags.
7. TypeScript, Next.js build, selfcheck and global existing routes must pass.
8. **GitHub Actions issue #28** blocks CI proof; Vercel preview READY alone is insufficient. Do not blindly edit workflow YAML. Inspect account-level Actions runner/billing permissions.
9. Independent recent chronological holdout, documented quote execution/settlement, source rights and proof record are required *before* any production betting claim.

## Release state
New feature branch is stacked on #27 → #26. Do **not** merge this branch directly into main before its dependencies and independent production QA pass. Keep PR in Draft. It contains no active sportsbook offers.

## 24-hour activation note — 12 October
- Production inspected: `/api/providers` returns `gateway-ready` but `liveReady=false`; Sportmonks + Odds API keys absent, odds allowlist empty. `/api/live/events` returns `sandbox-fallback`. Do not claim live betting readiness.
- Watchlist now fetches provider **readiness booleans only**, exposes source-activation guidance without secrets, and counts only persisted 1:1 minute 80+ events with timestamp age <=120s as the current observation queue. Stale and missing timestamp matches are suppressed from the actionable list.
- Main terminal source badge now shows DEMO MODE whenever the event feed is sandbox fallback, even if the ingest gateway is configured.
- Selecting a sport in the watchlist automatically selects an appropriate hypothesis rather than leaving details stuck on the previous sport.
- Fresh candidate cards may prefill Shadow Journal via `source=watchlist` URL query, but no bookmaker quote is transferred, accepted or executed; user must input/check source manually.
- GitHub issue #30 records 24-hour owner/configuration tasks. #28 remains CI startup blocker.
- Release gate unchanged: GitHub Actions start failure and private preview browser QA must be resolved before production promotion, independent positive EV not validated.
