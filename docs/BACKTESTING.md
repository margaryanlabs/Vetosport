# VETO Sport historical validation

## Principle

A VETO model is not promoted because its dashboard looks convincing.

Promotion requires evidence across:
- probability calibration;
- Brier score;
- log loss;
- closing-line performance;
- drawdown;
- ROI / yield for the decisions that would actually have been surfaced;
- stability across time, competitions, markets and odds bands.

## No-lookahead rule

Every replay row stores:
- prediction timestamp;
- event start timestamp;
- settlement timestamp;
- model version;
- decision mode;
- fair probability;
- entry price;
- optional closing price;
- outcome.

The leakage guard rejects a prematch prediction recorded after kickoff and any prediction recorded at or after settlement.

## Closing line

VETO tracks two CLV representations:

1. Odds CLV
   `entry_odds / closing_odds - 1`

2. Probability CLV
   `1 / closing_odds - 1 / entry_odds`

Positive values indicate that the entry price beat the raw closing price.

Closing probabilities from a single selection are not automatically de-vigged; use multi-selection market consensus when a no-vig benchmark is required.

## Walk-forward

One aggregate backtest is insufficient.

The walk-forward runner creates sequential:
`TRAIN WINDOW -> FUTURE TEST WINDOW -> STEP FORWARD`

The test window is never included in its preceding training window.

## Historical inputs

### Odds

The Odds API V4 historical endpoints are supported through the provider adapter.

Historical featured-market snapshots are available from 2020-06-06. Snapshot resolution is 10 minutes for earlier history and 5 minutes from September 2022 onward. Historical access requires a paid plan.

VETO's historical endpoint is deliberately cost-gated:
- default request is dry-run;
- it returns the estimated API credit cost;
- the snapshot is fetched only when `execute=true`.

### Football results

Sportmonks fixtures are imported with:
- participants;
- state;
- scores.

Range imports page through results at up to 50 fixtures per page and persist final event-state snapshots separately from predictions.

## Settlement

Settlement is deterministic and separate from prediction generation.

Supported football settlement in v1:
- 1X2;
- BTTS;
- totals;
- team totals;
- Asian handicap / quarter lines.

Possible outcomes:
- win;
- half_win;
- push;
- half_loss;
- loss;
- void.

Predictions are not edited after settlement. Outcomes are appended separately.

## Backtest Lab

The current UI Backtest Lab is explicitly labelled SYNTHETIC BACKTEST until real historical data is imported.

It displays:
- ROI;
- mean CLV;
- Brier;
- closing-market Brier;
- ECE;
- max drawdown;
- calibration buckets;
- equity curve;
- walk-forward windows;
- market-level segments.

Synthetic results are product-development fixtures only and must never be presented as proof of real profitability.
