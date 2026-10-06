import type { SportEvent } from "@/lib/domain/types";

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|cf|sc|afc|club|football|basketball)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (value: string) =>
  new Set(normalizeName(value).split(/\s+/).filter(Boolean));

const jaccard = (a: string, b: string) => {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
};

const participantPairScore = (
  candidate: SportEvent,
  incoming: SportEvent,
  swapped = false,
) => {
  const incomingHome = swapped ? incoming.away?.name : incoming.home?.name;
  const incomingAway = swapped ? incoming.home?.name : incoming.away?.name;

  if (!candidate.home?.name || !candidate.away?.name || !incomingHome || !incomingAway) {
    return 0;
  }

  return (
    jaccard(candidate.home.name, incomingHome) * 0.5 +
    jaccard(candidate.away.name, incomingAway) * 0.5
  );
};

export interface EventMatchAssessment {
  score: number;
  timeScore: number;
  participantScore: number;
  swapped: boolean;
  accepted: boolean;
}

export const assessEventMatch = (
  candidate: SportEvent,
  incoming: SportEvent,
  toleranceMinutes = 20,
): EventMatchAssessment => {
  if (candidate.sport !== incoming.sport) {
    return {
      score: 0,
      timeScore: 0,
      participantScore: 0,
      swapped: false,
      accepted: false,
    };
  }

  const timeDeltaMinutes =
    Math.abs(
      new Date(candidate.startsAt).getTime() - new Date(incoming.startsAt).getTime(),
    ) / 60000;
  const timeScore = Math.max(0, 1 - timeDeltaMinutes / toleranceMinutes);

  const direct = participantPairScore(candidate, incoming, false);
  const reversed = participantPairScore(candidate, incoming, true);
  const swapped = reversed > direct;
  const participantScore = Math.max(direct, reversed);

  // Participants matter more than kickoff-time because feeds may drift slightly.
  const score = participantScore * 0.78 + timeScore * 0.22;

  return {
    score,
    timeScore,
    participantScore,
    swapped,
    accepted: score >= 0.72 && participantScore >= 0.65,
  };
};

export const chooseBestEventMatch = <T extends { event: SportEvent }>(
  candidates: T[],
  incoming: SportEvent,
) => {
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      assessment: assessEventMatch(candidate.event, incoming),
    }))
    .sort((a, b) => b.assessment.score - a.assessment.score);

  const best = ranked[0];
  return best?.assessment.accepted ? best : null;
};
