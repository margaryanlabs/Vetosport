# VETO Sport

**Sports Decision Intelligence**

> Intelligence layer between the game and the odds.

VETO Sport is being built as a live decision-intelligence system for sports. It does not reduce a match to "who wins?". It maintains a time-indexed probability surface across many markets, compares VETO fair probability with market pricing, measures model disagreement and preserves every decision state for later calibration.

## Product rule

The system may emit only three core verdicts:

- **EDGE** — price, probability, freshness, model agreement and risk survive the active policy gates.
- **WATCH** — interesting but not validated strongly enough yet.
- **PASS** — no justified action.

PASS is a first-class output.

## Intelligence foundation

Current branch includes:

- RU primary / EN secondary / HY third localization.
- Canonical event, market, evidence, quote and prediction types.
- Broad football market surface plus basketball and tennis foundations.
- Fair probability, fair odds, no-vig and expected-value math.
- Model Council with disagreement and uncertainty.
- VETO Opportunity Score.
- Decision modes:
  - Micro Edge
  - Balanced
  - Value Hunt
  - High Conviction
  - Live Pulse
- Probability-surface ranking.
- Dependency/correlation primitive.
- Counterfactual Scenario Engine.
- Immutable Decision Ledger model.
- Brier score, log loss and calibration buckets.
- Specialist engine catalog for football, basketball, tennis, hockey, baseball, MMA and esports.
- Provider-agnostic sports / odds / realtime adapters.
- Evaluation, surface-ranking, model-catalog and health APIs.

## Terminal v0.2

The current product surface is deliberately closer to an intelligence terminal than a sportsbook:

- Live Event Rail
- Event Command center
- Match state telemetry
- Probability Surface chart
- Opportunity Stream
- VETO Decision Core
- Model Council
- Scenario Engine
- Market Pulse
- Evidence Tape
- Provider readiness panel

All current match/market values are visibly marked **SANDBOX** until real providers are connected.

## Architecture

Read:
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Specialist sport engines](docs/SPORT_ENGINES.md)

## APIs

`GET /api/health` — service state.

`GET /api/models` — specialist model catalog.

`POST /api/intelligence/evaluate` — aggregate model signals and evaluate one market quote.

`POST /api/intelligence/surface` — rank multiple opportunities under a VETO decision mode.

## Next engineering phase

The next priority is the real data spine:

```
SPORTS FEED + ODDS/EXCHANGE
        ↓
NORMALIZATION
        ↓
EVENT STATE + QUOTE HISTORY
        ↓
SPECIALIST MODELS
        ↓
MODEL COUNCIL
        ↓
PROBABILITY SURFACE
        ↓
EDGE / WATCH / PASS
        ↓
IMMUTABLE LEDGER
        ↓
OUTCOME + CALIBRATION
```

## Product boundary

VETO Sport is an analytical and research system. Probabilities must never be displayed as guarantees. The initial product does not automatically place wagers.

---

**VETO SPORT · MARGARYAN LABS**
