# VETO Sport architecture

## Product thesis

VETO Sport is not a picks feed. It is a sports decision-intelligence system that maintains a time-indexed belief about an event, evaluates a broad market surface, compares fair probability with market price, and preserves every decision so the system can measure whether its edge is real.

The core loop is:

```
INGEST
  -> NORMALIZE
  -> BUILD EVENT STATE
  -> EXTRACT FEATURES
  -> RUN SPECIALIST MODELS
  -> AGGREGATE MODEL COUNCIL
  -> BUILD PROBABILITY SURFACE
  -> COMPARE WITH MARKET
  -> APPLY QUALITY / CORRELATION / FRESHNESS GATES
  -> EDGE | WATCH | PASS
  -> WRITE IMMUTABLE LEDGER
  -> CLOSE AGAINST MARKET + OUTCOME
  -> CALIBRATE / DETECT DRIFT / RETRAIN
```

## Core bounded contexts

### 1. Data Plane

Provider-agnostic adapters ingest:
- fixtures, live score, clock and period state;
- event statistics and tracking;
- lineups, substitutions and injuries;
- market quotes and exchange data;
- news and contextual evidence;
- weather and venue state when relevant.

No UI component speaks directly to a provider SDK.

### 2. Event Graph

A canonical representation of the sporting event. Provider IDs are mapped into VETO IDs. Event-state changes are timestamped and replayable.

### 3. Feature Store

Features are versioned. A prediction must always identify the exact feature snapshot that produced it.

Examples:
- football: xG trajectory, shot quality, territory, pressure, tactical shape, cards, substitutions;
- basketball: pace, possession efficiency, usage, lineup state, foul state;
- tennis: surface-adjusted serve/return strength, fatigue, hold/break state.

### 4. Model Registry + Council

Every specialist model emits:
- probability;
- version;
- confidence;
- timestamp;
- evidence links.

The council aggregates calibrated model outputs and measures disagreement. High disagreement is a reason to PASS, not something to hide by averaging.

### 5. Probability Surface

The product evaluates many related markets for the same event:
- winner / moneyline;
- totals and team totals;
- spreads / handicaps;
- periods / halves / quarters / sets;
- player props;
- football corners, cards, shots and shots on target;
- sport-specific specials.

The surface is recalculated whenever game state or price changes materially.

### 6. Dependency Graph

Markets are not independent. A red card, injury, substitution or pace change can affect multiple markets simultaneously. The dependency graph exists to:
- explain causal propagation;
- prevent duplicated correlated exposure;
- power scenario analysis.

### 7. Scenario Engine

Counterfactual branches answer questions such as:
- what if the next goal is scored by the home team?
- what if no goal occurs for ten minutes?
- what if a high-usage player leaves the game?

The engine reports how the probability surface moves under each branch.

### 8. Market Brain

Tracks:
- opening price;
- current price;
- best available price;
- consensus;
- line velocity;
- unexplained moves;
- liquidity when available;
- closing price.

The objective is not simply to predict outcomes but to detect mispricing.

### 9. Decision Ledger

Every EDGE/WATCH/PASS state is written with:
- event + market + selection;
- timestamp;
- model versions;
- feature snapshot;
- market price;
- fair probability;
- VETO score.

The historical record must never be rewritten after the result. Closing price and outcome are appended later.

### 10. Self-correction

Evaluation is based on:
- calibration;
- Brier score;
- log loss;
- closing-line performance;
- EV/yield where legally and analytically appropriate;
- performance by sport/league/market/odds band/game state;
- drift detection.

Accuracy alone is not enough.

## Responsible product boundary

VETO Sport is an analytical system. The initial product does **not** automatically place wagers, promise returns, or hide uncertainty. It should expose model disagreement, stale data, low confidence and PASS decisions prominently.

## Internationalization

Primary locale: Russian (`ru`)
Secondary: English (`en`)
Third: Armenian (`hy`)

Canonical entity names remain provider-normalized; UI terminology and AI explanations are localized.
