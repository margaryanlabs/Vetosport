# ZERO-S / Source Observatory · bounded stored-quote evidence

Status: **research-only, no live betting edge or bookmaker execution**.

## What changed
- Route: `GET /api/intelligence/research/source-observatory`. It reads a bounded window of **existing** VETO persistence (up to 30 match/event records and 600 saved quote rows). It does **not** call The Odds API or any exchange/bookmaker, spend quota, submit orders, edit scores or generate synthetic prices.
- Mission Control /research/mission-control → КОЭФФИЦИЕНТЫ displays factual counts, last provider timestamp, missing source-time gaps and explicit acceptance=NO. Operator can refresh manually; does not assert background monitoring.
- Source-only timestamps ≤60s, a numeric price >1, an available saved market row and explicit `suspended=false` are required for the `RECENT_PROVIDER_TIMESTAMP` metadata category. A recent market quote **still does not imply it was independently authenticated, executable or accepted by a bookmaker**.
- `SUSPENSION_UNKNOWN`, `SUSPENDED`, `NO_PROVIDER_TIMESTAMP`, `CLOCK_INCONSISTENT`, `STALE` and `INVALID_QUOTE` are explicitly separated. Multiple revisions of the same event/provider/bookmaker/market/selection/line are deduplicated to the newest captured snapshot.
- By default, individual saved prices **are not publicly redistributed**. Public page shows only time/coverage aggregates. `VETO_SPORT_RESEARCH_QUOTES_PUBLIC=true` should be considered **only with separately verified vendor data-display rights** and prior UX/security review. Nothing in the code asserts this verification has occurred.

## Safety and evidence boundary
- VETO service credentials remain server-side and are never returned by these routes.
- This read-only endpoint can describe existing persisted snapshots; it **cannot establish sportsbook acceptance, selection limits, actual fill, legal right to display, independent historical calibration, expected profitability or 2026 hit rate**.
- Storage unavailable => `NOT_CONFIGURED` or `READ_UNAVAILABLE`, no made-up rows; downstream client must not promote quote status to betting EDGE.
- Research cards are observational metadata, not 24/7 alerts. Do not interpret snapshot recency as live betting availability.

## Verification
- `GET /api/intelligence/research/source-observatory/selfcheck`: synthetic regression checks for stale timestamps, source absence, future-clock anomalies, unknown suspension, false execution, duplicates and license display gating. Synthetic cases are self-tests, not market research outcomes.
- Vercel preview typecheck/build and manual mobile/desktop screenshots are separate acceptance gates.
- Check real stored-quote counts on deployed environment without adding paid keys or enabling public quote redistribution.
- Test a permissioned operator account; inspect existing live routes and provider quota policy before enabling any public quote view.

## Remaining blockers
1. Restore GitHub Actions runner availability (CI jobs fail without steps/logs); Vercel `READY` does not waive CI.
2. Establish the rights, source provenance, precise market contract/line and quality of snapshot timestamps from the real provider.
3. Add authenticated, append-only forward research ledger and independently settled post-event checks before commercial edge claims.
4. Only consider merging stacked PR into main after production readiness and regression QA.
