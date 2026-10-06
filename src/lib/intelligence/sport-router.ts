import type { LiveTwinState } from "@/lib/live-twin/types";
import { footballInputsFromLiveTwin } from "@/lib/models/football/from-live-twin";
import { buildFootballProbabilitySurface } from "@/lib/models/football/surface";
import type { BasketballStateInput } from "@/lib/models/basketball/engine";
import { buildBasketballSurface, priceBasketballMarket } from "@/lib/models/basketball/engine";
import type { TennisStateInput } from "@/lib/models/tennis/engine";
import { buildTennisPointState, priceTennisMarket } from "@/lib/models/tennis/engine";
import type { HockeyStateInput } from "@/lib/models/hockey/engine";
import { buildHockeySurface, priceHockeyMarket } from "@/lib/models/hockey/engine";

export type SportRepriceRequest =
  | {
      sport: "football";
      state: LiveTwinState;
      baseline: {
        prematchExpectedHomeGoals: number;
        prematchExpectedAwayGoals: number;
      };
    }
  | {
      sport: "basketball";
      state: BasketballStateInput;
      marketOdds?: Record<string, number>;
      totalLines?: number[];
      homeHandicaps?: number[];
      awayTeamTotalLines?: number[];
    }
  | {
      sport: "tennis";
      state: TennisStateInput;
      matchMarketOdds?: number;
      holdMarketOdds?: number;
    }
  | {
      sport: "hockey";
      state: HockeyStateInput;
      marketOdds?: Record<string, number>;
      totalLines?: number[];
    };

export const repriceSport = (request: SportRepriceRequest) => {
  const generatedAt = new Date().toISOString();

  if (request.sport === "football") {
    const inputs = footballInputsFromLiveTwin(request.state, {
      prematchExpectedHomeGoals: request.baseline.prematchExpectedHomeGoals,
      prematchExpectedAwayGoals: request.baseline.prematchExpectedAwayGoals,
    });

    return {
      sport: request.sport,
      model: "football.goal-state.v1",
      version: "0.1.0",
      generatedAt,
      researchWarning:
        "Heuristic live modifiers remain research priors until calibrated out-of-sample.",
      surface: buildFootballProbabilitySurface(inputs),
    };
  }

  if (request.sport === "basketball") {
    const surface = buildBasketballSurface(request.state);
    const totalLines = request.totalLines ?? [219.5, 224.5, 229.5, 234.5];
    const homeHandicaps = request.homeHandicaps ?? [-2.5, -4.5, -6.5];
    const awayTeamTotalLines = request.awayTeamTotalLines ?? [107.5, 111.5, 115.5];

    return {
      sport: request.sport,
      model: "basketball.possession-state.v1",
      version: "0.1.0",
      generatedAt,
      researchWarning:
        "Possession variance and efficiency priors require league-specific historical calibration.",
      surface: {
        projectedFinal: surface.projectedFinal,
        remainingPossessionsPerTeam: surface.remainingPossessionsPerTeam,
        volatility: {
          totalStdDev: surface.totalStdDev,
          marginStdDev: surface.marginStdDev,
        },
        totals: totalLines.map((line) => ({
          line,
          under: priceBasketballMarket(
            surface.totalUnder(line),
            request.marketOdds?.[`total-under-${line}`],
          ),
          over: priceBasketballMarket(
            surface.totalOver(line),
            request.marketOdds?.[`total-over-${line}`],
          ),
        })),
        homeSpreads: homeHandicaps.map((handicap) => ({
          handicap,
          home: priceBasketballMarket(
            surface.homeCover(handicap),
            request.marketOdds?.[`home-spread-${handicap}`],
          ),
        })),
        awayTeamTotals: awayTeamTotalLines.map((line) => ({
          line,
          under: priceBasketballMarket(
            surface.awayTeamUnder(line),
            request.marketOdds?.[`away-team-under-${line}`],
          ),
        })),
      },
    };
  }

  if (request.sport === "tennis") {
    const state = buildTennisPointState(request.state);
    return {
      sport: request.sport,
      model: "tennis.point-state.v1",
      version: "0.1.0",
      generatedAt,
      researchWarning:
        "Match surface is a state heuristic until calibrated on point-by-point historical data.",
      surface: {
        state,
        markets: {
          playerMatchWinner: priceTennisMarket(
            state.matchWinProbability,
            request.matchMarketOdds,
          ),
          playerNextHold: priceTennisMarket(
            state.playerHoldProbability,
            request.holdMarketOdds,
          ),
          playerNextBreak: priceTennisMarket(state.playerBreakProbability),
        },
      },
    };
  }

  const surface = buildHockeySurface(request.state);
  const totalLines = request.totalLines ?? [5.5, 6.5, 7.5];

  return {
    sport: request.sport,
    model: "hockey.shift-goalie.v1",
    version: "0.1.0",
    generatedAt,
    researchWarning:
      "Hockey manpower and empty-net modifiers are research priors until calibrated on historical shift-level data.",
    surface: {
      remainingGoals: surface.remainingGoals,
      regulation: {
        home: priceHockeyMarket(
          surface.regulation.homeWin,
          request.marketOdds?.["reg-home"],
        ),
        tie: priceHockeyMarket(
          surface.regulation.tie,
          request.marketOdds?.["reg-tie"],
        ),
        away: priceHockeyMarket(
          surface.regulation.awayWin,
          request.marketOdds?.["reg-away"],
        ),
      },
      totals: totalLines.map((line) => ({
        line,
        under: priceHockeyMarket(
          surface.totalUnder(line),
          request.marketOdds?.[`total-under-${line}`],
        ),
        over: priceHockeyMarket(
          surface.totalOver(line),
          request.marketOdds?.[`total-over-${line}`],
        ),
      })),
    },
  };
};
