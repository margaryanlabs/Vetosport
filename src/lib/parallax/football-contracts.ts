import type { FootballLiveInputs, ScorelineProbability } from "@/lib/models/football/types";
import type { ParallaxMarketContract } from "@/lib/parallax/types";

export const footballParallaxContractIds = [
  "home-win",
  "draw",
  "away-win",
  "total-under-2.5",
  "total-under-3.5",
  "total-under-4.5",
  "btts-yes",
  "home-over-0.5",
  "away-over-0.5",
  "home-over-1.5",
  "away-over-1.5",
  "home-over-2.5",
  "away-over-2.5",
] as const;

export type FootballParallaxContractId =
  (typeof footballParallaxContractIds)[number];

export type FootballParallaxMarketSnapshot = Partial<
  Record<FootballParallaxContractId, number>
>;

interface ContractDefinition {
  id: FootballParallaxContractId;
  label: string;
  family: string;
  weight: number;
  predicate: (state: ScorelineProbability) => boolean;
  settled?: (input: FootballLiveInputs) => boolean;
}

const definitions: ContractDefinition[] = [
  {
    id: "home-win",
    label: "Home win",
    family: "1X2",
    weight: 1,
    predicate: (state) => state.homeGoals > state.awayGoals,
  },
  {
    id: "draw",
    label: "Draw",
    family: "1X2",
    weight: 1,
    predicate: (state) => state.homeGoals === state.awayGoals,
  },
  {
    id: "away-win",
    label: "Away win",
    family: "1X2",
    weight: 1,
    predicate: (state) => state.homeGoals < state.awayGoals,
  },
  {
    id: "total-under-2.5",
    label: "Under 2.5",
    family: "TOTAL",
    weight: 0.95,
    predicate: (state) => state.homeGoals + state.awayGoals < 2.5,
    settled: (input) => input.scoreHome + input.scoreAway > 2.5,
  },
  {
    id: "total-under-3.5",
    label: "Under 3.5",
    family: "TOTAL",
    weight: 1,
    predicate: (state) => state.homeGoals + state.awayGoals < 3.5,
    settled: (input) => input.scoreHome + input.scoreAway > 3.5,
  },
  {
    id: "total-under-4.5",
    label: "Under 4.5",
    family: "TOTAL",
    weight: 0.9,
    predicate: (state) => state.homeGoals + state.awayGoals < 4.5,
    settled: (input) => input.scoreHome + input.scoreAway > 4.5,
  },
  {
    id: "btts-yes",
    label: "BTTS Yes",
    family: "BTTS",
    weight: 0.9,
    predicate: (state) => state.homeGoals > 0 && state.awayGoals > 0,
    settled: (input) => input.scoreHome > 0 && input.scoreAway > 0,
  },
  {
    id: "home-over-0.5",
    label: "Home over 0.5",
    family: "TEAM TOTAL",
    weight: 0.85,
    predicate: (state) => state.homeGoals > 0.5,
    settled: (input) => input.scoreHome > 0.5,
  },
  {
    id: "away-over-0.5",
    label: "Away over 0.5",
    family: "TEAM TOTAL",
    weight: 0.85,
    predicate: (state) => state.awayGoals > 0.5,
    settled: (input) => input.scoreAway > 0.5,
  },
  {
    id: "home-over-1.5",
    label: "Home over 1.5",
    family: "TEAM TOTAL",
    weight: 0.9,
    predicate: (state) => state.homeGoals > 1.5,
    settled: (input) => input.scoreHome > 1.5,
  },
  {
    id: "away-over-1.5",
    label: "Away over 1.5",
    family: "TEAM TOTAL",
    weight: 0.9,
    predicate: (state) => state.awayGoals > 1.5,
    settled: (input) => input.scoreAway > 1.5,
  },
  {
    id: "home-over-2.5",
    label: "Home over 2.5",
    family: "TEAM TOTAL",
    weight: 0.8,
    predicate: (state) => state.homeGoals > 2.5,
    settled: (input) => input.scoreHome > 2.5,
  },
  {
    id: "away-over-2.5",
    label: "Away over 2.5",
    family: "TEAM TOTAL",
    weight: 0.8,
    predicate: (state) => state.awayGoals > 2.5,
    settled: (input) => input.scoreAway > 2.5,
  },
];

export const buildFootballParallaxContracts = (
  snapshot: FootballParallaxMarketSnapshot,
  input?: FootballLiveInputs,
): ParallaxMarketContract[] =>
  definitions.flatMap((definition) => {
    const marketProbability = snapshot[definition.id];
    const isSettled =
      input != null && definition.settled?.(input) === true;

    if (
      marketProbability == null ||
      !Number.isFinite(marketProbability) ||
      isSettled
    ) {
      return [];
    }

    return [
      {
        id: definition.id,
        label: definition.label,
        family: definition.family,
        marketProbability,
        weight: definition.weight,
        predicate: definition.predicate,
      },
    ];
  });
