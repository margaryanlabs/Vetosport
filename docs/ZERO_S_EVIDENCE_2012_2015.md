# ZERO-S / Initial empirical frequency check — 11 October 2026

## Dataset and method
Read the public research files [AndrewKinsman/Football-Goal-Time-Analysis](https://github.com/AndrewKinsman/Football-Goal-Time-Analysis): \`minutes.csv\` and \`results.csv\`, documented as European football data 2012–2015. No files copied to this repo, no data license inferred.

- 7,842 fixtures, 20,785 goal-event rows.
- 7,837 fixtures pass consistency checks (recorded home/away scorers agree with final scores); exclude 5 discrepancies.
- At each cutoff minute, reconstruct running score using goals with \`minute <= cutoff\`.
- Select fixtures at **1:1** (so Under 3.5 needs two additional goals to lose).
- Record whether **2+ goals** occur *after* that logged minute and before the final whistle.
- The minute value of 90 may aggregate regular and added time. Exact 80:00 and stoppage-time clock cannot be reconstructed from the dataset.
- This is historical **outcome frequency**, not a full probabilistic live model nor betting backtest.

## Unconditional pooled historical results

| Completed match minute; score 1:1 | Eligible fixtures | Later 2+ goals | Later 2+ frequency | Win chance Under 3.5 (historical) |
| --- | ---: | ---: | ---: | ---: |
| 77 | 1,055 | 104 | 9.86% | 90.14% |
| 80 | 1,031 | 67 | **6.50%** | **93.50%** |
| 83 | 1,023 | 53 | 5.18% | 94.82% |
| 85 | 1,012 | 38 | 3.75% | 96.25% |

For the 80-minute observation, Wilson approximate 95% interval for 2+ later goals is **5.15–8.17%**. Even the historical lower bound for a loss is higher than the break-even loss threshold at odds 1.05 (**4.76%**). It must **not** be extrapolated as a 2026 predictive interval.

Hypothetical constant odds 1.05 and notional $200 would yield:
\`$200 * (1.05 * 0.93501455 - 1) = -$3.65\` *per historical opportunity*. These odds are assumed for illustration, not observed or shown as executable: therefore NOT a legitimate profit/loss backtest.

## Era instability

At the *completed* 80th minute and score 1:1, 2+ later goals:

| Season starting | Matches | 2+ late | Frequency |
| --- | ---: | ---: | ---: |
| 2012 | 365 | 30 | 8.22% |
| 2013 | 330 | 24 | 7.27% |
| 2014 | 336 | 13 | 3.87% |

The large historical movement might reflect league/sample composition, refereeing, match dynamics, missing covariates, or pure variation. It is not evidence of a 2026 exploitable pattern.

## Falsification gates

- Cannot assert any betting edge without time-synchronized, **accepted** live quotes.
- Cannot infer 2026 expected risk from 2012–15 pooled means; measure by league, era and state.
- Do not pool overlapping minute-observations as independent events or confuse a statistical interval with robustness to regime shift.
- No ROI/CLV without verified quote timestamps and market settlement rules.
- Keep the ZERO-S simulator permanently labelled research-only until independent forward calibration.

## Reproduce

\`node scripts/research/late-goals-historical.mjs path/to/minutes.csv path/to/results.csv\`

Source dataset must be downloaded legally and locally; no goal rows are checked into this code repository.
