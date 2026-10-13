# VETO SPORT — Autonomous Pattern Discovery (13 October 2026)

This feature extends the **existing** `margaryanlabs/Vetosport`. It does not create a new product or place bets.

## Research objective
Stop relying only on an operator-suggested rule such as *1:1 after 80 minutes*. Automatically enumerate football score states, time bands and *different settlement contracts*: totals, both-teams-to-score and double chance.

## Data and correctness boundaries
- `GET /api/intelligence/research/discovery` reads **persisted** event and snapshot rows from the current storage bridge. It NEVER polls API-Football, The Odds API, or spends provider credits.
- Up to 48 hours, divided into three 16-hour windows of up to 100 events each, and max 900 snapshots per 36 event IDs. The response flags when any event window is capped.
- Only explicit live-state snapshots with a real captured timestamp, valid score and minute enter the hypothesis pool. Each match contributes at most once per specific rule.
- A historical result is counted **only** if an explicit `finished` state has its own score, was saved after the hypothesis snapshot, and the persisted event is also marked finished.
- There may currently be **zero verifiable finished events**: the free `fixtures?live=all` API-Football feed does not retrieve completed games. The correct output is therefore `NEEDS_FINAL_RESULTS`, not made-up win rates.
- Outcomes are split 70%/30% *chronologically* within each rule. With insufficient samples, `HOLDOUT_PENDING`; Wilson lower confidence bounds are descriptive and do not correct for multiple comparisons.
- No claimed betting edge. Raw hit rate alone cannot justify bets. No tracked historical executable bookmaker price, liquidity, margin, commission or matched entry ticket exists for each condition. `validatedEdgeCount=0` until a **separate** full validation pipeline ships.
- The discovery list can include mechanically unsurprising high-hit scenarios. Do not use its ordering as a profitability ranking. A later phase must group realistic book quotes with independent out-of-sample outcomes, then adjust for multiple testing and execution costs.

## Independent research backlog
1. Odds-normalized favourite–longshot bias for 1X2 and Asian handicap, controlling for competition, liquidity, and book overround.
2. Disagreement between bookmakers (same match/contract, same time) and reversion after lineup or goal news.
3. Late state transitions across *all* scorelines and total-goal bands, compared with live market repricing.
4. Volatility after first goal, compared against no-event and randomly matched controls.
5. Tennis break-point conversion, volleyball set point, and baseball late lead scenarios **only once corresponding provider, final settlement, and historical odds datasets exist**.

Those are hypotheses and literature leads, **not discovered profitable signals**.

## Verification
- `GET /api/intelligence/research/discovery/selfcheck` has ten deterministic checks, no provider calls.
- Open `/research/discovery` on mobile, confirm source labels, empty-data states, and no fabricated percentages.
- Before considering real-money recommendations: add independent final score backfill, quote-to-contract join, chronological holdout, multiple testing correction, calibration / net returns and auditable paper trading.
