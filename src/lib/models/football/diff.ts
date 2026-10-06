import type {
  FootballMarketProbability,
  FootballProbabilitySurface,
} from "./types";

export interface FootballMarketShift {
  marketId: string;
  selectionId: string;
  label: string;
  probabilityBefore: number;
  probabilityAfter: number;
  probabilityShift: number;
  fairOddsBefore: number;
  fairOddsAfter: number;
  fairOddsShift: number;
  magnitude: number;
  direction: "up" | "down" | "flat";
}

const keyOf = (market: FootballMarketProbability) =>
  `${market.marketId}::${market.selectionId}`;

export const diffFootballSurfaces = (
  before: FootballProbabilitySurface,
  after: FootballProbabilitySurface,
): FootballMarketShift[] => {
  const beforeMap = new Map(before.markets.map((market) => [keyOf(market), market]));

  return after.markets
    .flatMap((current) => {
      const previous = beforeMap.get(keyOf(current));
      if (!previous) return [];

      const probabilityShift = current.probability - previous.probability;
      const fairOddsShift = current.fairOdds - previous.fairOdds;
      const magnitude = Math.abs(probabilityShift);

      return [{
        marketId: current.marketId,
        selectionId: current.selectionId,
        label: current.label,
        probabilityBefore: previous.probability,
        probabilityAfter: current.probability,
        probabilityShift,
        fairOddsBefore: previous.fairOdds,
        fairOddsAfter: current.fairOdds,
        fairOddsShift,
        magnitude,
        direction:
          Math.abs(probabilityShift) < 0.0005
            ? "flat" as const
            : probabilityShift > 0
              ? "up" as const
              : "down" as const,
      }];
    })
    .sort((a, b) => b.magnitude - a.magnitude);
};

export const materialFootballShifts = (
  before: FootballProbabilitySurface,
  after: FootballProbabilitySurface,
  minimumProbabilityShift = 0.01,
) =>
  diffFootballSurfaces(before, after).filter(
    (shift) => shift.magnitude >= minimumProbabilityShift,
  );
