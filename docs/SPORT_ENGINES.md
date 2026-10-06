# VETO Sport specialist engines

The platform deliberately avoids one universal "AI sports model". Each sport gets its own specialist feature space, probability models and calibration.

## Football

Primary targets:
- 1X2 / double chance;
- Asian handicap;
- match and team totals;
- BTTS;
- corners;
- cards;
- player shots / shots on target / goals;
- time-window and next-event markets.

Core layers:
1. Dixon-Coles / score distribution baseline.
2. Expected-goals and shot-quality state.
3. Live remaining-goals hazard.
4. Tactical state and substitutions.
5. Player-level threat and involvement.
6. Separate corners/cards/shot processes.
7. Market-context model.

## Basketball

Primary targets:
- moneyline;
- spreads;
- totals and team totals;
- quarter/half;
- points, rebounds, assists and combo props.

Core layers:
1. Possession projection.
2. Pace and efficiency.
3. Live lineup state.
4. Usage redistribution.
5. Foul/timeout/clock state.
6. Player minutes distribution.

## Tennis

Primary targets:
- match and set winner;
- games handicap;
- total games;
- aces and selected player props.

Core layers:
1. Surface-adjusted serve strength.
2. Surface-adjusted return strength.
3. Point -> game -> set simulation.
4. Fatigue/travel context.
5. Live score-state updating.

## Hockey

Core:
- shot quality / xG;
- goalie adjustment;
- special teams;
- schedule/rest;
- live game state.

## Baseball

Core:
- starter and bullpen quality;
- batter/pitcher splits;
- park/weather;
- base-out run expectancy;
- bullpen fatigue.

## MMA / combat

Core:
- Bayesian fighter strength;
- style interaction;
- age / reach / weight;
- striking/grappling rates;
- camp/layoff context.

## Esports

Core:
- map pool;
- draft;
- roster state;
- patch/version context;
- map/side bias;
- opponent-specific form.

## Meta layer

Specialist models never directly decide what the user sees.

Their calibrated outputs flow through:
1. model registry;
2. Model Council;
3. disagreement measurement;
4. probability surface;
5. market comparison;
6. quality/freshness/liquidity/correlation gates;
7. decision policy.

That final layer can emit EDGE, WATCH or PASS.

A high raw probability does not automatically become an EDGE.
