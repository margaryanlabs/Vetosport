# VETO SPORT — Project ZERO-S / Late-Goal Research (v0.2)

## Status

- SHADOW / RESEARCH ONLY. No bankroll, account, auto-betting, or bookmaker execution.
- Interactive route: \`/research/late-tail\`.
- JSON evaluator: \`POST /api/intelligence/football/late-tail\`.
- Reproducible math checks: \`GET /api/intelligence/football/late-tail/selfcheck\`.
- The baseline goal rate and 3/6/10/15-minute stoppage weights are INVENTED for demonstration, not trained or validated from game histories.

## Example manual request

\`\`\`json
{
  "elapsedMinutes": 80,
  "scoreHome": 1,
  "scoreAway": 1,
  "underLine": 3.5,
  "decimalOdds": 1.05,
  "hypotheticalStake": 200,
  "baselineGoalRatePerMinute": 0.025
}
\`\`\`

The engine computes Poisson \`P(N <= floor(underLine) - scoreHome - scoreAway)\` for a weighted ensemble of goal intensities and match durations, then returns the mean, 12 individual scenarios, break-even probability, and an *illustrative* hypothetical expected return. After 90 minutes, incompatible already-finished duration scenarios are discarded and remaining weights renormalized. This is not a fully dynamic survival-time model.

The value of \`verdict\` is **always \`PASS_RESEARCH_ONLY\`**, including when illustrated expected returns appear positive. The scenario range is not a frequentist or Bayesian confidence interval.

## Chat-mode input protocol (manual, no API required)

\`Матч: [teams + league] | счёт: 1:1 | минута: 80 | Under 3.5: 1.05 | красные: 0 | добавленное время: неизвестно | источник котировки + время: [enter]\`

ChatGPT should clarify the market contract, compute exact payoff/break-even math, show sensitivity to the remaining goal rate and stoppage time, and disclose uncalibrated probabilities. It cannot independently guarantee real-time monitoring, bookmaker odds acceptance, or automatic 24/7 work from an ordinary chat.

## Validation milestones

1. Capture licensed live-score, event and bookmaker price snapshots with provider timestamps and suspension state.
2. Preserve the complete set of eligible *and rejected* opportunities; do not cherry-pick winners.
3. Condition the duration model on score, VAR, league, interruptions and current referee clock.
4. Independent forward-held-out rare-event log loss, Brier, calibration and bootstrap uncertainty by match.
5. Joint evaluation of all market prices after margin and actual quote latency / acceptance.
6. Only after those gates can deployment be reconsidered. Keep simulation isolated from the production VETO decision ledger.

This module is an educational risk-research product candidate, **not** a method to earn a salary by betting.
