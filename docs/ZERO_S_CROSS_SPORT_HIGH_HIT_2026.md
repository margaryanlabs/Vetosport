# Project ZERO-S · Cross-Sport High-Hit Research / 11 October 2026

**Status:** research catalogue and a deterministic mathematics/evidence screen. **Not a list of demonstrated current opportunities, not a live feed, not a betting recommendation or an automatic trading system.**

## User's research objective
Discover candidate sports-market *contracts* where a narrowly described observable state historically settles as a win in at least 90% of games. A success rate above 90% is **not equivalent** to a low-risk investment or positive expected return. A bookmaker can reduce payouts below the break-even level and suspend a market. Mathematically 90% chance requires price strictly greater than 1/0.9 = **1.111111...** to break even in a binary market *excluding commission and quote-friction*.

One stake lost at price 1.05 consumes 20 previous winning profits. At 1.01 it consumes 100. Value of 1 win depends on quoted price, not on historical win rate alone.

## Actual historical evidence from goal-event rows (not prices)

Source: [Andrew Kinsman: Football Goal Time Analysis](https://github.com/AndrewKinsman/Football-Goal-Time-Analysis), about 2012–2015. We validated 7,837 match results; 5 inconsistent results excluded. Independently reconstructed score **1:1 after recorded minute 80** on 1,031 games. All final totals include 90th-minute logged events, which combine ordinary and added time.

| Selection at recorded 80' and 1:1 | Later goals required to lose | Wins | Losses | Observed hit rate | Binomial Wilson 95% interval of win fraction |
| --- | ---: | ---: | ---: | ---: | ---: |
| Under 3.5 | 2 | 964 | 67 | 93.50% | 91.83–94.85% |
| Under 4.5 | 3 | 1,023 | 8 | **99.22%** | 98.48–99.61% |
| Under 5.5 | 4 | 1,030 | 1 | **99.90%** | 99.45–99.98% |

**Critical:** The observed odds at the historical timestamps are missing. It is *not* known whether such high total-lines could be purchased at 1.05, 1.01, or at all. All priced EV produced by the UI is a counterfactual mathematical illustration. Do not treat old era binomial intervals as credible probabilities for 2026 football: added time, competition mix, style and market mechanics have changed.

Reproduction: \`node scripts/research/late-goals-historical.mjs minutes.csv results.csv\`, which now emits under45 and under55 counts along with the known under35 cohort. This does not bundle anyone else's dataset.

## Cross-sport candidates & evidence quality

| Sport | Market family | Current evidence | Research risk |
| --- | --- | --- | --- |
| Football | High late-match UNDER total for a carefully specified score/minute | **Historical** 2012–2015 row-level counts only; not 2026 or market-priced | Added time + multiple late goals; odds extremely small or unavailable |
| Baseball | Home moneyline with a large lead late in the game | **MLB official Baseball Savant:** one 2016–2025 historical scenario gave **97%** home win expectancy. The source's example: home ahead by 4 in seventh inning, two outs, runner on third. No row-level n for our exact verification. | Bullpen substitutions, inning/outs/base-state, contract settlement |
| Basketball | Match winner late with large point lead | **Untested hypothesis** — no measured win rate in VETO | Fouling, timeout, 3-point runs, OT, live market suspension |
| Tennis | Near-completed set winner | **Untested hypothesis** — no measured win rate | Tie-break, serve, treatment of player retirement differs per bookmaker |
| Ice hockey | Late match winner with score advantage | **Untested hypothesis** — no measured win rate | Empty net, penalties, full-time vs OT/shootouts |
| Volleyball | Near-completed set winner with big lead | **Untested hypothesis** — no measured win rate | Deuce requires win by two; no 25-point hard stop when 24–24 |

Verified source context:
- MLB official historical game state and 97% example: https://baseballsavant.mlb.com/game-strategy-explorer?type=winexp . Baseball Savant says its baseline data cover **2016–2025**, with regular-season extra-inning runner rules.
- FIVB official volleyball rules (2025–2028), win by at least two: https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN.pdf .
- Pinnacle tennis settlement/retirement terms: https://support.pinnacle.com/hc/en-us/articles/46732813299601-How-does-Pinnacle-grade-tennis-matches-in-the-event-of-retirement-or-disqualification . Betfair tennis retirement terms have other conditional restrictions: https://support.betfair.com/app/answers/detail/tennis-rules/ .
- Current empty-net late goal illustration: https://www.reuters.com/sports/nhl/blackhawks-take-down-blues-post-first-win-season--flm-2026-10-07/ .

## Acceptance gates for future real evidence

1. **Contract semantics:** exact market outcome and return/void rules, region, injury time, overtime, shootouts, match abandonment.
2. **Data integrity:** licensed timestamped event history, matched outcome IDs, no contradictory scores, genuine chronological match state.
3. **Market availability:** contemporaneous *accepted* quoted odds for that exact line and market, with suspension/price/limit history. Never assume that retrospectively favorable states were bettable.
4. **Avoid hindsight selection:** preregister eligibility by sport/competition/stage before observing the remainder; maintain all failed and PASS cases.
5. **Statistical standard:** at least 200 independently settled outcomes for the preliminary research screen, binomial Wilson 95% lower confidence bound **above 90%**, then use a later chronologically untouched forward holdout. A historical positive result alone is insufficient. Avoid leakage by match (no multiple dependent snapshots treated as independent).
6. **Odds gate:** lower historical bound must exceed break-even 1/actual executable odds **and** leave a robust margin for fee/latency/regime changes. This is necessary but not sufficient.
7. **Operational safety:** never label research as automatic EDGE, guaranteed safe, or promote to any betting/execution API. Require explicit model authorization after independent scientific review if product ever changes.

## Manual ChatGPT workflow
Select an idea at \`/research/high-hit\`; inspect provenance, change the **illustrative quote** if evaluating price sensitivity, and copy the case to ChatGPT. ChatGPT can look up public information and discuss match-specific uncertainty, but cannot see live sportsbook order acceptance without a verified source and cannot monitor autonomously without a configured recurring task.

**Product aim:** sell auditable cross-sport uncertainty & statistics dashboards to sports media and analysts, rather than promise returns from gambling.
