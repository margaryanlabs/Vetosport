import { fairOdds } from "@/lib/intelligence/math";
import { chooseGoalCap, poissonVector } from "./poisson";
import { estimateRemainingGoals } from "./remaining-goals";
import type {
  FootballLiveInputs,
  FootballMarketProbability,
  FootballProbabilitySurface,
  ScorelineProbability,
} from "./types";

const market = (
  marketId: string,
  selectionId: string,
  label: string,
  probability: number,
  options?: {
    line?: number;
    side?: FootballMarketProbability["side"];
  },
): FootballMarketProbability => {
  const safeProbability = Math.min(0.999999, Math.max(0.000001, probability));
  return {
    marketId,
    selectionId,
    label,
    probability: safeProbability,
    fairOdds: fairOdds(safeProbability),
    ...options,
  };
};

const probabilityOf = (
  scorelines: ScorelineProbability[],
  predicate: (row: ScorelineProbability) => boolean,
) =>
  scorelines.reduce(
    (sum, row) => sum + (predicate(row) ? row.probability : 0),
    0,
  );

export const buildFootballProbabilitySurface = (
  input: FootballLiveInputs,
): FootballProbabilitySurface => {
  const remainingGoals = estimateRemainingGoals(input);
  const cap = chooseGoalCap(remainingGoals.home, remainingGoals.away);
  const homeVector = poissonVector(remainingGoals.home, cap);
  const awayVector = poissonVector(remainingGoals.away, cap);

  const raw: ScorelineProbability[] = [];
  for (let homeAdditional = 0; homeAdditional <= cap; homeAdditional += 1) {
    for (let awayAdditional = 0; awayAdditional <= cap; awayAdditional += 1) {
      raw.push({
        homeGoals: input.scoreHome + homeAdditional,
        awayGoals: input.scoreAway + awayAdditional,
        probability: homeVector[homeAdditional] * awayVector[awayAdditional],
      });
    }
  }

  const matrixMass = raw.reduce((sum, row) => sum + row.probability, 0);
  const scorelines = raw.map((row) => ({
    ...row,
    probability: matrixMass > 0 ? row.probability / matrixMass : row.probability,
  }));

  const markets: FootballMarketProbability[] = [];

  const homeWin = probabilityOf(scorelines, (row) => row.homeGoals > row.awayGoals);
  const draw = probabilityOf(scorelines, (row) => row.homeGoals === row.awayGoals);
  const awayWin = probabilityOf(scorelines, (row) => row.homeGoals < row.awayGoals);

  markets.push(
    market("football.1x2", "home", "Home win", homeWin, { side: "home" }),
    market("football.1x2", "draw", "Draw", draw, { side: "draw" }),
    market("football.1x2", "away", "Away win", awayWin, { side: "away" }),
  );

  const totalLines = [1.5, 2.5, 3.5, 4.5, 5.5];
  for (const line of totalLines) {
    const over = probabilityOf(
      scorelines,
      (row) => row.homeGoals + row.awayGoals > line,
    );
    markets.push(
      market(
        "football.total_goals",
        `over-${line}`,
        `Over ${line}`,
        over,
        { line, side: "over" },
      ),
      market(
        "football.total_goals",
        `under-${line}`,
        `Under ${line}`,
        1 - over,
        { line, side: "under" },
      ),
    );
  }

  const bttsYes = probabilityOf(
    scorelines,
    (row) => row.homeGoals > 0 && row.awayGoals > 0,
  );
  markets.push(
    market("football.btts", "yes", "BTTS Yes", bttsYes, { side: "yes" }),
    market("football.btts", "no", "BTTS No", 1 - bttsYes, { side: "no" }),
  );

  const teamTotalLines = [0.5, 1.5, 2.5, 3.5];
  for (const line of teamTotalLines) {
    const homeOver = probabilityOf(scorelines, (row) => row.homeGoals > line);
    const awayOver = probabilityOf(scorelines, (row) => row.awayGoals > line);

    markets.push(
      market(
        "football.team_total",
        `home-over-${line}`,
        `Home team over ${line}`,
        homeOver,
        { line, side: "over" },
      ),
      market(
        "football.team_total",
        `home-under-${line}`,
        `Home team under ${line}`,
        1 - homeOver,
        { line, side: "under" },
      ),
      market(
        "football.team_total",
        `away-over-${line}`,
        `Away team over ${line}`,
        awayOver,
        { line, side: "over" },
      ),
      market(
        "football.team_total",
        `away-under-${line}`,
        `Away team under ${line}`,
        1 - awayOver,
        { line, side: "under" },
      ),
    );
  }

  const handicapLines = [-1.5, -0.5, 0.5, 1.5];
  for (const line of handicapLines) {
    const homeCover = probabilityOf(
      scorelines,
      (row) => row.homeGoals - row.awayGoals + line > 0,
    );
    const awayCover = probabilityOf(
      scorelines,
      (row) => row.awayGoals - row.homeGoals - line > 0,
    );

    markets.push(
      market(
        "football.handicap",
        `home-${line}`,
        `Home ${line > 0 ? "+" : ""}${line}`,
        homeCover,
        { line, side: "home" },
      ),
      market(
        "football.handicap",
        `away-${-line}`,
        `Away ${-line > 0 ? "+" : ""}${-line}`,
        awayCover,
        { line: -line, side: "away" },
      ),
    );
  }

  const topScorelines = [...scorelines]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 36);

  return {
    generatedAt: new Date().toISOString(),
    inputs: input,
    remainingGoals,
    scorelines: topScorelines,
    markets,
    matrixMass,
    truncationMaxAdditionalGoals: cap,
  };
};
