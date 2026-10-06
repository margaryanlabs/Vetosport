# VETO Sport

**Sports Decision Intelligence**

> Intelligence layer between the game and the odds.

VETO Sport is a sports intelligence platform being built around a simple rule: **do not force a prediction when the evidence does not justify one**.

Instead of a pick feed, VETO maintains a probability surface across many markets, combines specialist models through a model council, compares fair probability with current market price, and returns one of three decisions:

- **EDGE** — evidence, price and model agreement survive validation gates.
- **WATCH** — potentially interesting, but the price/evidence is not strong enough yet.
- **PASS** — no justified action.

## What exists in the first foundation

- Next.js + TypeScript application.
- Primary Russian UI, English second, Armenian third.
- Domain model for sports events, quotes, evidence, model signals and decision ledger.
- Initial football, basketball and tennis market catalog.
- Probability / fair-odds / expected-value primitives.
- Model Council using weighted logit pooling.
- Explicit model-disagreement and uncertainty scoring.
- Opportunity Score with EDGE/WATCH/PASS gates.
- Dependency Graph and correlation-risk primitive.
- Counterfactual Scenario Tree primitive.
- Provider-agnostic sports/odds/realtime contracts.
- `POST /api/intelligence/evaluate`.
- `GET /api/health`.
- First terminal UI.

## Important: current data mode

The UI currently shows **clearly labeled SANDBOX data** to exercise the real intelligence code paths. It is not presented as a live match feed.

The next engineering phase is the real data spine: sports feed + odds/exchange feed + timestamped persistence + realtime transport.

## Architecture

See:
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)

## Development

```bash
npm install
npm run dev
```

Type-check:

```bash
npm run check
```

Build:

```bash
npm run build
```

## Product boundary

VETO Sport is designed as an analytical and research system. It must not present probabilities as guarantees, hide uncertainty, or automatically place wagers in the initial product.

---

**VETO SPORT · MARGARYAN LABS**
