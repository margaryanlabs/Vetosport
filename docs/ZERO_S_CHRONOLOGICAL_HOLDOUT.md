# ZERO-S Chronological Holdout — scientific baseline, not a betting backtest

At completed recorded minute 80 and score 1:1, the historic 2012–2015 7,837-fixture validated database yields:

| Split | Eligible matches | 2+ remaining goals | Historical frequency |
|---|---:|---:|---:|
| Training, seasons starting 2012 and 2013 | 695 | 54 | 7.77% |
| Untouched test season starting 2014 | 336 | 13 | 3.87% |

Forecasting the rare 2+ event using ONLY training sample and Jeffreys smoothing (Beta 0.5,0.5):

- Predicted rate = (54 + 0.5) / (695 + 1) = 7.83046%.
- Test actual late 2+ rate = 3.86905%.
- Test Brier score = 0.0387628.
- Test negative log-likelihood per observation (log loss) = 0.176936.

This is a deliberately simple single-probability descriptive baseline: it has zero team/league/odds customization. Out-of-time temporal drift is substantial even in this old dataset.
No bookmaker quotes were supplied; neither expected payout nor revenue can be proved from this holdout.

Reproduce with: node scripts/research/late-goals-historical.mjs minutes.csv results.csv

Further gates:
- Preserve one test row per match, not multiple correlated cutoffs counted independently.
- Evaluate 2023–2026 games with sources recording added time and live states, and independent future holdout.
- Compare to no-vig contemporaneous bookmaker prices after real timestamp and execution checks.
- Require calibrated reliability, uncertainty bounds and selection-adjusted tests before claims of edge.

Use only as RESEARCH_ONLY baseline. Do not make actual wagers on the observed metrics.