# VETO Sport / Project ZERO-S / Goal Cascade falsification / 2026-10-11

## Working question, explicitly tested against a counterexample
Does a **recent goal** before minute 80, given **1:1 at the end of recorded minute 80**, imply a larger *rare 2+ additional goal* tail from minute 81 until the final whistle?

The intuition of an automatic 'goal cascade' is **NOT supported** in this historical cohort.

Data: [Goal Time Analysis](https://github.com/AndrewKinsman/Football-Goal-Time-Analysis) (2012–2015); 7,837 consistent fixtures, 5 excluded. Reconstruct score at the end of minute 80, select those with exactly 1:1, then group according to timestamp of **last earlier goal**.

| Last goal before minute 81 | Eligible 1:1 games | Later 2+ goals | Observed rate |
| --- | ---: | ---: | ---: |
| During minutes 76–80 | 131 | 6 | 4.58% |
| In minute 75 or earlier | 900 | 61 | 6.78% |
| All eligible | 1,031 | 67 | 6.50% |

Exploratory two-sided Fisher exact p ≈ **0.448**, odds ratio ≈ **0.66**. The gap is small, uncertainty broad, and confounding unaddressed. A lack of significance is **not evidence of equivalence**.

What this rules out: saying that a last-minute goal *necessarily* makes two further late goals more likely. A recent goal might matter in another game state, league, era or depending on its game context, but this sample does not justify the blanket claim.

Important weakness: timestamps at minute 90 collapse extra-time goals, and changed time-keeping practices make these 2012–2015 measurements NOT transferable to post-2023 football. The Premier League's own published 2023–24 study reported mean full-match stoppage time rising to **11m39s**, from **8m27s** in 2022–23: https://www.premierleague.com/en/news/3978045. In 2025/26 late goals remain prevalent: https://www.premierleague.com/en/news/4580269/why-more-late-goals-are-being-scored-in-2025-26-premier-league-season .

## Next *genuinely falsifiable* experiment
Use detailed, legally accessible recent match-event data with correct timestamps, ideally StatsBomb Open Data (https://github.com/hudl/open-data) for eligible competitions, subject to its user agreement and attribution. Fit alternative dynamic hazards and stoppage-time survival models, controlling for league, score, red cards, xG, match clocks, injuries, team strength and game phases. Split samples chronologically and by match; use dedicated untouched recent out-of-sample evaluation.

Compare:
1. Time-independent Poisson goal count.
2. Score/state-dependent time-varying Poisson.
3. Hawkes-like self-exciting event-history model and a non-self-exciting control.
4. A more flexible empirical residual-duration model.

Score **Brier, log loss, calibration, and rare-event capture**; use bootstrap by match, not minute-row. Never present a causal cascade merely due to correlation; do not cherry-pick the favorable subgroups or pretend old datasets reflect current bookmaker prices.

### Execution boundaries
Experimental output remains PASS_RESEARCH_ONLY. No wagering APIs or automated bet placement. No promoted prediction without verified present-day event history, odds execution evidence, and forward validation.
