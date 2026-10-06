import type {
  FootballLiveInputs,
  RemainingGoalsEstimate,
} from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const safe = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

export const estimateRemainingGoals = (
  input: FootballLiveInputs,
): RemainingGoalsEstimate => {
  const minute = clamp(safe(input.elapsedMinutes, 0), 0, 95);
  const fractionElapsed = clamp(minute / 90, 0, 1);
  const fractionRemaining = 1 - fractionElapsed;

  const preHome = clamp(safe(input.prematchExpectedHomeGoals, 1.35), 0.1, 4.5);
  const preAway = clamp(safe(input.prematchExpectedAwayGoals, 1.15), 0.1, 4.5);

  const baselineHome = preHome * fractionRemaining;
  const baselineAway = preAway * fractionRemaining;

  // Live xG is translated into an observed attacking rate and then heavily
  // shrunk toward the pre-match baseline. Early in the match the live signal
  // receives little weight; later it becomes more informative.
  const liveWeight = clamp((minute - 12) / 55, 0, 0.58);

  const liveSignalHome =
    input.liveXgHome != null && minute >= 8
      ? clamp((input.liveXgHome / minute) * 90 * fractionRemaining, 0.02, 4)
      : undefined;
  const liveSignalAway =
    input.liveXgAway != null && minute >= 8
      ? clamp((input.liveXgAway / minute) * 90 * fractionRemaining, 0.02, 4)
      : undefined;

  let home =
    liveSignalHome == null
      ? baselineHome
      : baselineHome * (1 - liveWeight) + liveSignalHome * liveWeight;
  let away =
    liveSignalAway == null
      ? baselineAway
      : baselineAway * (1 - liveWeight) + liveSignalAway * liveWeight;

  const tempo = clamp(input.tempoIndex ?? 1, 0.55, 1.45);
  home *= tempo;
  away *= tempo;

  // Score-state behaviour is deliberately modest in v1. The trailing side
  // attacks more, while the leading side becomes slightly more conservative.
  const goalDifference = input.scoreHome - input.scoreAway;
  const lateIntensity = clamp((minute - 50) / 35, 0, 1);
  const homeScoreState =
    goalDifference < 0
      ? 1 + 0.14 * lateIntensity
      : goalDifference > 0
        ? 1 - 0.08 * lateIntensity
        : 1;
  const awayScoreState =
    goalDifference > 0
      ? 1 + 0.14 * lateIntensity
      : goalDifference < 0
        ? 1 - 0.08 * lateIntensity
        : 1;

  home *= homeScoreState;
  away *= awayScoreState;

  const homeRedCards = Math.max(0, Math.floor(input.homeRedCards ?? 0));
  const awayRedCards = Math.max(0, Math.floor(input.awayRedCards ?? 0));

  // Heuristic priors only. These multipliers must later be competition- and
  // minute-calibrated from historical data.
  const homeRedCardAttack = Math.pow(0.72, homeRedCards);
  const awayRedCardAttack = Math.pow(0.72, awayRedCards);
  const homeOpponentRedCardBoost = Math.pow(1.18, awayRedCards);
  const awayOpponentRedCardBoost = Math.pow(1.18, homeRedCards);

  home *= homeRedCardAttack * homeOpponentRedCardBoost;
  away *= awayRedCardAttack * awayOpponentRedCardBoost;

  home = clamp(home, 0.005, 4.5);
  away = clamp(away, 0.005, 4.5);

  return {
    home,
    away,
    total: home + away,
    baselineHome,
    baselineAway,
    liveSignalHome,
    liveSignalAway,
    modifiers: {
      tempo,
      homeScoreState,
      awayScoreState,
      homeRedCardAttack,
      awayRedCardAttack,
      homeOpponentRedCardBoost,
      awayOpponentRedCardBoost,
    },
  };
};
