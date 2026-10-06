import type { Opportunity, RiskBand, Sport } from "@/lib/domain/types";
import type {
  EvidenceView,
  MarketMove,
  ModelView,
  ProbabilityPoint,
} from "@/lib/sandbox/live";
import { sandboxOpportunities } from "@/lib/sandbox/sample";
import { buildBasketballSurface } from "@/lib/models/basketball/engine";
import { buildTennisPointState } from "@/lib/models/tennis/engine";
import { buildHockeySurface } from "@/lib/models/hockey/engine";
import {
  evidence as footballEvidence,
  marketMoves as footballMoves,
  modelViews as footballModels,
  probabilityHistory as footballProbability,
} from "@/lib/sandbox/live";

export interface WorkspaceStateMetric {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}

export interface WorkspaceChange {
  label: string;
  note: string;
  delta: number;
  direction: "up" | "down" | "flat";
}

export interface WorkspaceScenario {
  label: string;
  probability: number;
  outcomes: Array<{ label: string; value: number }>;
}

export interface SpecialistMetric {
  label: string;
  value: string;
  note: string;
  strength: number;
}

export interface SpecialistMarket {
  label: string;
  probability: number;
  fairOdds: number;
  marketOdds: number;
  decision: "EDGE" | "WATCH" | "PASS";
}

export interface LiveWorkspace {
  id: string;
  sport: Sport;
  sportLabel: string;
  competition: string;
  clock: string;
  period: string;
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
  pulse: "hot" | "stable" | "quiet";
  markets: number;
  repriced: number;
  stateId: string;
  feedLatency: string;
  modelLatency: string;
  opportunities: Opportunity[];
  stateMetrics: WorkspaceStateMetric[];
  changes: WorkspaceChange[];
  affectedMarkets: string[];
  probabilityHistory: ProbabilityPoint[];
  probabilityLabel: string;
  modelVersion: string;
  models: ModelView[];
  scenarios: WorkspaceScenario[];
  marketMoves: MarketMove[];
  evidence: EvidenceView[];
  reasonHeadline: string;
  reasonSummary: string;
  invalidation: string;
  specialistTitle: string;
  specialistSubtitle: string;
  specialistMetrics: SpecialistMetric[];
  specialistMarkets: SpecialistMarket[];
}

const opportunity = (input: {
  eventId: string;
  marketId: string;
  selectionId: string;
  label: string;
  probability: number;
  odds: number;
  score: number;
  agreement: number;
  decision: "EDGE" | "WATCH" | "PASS";
  risk?: RiskBand;
  rationale: string[];
}): Opportunity => {
  const implied = 1 / input.odds;
  const probabilityEdge = input.probability - implied;
  const expectedValue = input.probability * input.odds - 1;
  const guardedDecision =
    probabilityEdge <= 0 || expectedValue <= 0
      ? "PASS"
      : input.decision;

  return {
    eventId: input.eventId,
    marketId: input.marketId,
    selection: { id: input.selectionId, label: input.label },
    decision: guardedDecision,
    marketOdds: input.odds,
    marketImpliedProbability: implied,
    fairProbability: input.probability,
    fairOdds: 1 / input.probability,
    expectedValue,
    probabilityEdge,
    opportunityScore: input.score,
    risk: input.risk ?? "MEDIUM",
    dataConfidence: "HIGH",
    modelAgreement: input.agreement,
    freshnessSeconds: 8,
    rationale: input.rationale,
  };
};

const basketballModel = buildBasketballSurface({
  homeScore: 78,
  awayScore: 73,
  elapsedSeconds: 31 * 60 + 39,
  projectedPossessionsPerTeam: 98,
  homePointsPerPossession: 1.12,
  awayPointsPerPossession: 1.04,
});

const tennisModel = buildTennisPointState({
  playerServePointWin: 0.65,
  opponentServePointWin: 0.63,
  playerSets: 0,
  opponentSets: 0,
  playerGames: 4,
  opponentGames: 3,
  playerServing: true,
  serverPoints: 0,
  returnerPoints: 0,
});

const hockeyModel = buildHockeySurface({
  homeScore: 2,
  awayScore: 2,
  elapsedSeconds: 47 * 60 + 24,
  prematchExpectedHomeGoals: 3.25,
  prematchExpectedAwayGoals: 2.85,
  tempoIndex: 0.94,
  homeAttackIndex: 1.08,
  awayAttackIndex: 0.94,
});

const hockeyNextGoalHome =
  hockeyModel.remainingGoals.total > 0
    ? hockeyModel.remainingGoals.home / hockeyModel.remainingGoals.total
    : 0.5;

const hockeyOpportunities: Opportunity[] = [
  opportunity({
    eventId: "sandbox-edm-vgk",
    marketId: "hockey.total_goals",
    selectionId: "under-6.5",
    label: "Тотал меньше 6.5",
    probability: hockeyModel.totalUnder(6.5),
    odds: 1.28,
    score: 86,
    agreement: 89,
    decision: "EDGE",
    risk: "MEDIUM",
    rationale: [
      "Remaining goal hazard is below the opening game-state baseline.",
      "Current five-on-five pace is compressed.",
      "Market total has not fully absorbed the lower remaining-goal distribution.",
    ],
  }),
  opportunity({
    eventId: "sandbox-edm-vgk",
    marketId: "hockey.team_total",
    selectionId: "vgk-under-3.5",
    label: "Vegas · тотал меньше 3.5",
    probability: hockeyModel.awayTeamUnder(3.5),
    odds: 1.22,
    score: 79,
    agreement: 85,
    decision: "EDGE",
    rationale: [
      "Vegas attack-state index is below baseline.",
      "Current even-strength pressure favors Edmonton.",
      "Away scoring tail is narrow without a manpower advantage.",
    ],
  }),
  opportunity({
    eventId: "sandbox-edm-vgk",
    marketId: "hockey.regulation",
    selectionId: "edm-reg",
    label: "Edmonton победит в основное",
    probability: hockeyModel.regulation.homeWin,
    odds: 2.62,
    score: 68,
    agreement: 76,
    decision: "WATCH",
    rationale: [
      "Home goal hazard is stronger than away hazard.",
      "Regulation tie mass remains significant.",
      "Price edge is sensitive to the next penalty state.",
    ],
  }),
  opportunity({
    eventId: "sandbox-edm-vgk",
    marketId: "hockey.next_goal",
    selectionId: "edm-next",
    label: "Следующий гол · Edmonton",
    probability: hockeyNextGoalHome,
    odds: 1.93,
    score: 72,
    agreement: 78,
    decision: "WATCH",
    rationale: [
      "Edmonton owns the stronger current attack index.",
      "Shot pressure is skewed toward the home side.",
      "Next-goal pricing is highly sensitive to special teams.",
    ],
  }),
];

const basketballOpportunities: Opportunity[] = [
  opportunity({
    eventId: "sandbox-bos-nyk",
    marketId: "basketball.total_points",
    selectionId: "under-229.5",
    label: "Тотал меньше 229.5",
    probability: basketballModel.totalUnder(229.5),
    odds: 1.72,
    score: 82,
    agreement: 88,
    decision: "EDGE",
    risk: "MEDIUM",
    rationale: [
      "Possession pace slowed for six consecutive trips.",
      "Half-court share is above the game baseline.",
      "Market total has not fully repriced the lower possession projection.",
    ],
  }),
  opportunity({
    eventId: "sandbox-bos-nyk",
    marketId: "basketball.spread",
    selectionId: "bos-minus-4.5",
    label: "Boston −4.5",
    probability: basketballModel.homeCover(-4.5),
    odds: 1.91,
    score: 74,
    agreement: 81,
    decision: "WATCH",
    rationale: [
      "Boston shot-quality advantage remains positive.",
      "New York turnover rate is elevated under pressure.",
      "Spread market is efficient enough to reduce conviction.",
    ],
  }),
  opportunity({
    eventId: "sandbox-bos-nyk",
    marketId: "basketball.team_total",
    selectionId: "nyk-under-111.5",
    label: "NYK · тотал меньше 111.5",
    probability: basketballModel.awayTeamUnder(111.5),
    odds: 1.79,
    score: 79,
    agreement: 85,
    decision: "EDGE",
    rationale: [
      "New York rim attempts are down in the current rotation.",
      "Boston defensive matchup quality improved after substitution.",
      "Possession forecast is below market baseline.",
    ],
  }),
  opportunity({
    eventId: "sandbox-bos-nyk",
    marketId: "basketball.player_points",
    selectionId: "tatum-over-28.5",
    label: "Tatum · больше 28.5 очков",
    probability: 0.557,
    odds: 1.92,
    score: 64,
    agreement: 72,
    decision: "WATCH",
    rationale: [
      "Usage remains high.",
      "Minutes projection is stable.",
      "Current price leaves only a thin model edge.",
    ],
  }),
];

const tennisOpportunities: Opportunity[] = [
  opportunity({
    eventId: "sandbox-sin-alc",
    marketId: "tennis.match_winner",
    selectionId: "sinner",
    label: "Sinner победит",
    probability: tennisModel.matchWinProbability,
    odds: 1.78,
    score: 84,
    agreement: 90,
    decision: "EDGE",
    risk: "MEDIUM",
    rationale: [
      "Sinner return-point pressure is above pre-match expectation.",
      "First-serve quality remains stable under score pressure.",
      "Market is slower than VETO after the latest break-point sequence.",
    ],
  }),
  opportunity({
    eventId: "sandbox-sin-alc",
    marketId: "tennis.total_games",
    selectionId: "over-22.5",
    label: "Геймы больше 22.5",
    probability: 0.587,
    odds: 1.88,
    score: 76,
    agreement: 82,
    decision: "WATCH",
    rationale: [
      "Hold probabilities remain high on both sides.",
      "Second-set state supports a longer match tree.",
      "Break volatility prevents a full EDGE classification.",
    ],
  }),
  opportunity({
    eventId: "sandbox-sin-alc",
    marketId: "tennis.next_game",
    selectionId: "sinner-hold",
    label: "Sinner удержит следующую подачу",
    probability: tennisModel.playerHoldProbability,
    odds: 1.34,
    score: 71,
    agreement: 87,
    decision: "WATCH",
    rationale: [
      "Serve-point dominance is stable.",
      "Alcaraz return depth has declined over the last three games.",
      "Low payout compresses the available edge.",
    ],
  }),
  opportunity({
    eventId: "sandbox-sin-alc",
    marketId: "tennis.set_winner",
    selectionId: "alcaraz-set2",
    label: "Alcaraz выиграет 2-й сет",
    probability: 0.438,
    odds: 2.12,
    score: 45,
    agreement: 61,
    decision: "PASS",
    risk: "HIGH",
    rationale: [
      "Model dispersion is too wide.",
      "Serve-state sensitivity is high.",
      "No stable price advantage after uncertainty penalty.",
    ],
  }),
];

export const liveWorkspaces: LiveWorkspace[] = [
  {
    id: "ars-liv",
    sport: "football",
    sportLabel: "FOOTBALL",
    competition: "Premier League · Sandbox",
    clock: "64:18",
    period: "SECOND HALF",
    homeCode: "ARS",
    awayCode: "LIV",
    homeName: "Arsenal",
    awayName: "Liverpool",
    homeScore: "1",
    awayScore: "1",
    pulse: "hot",
    markets: 183,
    repriced: 29,
    stateId: "#18429",
    feedLatency: "0.8s",
    modelLatency: "312ms",
    opportunities: sandboxOpportunities,
    stateMetrics: [
      { label: "REGIME", value: "CONTROLLED", note: "low transition" },
      { label: "TEMPO", value: "71/100", note: "−19% / 10m" },
      { label: "UNCERTAINTY", value: "21/100", note: "LOW" },
      { label: "MARKET GAP", value: "+8.5 п.п.", note: "UNDER 3.5", accent: true },
    ],
    changes: [
      { label: "Under 3.5", note: "Tempo decay repriced the goal tail", delta: 0.042, direction: "up" },
      { label: "Liverpool team total U1.5", note: "Threat volume declined", delta: 0.031, direction: "up" },
      { label: "BTTS Yes", note: "Late goal intensity softened", delta: -0.027, direction: "down" },
      { label: "Arsenal next goal", note: "Territorial control improved", delta: 0.018, direction: "up" },
    ],
    affectedMarkets: ["total goals", "team totals", "BTTS", "next goal"],
    probabilityHistory: footballProbability,
    probabilityLabel: "Under 3.5",
    modelVersion: "football.goal-state.v1",
    models: footballModels,
    scenarios: [
      { label: "Без гола 10 минут", probability: 0.43, outcomes: [{ label: "U3.5", value: 0.86 }, { label: "ARS W", value: 0.31 }, { label: "NEXT G", value: 0.48 }] },
      { label: "ARS забивает", probability: 0.24, outcomes: [{ label: "U3.5", value: 0.53 }, { label: "ARS W", value: 0.76 }, { label: "NEXT G", value: 0.42 }] },
      { label: "LIV забивает", probability: 0.19, outcomes: [{ label: "U3.5", value: 0.49 }, { label: "ARS W", value: 0.12 }, { label: "NEXT G", value: 0.39 }] },
      { label: "Красная карточка", probability: 0.04, outcomes: [{ label: "U3.5", value: 0.67 }, { label: "ARS W", value: 0.44 }, { label: "NEXT G", value: 0.61 }] },
    ],
    marketMoves: footballMoves,
    evidence: footballEvidence,
    reasonHeadline: "Цена рынка отстаёт от текущего состояния матча.",
    reasonSummary: "VETO видит более медленный темп, меньший хвост сценариев с 4+ голами и устойчивое согласие моделей.",
    invalidation: "Следующий гол, красная карточка или смена tempo-regime запускают полный reprice.",
    specialistTitle: "FOOTBALL STATE ENGINE",
    specialistSubtitle: "Goals · scorelines · Asian lines",
    specialistMetrics: [
      { label: "Remaining λ", value: "1.07", note: "goals", strength: 54 },
      { label: "Home xG", value: "1.18", note: "+0.12", strength: 62 },
      { label: "Away xG", value: "0.94", note: "−0.09", strength: 48 },
      { label: "Tempo", value: "71", note: "−19%", strength: 71 },
    ],
    specialistMarkets: [],
  },
  {
    id: "bos-nyk",
    sport: "basketball",
    sportLabel: "BASKETBALL",
    competition: "NBA · Sandbox",
    clock: "Q3 04:21",
    period: "3RD QUARTER",
    homeCode: "BOS",
    awayCode: "NYK",
    homeName: "Boston Celtics",
    awayName: "New York Knicks",
    homeScore: "78",
    awayScore: "73",
    pulse: "stable",
    markets: 126,
    repriced: 18,
    stateId: "#77104",
    feedLatency: "1.1s",
    modelLatency: "248ms",
    opportunities: basketballOpportunities,
    stateMetrics: [
      { label: "PACE", value: "95.8", note: "−6.1 vs open" },
      { label: "SHOT QUALITY", value: "BOS +7", note: "rolling 8m" },
      { label: "UNCERTAINTY", value: "28/100", note: "MED-LOW" },
      { label: "MARKET GAP", value: "+10.1 п.п.", note: "U229.5", accent: true },
    ],
    changes: [
      { label: "Total U229.5", note: "Possession projection fell", delta: 0.048, direction: "up" },
      { label: "NYK team total U111.5", note: "Rim attempts collapsed", delta: 0.034, direction: "up" },
      { label: "BOS −4.5", note: "Shot-quality edge widened", delta: 0.019, direction: "up" },
      { label: "Tatum O28.5", note: "Usage stable, price caught up", delta: -0.011, direction: "down" },
    ],
    affectedMarkets: ["game total", "spread", "team total", "player points"],
    probabilityHistory: [
      { label: "Q2 08", market: 0.54, veto: 0.56 },
      { label: "Q2 03", market: 0.55, veto: 0.58 },
      { label: "HT", market: 0.56, veto: 0.61 },
      { label: "Q3 09", market: 0.57, veto: 0.63 },
      { label: "Q3 06", market: 0.58, veto: 0.65 },
      { label: "Q3 04", market: 0.581, veto: 0.682 },
    ],
    probabilityLabel: "Under 229.5",
    modelVersion: "basketball.possession-state.v1",
    models: [
      { id: "pace", label: "Possession State", probability: 0.69, confidence: 0.9, latency: "15ms", status: "aligned" },
      { id: "shot", label: "Shot Quality", probability: 0.67, confidence: 0.86, latency: "27ms", status: "aligned" },
      { id: "rotation", label: "Rotation", probability: 0.71, confidence: 0.8, latency: "34ms", status: "aligned" },
      { id: "market", label: "Market Context", probability: 0.63, confidence: 0.76, latency: "12ms", status: "aligned" },
      { id: "sim", label: "Possession Sim", probability: 0.70, confidence: 0.84, latency: "49ms", status: "aligned" },
    ],
    scenarios: [
      { label: "Темп остаётся низким", probability: 0.47, outcomes: [{ label: "U229.5", value: 0.76 }, { label: "BOS −4.5", value: 0.61 }, { label: "NYK U111.5", value: 0.72 }] },
      { label: "NYK ускоряет pace", probability: 0.22, outcomes: [{ label: "U229.5", value: 0.51 }, { label: "BOS −4.5", value: 0.56 }, { label: "NYK U111.5", value: 0.53 }] },
      { label: "Boston bench run", probability: 0.18, outcomes: [{ label: "U229.5", value: 0.66 }, { label: "BOS −4.5", value: 0.74 }, { label: "NYK U111.5", value: 0.69 }] },
      { label: "Foul-rate spike", probability: 0.08, outcomes: [{ label: "U229.5", value: 0.43 }, { label: "BOS −4.5", value: 0.58 }, { label: "NYK U111.5", value: 0.47 }] },
    ],
    marketMoves: [
      { time: "Q3 04:18", label: "Under 229.5", from: 1.78, to: 1.72, reason: "Pace compression", explained: true },
      { time: "Q3 03:56", label: "BOS −4.5", from: 1.96, to: 1.91, reason: "Shot-quality delta", explained: true },
      { time: "Q3 03:41", label: "NYK U111.5", from: 1.84, to: 1.79, reason: "Rim volume down", explained: true },
      { time: "Q3 03:18", label: "Tatum O28.5", from: 1.98, to: 1.92, reason: "Usage move exceeds state delta", explained: false },
    ],
    evidence: [
      { time: "Q3 04:08", kind: "STATE", title: "Possession pace fell below 96", impact: "U229.5 +4.8 п.п.", reliability: 0.93 },
      { time: "Q3 03:49", kind: "ROTATION", title: "Boston defensive unit improved matchup profile", impact: "NYK TT −3.4 п.п.", reliability: 0.86 },
      { time: "Q3 03:31", kind: "SHOT", title: "NYK rim-attempt share declined", impact: "NYK xPts ↓", reliability: 0.84 },
      { time: "Q3 03:09", kind: "MARKET", title: "Total price trails possession-state model", impact: "EDGE +10.1 п.п.", reliability: 0.91 },
    ],
    reasonHeadline: "Possession state repriced faster than the total market.",
    reasonSummary: "VETO sees fewer projected possessions, weaker New York rim volume and a stable Boston defensive matchup.",
    invalidation: "Fast-break burst, foul-rate spike or rotation shock triggers immediate possession reprice.",
    specialistTitle: "BASKETBALL POSSESSION ENGINE",
    specialistSubtitle: "Pace · shot quality · rotations · foul state",
    specialistMetrics: [
      { label: "Projected pace", value: "95.8", note: "−6.1", strength: 58 },
      { label: "BOS eFG+", value: "57.4%", note: "+4.8 pp", strength: 74 },
      { label: "NYK rim share", value: "27%", note: "−9 pp", strength: 38 },
      { label: "Foul pressure", value: "42", note: "stable", strength: 42 },
    ],
    specialistMarkets: [
      { label: "Under 229.5", probability: basketballOpportunities[0].fairProbability, fairOdds: basketballOpportunities[0].fairOdds, marketOdds: 1.72, decision: basketballOpportunities[0].decision },
      { label: "NYK U111.5", probability: basketballOpportunities[2].fairProbability, fairOdds: basketballOpportunities[2].fairOdds, marketOdds: 1.79, decision: basketballOpportunities[2].decision },
      { label: "Boston −4.5", probability: basketballOpportunities[1].fairProbability, fairOdds: basketballOpportunities[1].fairOdds, marketOdds: 1.91, decision: basketballOpportunities[1].decision },
      { label: "Tatum O28.5", probability: basketballOpportunities[3].fairProbability, fairOdds: basketballOpportunities[3].fairOdds, marketOdds: 1.92, decision: basketballOpportunities[3].decision },
    ],
  },
  {
    id: "sin-alc",
    sport: "tennis",
    sportLabel: "TENNIS",
    competition: "ATP · Sandbox",
    clock: "SET 2 · 4:3",
    period: "SECOND SET",
    homeCode: "SIN",
    awayCode: "ALC",
    homeName: "Jannik Sinner",
    awayName: "Carlos Alcaraz",
    homeScore: "4",
    awayScore: "3",
    pulse: "quiet",
    markets: 48,
    repriced: 7,
    stateId: "#31488",
    feedLatency: "0.7s",
    modelLatency: "184ms",
    opportunities: tennisOpportunities,
    stateMetrics: [
      { label: "SERVE STATE", value: "SIN +9", note: "pts won" },
      { label: "RETURN PRESSURE", value: "61", note: "+12 / 4 games" },
      { label: "UNCERTAINTY", value: "24/100", note: "LOW" },
      { label: "MARKET GAP", value: "+5.0 п.п.", note: "SIN ML", accent: true },
    ],
    changes: [
      { label: "Sinner ML", note: "Return pressure improved", delta: 0.036, direction: "up" },
      { label: "Over 22.5 games", note: "Hold tree widened", delta: 0.018, direction: "up" },
      { label: "Sinner next hold", note: "Serve stability remains high", delta: 0.012, direction: "up" },
      { label: "Alcaraz set 2", note: "Break sensitivity increased", delta: -0.024, direction: "down" },
    ],
    affectedMarkets: ["match winner", "set winner", "total games", "next game"],
    probabilityHistory: [
      { label: "S1 5:4", market: 0.55, veto: 0.56 },
      { label: "S2 0:0", market: 0.56, veto: 0.57 },
      { label: "2:1", market: 0.56, veto: 0.58 },
      { label: "3:2", market: 0.57, veto: 0.59 },
      { label: "4:3", market: 0.562, veto: 0.612 },
    ],
    probabilityLabel: "Sinner ML",
    modelVersion: "tennis.point-state.v1",
    models: [
      { id: "serve", label: "Serve State", probability: 0.63, confidence: 0.91, latency: "9ms", status: "aligned" },
      { id: "return", label: "Return Pressure", probability: 0.62, confidence: 0.87, latency: "17ms", status: "aligned" },
      { id: "tree", label: "Point Tree", probability: 0.60, confidence: 0.84, latency: "31ms", status: "aligned" },
      { id: "market", label: "Market Context", probability: 0.58, confidence: 0.78, latency: "10ms", status: "aligned" },
      { id: "fatigue", label: "Fatigue State", probability: 0.64, confidence: 0.73, latency: "24ms", status: "aligned" },
    ],
    scenarios: [
      { label: "Sinner hold", probability: 0.74, outcomes: [{ label: "SIN ML", value: 0.66 }, { label: "O22.5", value: 0.59 }, { label: "SET2 ALC", value: 0.38 }] },
      { label: "Alcaraz breaks", probability: 0.18, outcomes: [{ label: "SIN ML", value: 0.47 }, { label: "O22.5", value: 0.71 }, { label: "SET2 ALC", value: 0.69 }] },
      { label: "Long deuce game", probability: 0.09, outcomes: [{ label: "SIN ML", value: 0.60 }, { label: "O22.5", value: 0.65 }, { label: "SET2 ALC", value: 0.46 }] },
      { label: "Physical dip", probability: 0.05, outcomes: [{ label: "SIN ML", value: 0.43 }, { label: "O22.5", value: 0.62 }, { label: "SET2 ALC", value: 0.57 }] },
    ],
    marketMoves: [
      { time: "4:3 15-0", label: "Sinner ML", from: 1.84, to: 1.78, reason: "Return pressure", explained: true },
      { time: "4:3 0-0", label: "Over 22.5", from: 1.92, to: 1.88, reason: "Hold tree widened", explained: true },
      { time: "4:2 40-30", label: "Sinner next hold", from: 1.38, to: 1.34, reason: "Serve stability", explained: true },
      { time: "4:2 30-30", label: "Alcaraz set 2", from: 2.18, to: 2.12, reason: "Market move exceeds point-state delta", explained: false },
    ],
    evidence: [
      { time: "4:3 15-0", kind: "RETURN", title: "Sinner return pressure above match baseline", impact: "SIN ML +3.6 п.п.", reliability: 0.92 },
      { time: "4:3 0-0", kind: "SERVE", title: "First-serve quality stable under pressure", impact: "HOLD +1.2 п.п.", reliability: 0.9 },
      { time: "4:2 40-30", kind: "TREE", title: "Long-match branch gained probability", impact: "O22.5 +1.8 п.п.", reliability: 0.83 },
      { time: "4:2 30-30", kind: "MARKET", title: "Match winner price trails point-state model", impact: "EDGE +5.0 п.п.", reliability: 0.89 },
    ],
    reasonHeadline: "Point-state advantage widened before the market fully moved.",
    reasonSummary: "VETO sees stronger return pressure, stable first-serve quality and a healthier hold tree for Sinner.",
    invalidation: "Break of serve, medical timeout or abrupt first-serve degradation triggers a full point-tree reset.",
    specialistTitle: "TENNIS POINT-STATE ENGINE",
    specialistSubtitle: "Serve · return · hold tree · fatigue",
    specialistMetrics: [
      { label: "1st serve won", value: "78%", note: "+6 pp", strength: 78 },
      { label: "Return pressure", value: "61", note: "+12", strength: 61 },
      { label: "Hold probability", value: "78.1%", note: "+1.2 pp", strength: 78 },
      { label: "Fatigue risk", value: "23", note: "low", strength: 23 },
    ],
    specialistMarkets: [
      { label: "Sinner ML", probability: tennisOpportunities[0].fairProbability, fairOdds: tennisOpportunities[0].fairOdds, marketOdds: 1.78, decision: tennisOpportunities[0].decision },
      { label: "Over 22.5", probability: tennisOpportunities[1].fairProbability, fairOdds: tennisOpportunities[1].fairOdds, marketOdds: 1.88, decision: tennisOpportunities[1].decision },
      { label: "Sinner next hold", probability: tennisOpportunities[2].fairProbability, fairOdds: tennisOpportunities[2].fairOdds, marketOdds: 1.34, decision: tennisOpportunities[2].decision },
      { label: "Alcaraz set 2", probability: tennisOpportunities[3].fairProbability, fairOdds: tennisOpportunities[3].fairOdds, marketOdds: 2.12, decision: tennisOpportunities[3].decision },
    ],
  },
  {
    id: "edm-vgk",
    sport: "hockey",
    sportLabel: "HOCKEY",
    competition: "NHL · Sandbox",
    clock: "P3 12:36",
    period: "3RD PERIOD",
    homeCode: "EDM",
    awayCode: "VGK",
    homeName: "Edmonton Oilers",
    awayName: "Vegas Golden Knights",
    homeScore: "2",
    awayScore: "2",
    pulse: "hot",
    markets: 72,
    repriced: 14,
    stateId: "#54218",
    feedLatency: "0.9s",
    modelLatency: "206ms",
    opportunities: hockeyOpportunities,
    stateMetrics: [
      { label: "GOAL HAZARD", value: hockeyModel.remainingGoals.total.toFixed(2), note: "remaining λ" },
      { label: "MANPOWER", value: "5v5", note: "even strength" },
      { label: "UNCERTAINTY", value: "31/100", note: "MEDIUM" },
      { label: "MARKET GAP", value: `+${((hockeyOpportunities[0].fairProbability - 1 / hockeyOpportunities[0].marketOdds) * 100).toFixed(1)} п.п.`, note: "U6.5", accent: true },
    ],
    changes: [
      { label: "Total U6.5", note: "Remaining goal hazard compressed", delta: 0.038, direction: "up" },
      { label: "VGK team total U3.5", note: "Away attack state softened", delta: 0.026, direction: "up" },
      { label: "EDM regulation", note: "Home pressure edge widened", delta: 0.017, direction: "up" },
      { label: "Next goal EDM", note: "Special-teams sensitivity increased", delta: -0.009, direction: "down" },
    ],
    affectedMarkets: ["game total", "team total", "regulation", "next goal"],
    probabilityHistory: [
      { label: "P2 15", market: 0.73, veto: 0.75 },
      { label: "P2 05", market: 0.75, veto: 0.78 },
      { label: "INT", market: 0.76, veto: 0.81 },
      { label: "P3 17", market: 0.77, veto: 0.83 },
      { label: "P3 14", market: 0.78, veto: 0.85 },
      { label: "P3 12", market: 1 / 1.28, veto: hockeyOpportunities[0].fairProbability },
    ],
    probabilityLabel: "Under 6.5",
    modelVersion: "hockey.shift-goalie.v1",
    models: [
      { id: "hazard", label: "Goal Hazard", probability: hockeyOpportunities[0].fairProbability, confidence: 0.9, latency: "13ms", status: "aligned" },
      { id: "shift", label: "Shift State", probability: 0.84, confidence: 0.83, latency: "22ms", status: "aligned" },
      { id: "goalie", label: "Goalie State", probability: 0.86, confidence: 0.8, latency: "18ms", status: "aligned" },
      { id: "manpower", label: "Manpower", probability: 0.82, confidence: 0.78, latency: "9ms", status: "aligned" },
      { id: "market", label: "Market Context", probability: 0.8, confidence: 0.75, latency: "11ms", status: "aligned" },
    ],
    scenarios: [
      { label: "5v5 сохраняется", probability: 0.58, outcomes: [{ label: "U6.5", value: 0.88 }, { label: "EDM REG", value: 0.4 }, { label: "VGK U3.5", value: 0.9 }] },
      { label: "EDM power play", probability: 0.14, outcomes: [{ label: "U6.5", value: 0.72 }, { label: "EDM REG", value: 0.57 }, { label: "VGK U3.5", value: 0.92 }] },
      { label: "VGK power play", probability: 0.12, outcomes: [{ label: "U6.5", value: 0.7 }, { label: "EDM REG", value: 0.28 }, { label: "VGK U3.5", value: 0.73 }] },
      { label: "Empty-net phase", probability: 0.09, outcomes: [{ label: "U6.5", value: 0.52 }, { label: "EDM REG", value: 0.49 }, { label: "VGK U3.5", value: 0.67 }] },
    ],
    marketMoves: [
      { time: "P3 12:31", label: "Under 6.5", from: 1.33, to: 1.28, reason: "Goal-hazard compression", explained: true },
      { time: "P3 11:58", label: "VGK U3.5", from: 1.26, to: 1.22, reason: "Away attack state", explained: true },
      { time: "P3 11:44", label: "EDM regulation", from: 2.71, to: 2.62, reason: "Home pressure edge", explained: true },
      { time: "P3 11:20", label: "Next goal EDM", from: 1.99, to: 1.93, reason: "Market ahead of current special-teams state", explained: false },
    ],
    evidence: [
      { time: "P3 12:29", kind: "STATE", title: "Five-on-five goal hazard compressed", impact: "U6.5 +3.8 п.п.", reliability: 0.92 },
      { time: "P3 12:03", kind: "SHIFT", title: "Vegas offensive-zone shift quality declined", impact: "VGK TT −2.6 п.п.", reliability: 0.84 },
      { time: "P3 11:47", kind: "GOALIE", title: "Both goalies remain in stable state", impact: "TOTAL ↓", reliability: 0.81 },
      { time: "P3 11:22", kind: "MARKET", title: "Under price trails VETO remaining-goal model", impact: "EDGE ↑", reliability: 0.9 },
    ],
    reasonHeadline: "Goal hazard fell faster than the total market repriced.",
    reasonSummary: "VETO sees compressed five-on-five pace, a softer Vegas attack state and no current manpower boost.",
    invalidation: "Penalty, goalie pull, major shift-pressure spike or next goal triggers a full hockey hazard reprice.",
    specialistTitle: "HOCKEY SHIFT / GOALIE ENGINE",
    specialistSubtitle: "Goal hazard · manpower · goalie · empty-net state",
    specialistMetrics: [
      { label: "Remaining λ", value: hockeyModel.remainingGoals.total.toFixed(2), note: "goals", strength: 48 },
      { label: "EDM attack", value: "1.08", note: "+8%", strength: 68 },
      { label: "VGK attack", value: "0.94", note: "−6%", strength: 49 },
      { label: "Manpower", value: "5v5", note: "even", strength: 50 },
    ],
    specialistMarkets: hockeyOpportunities.map((item) => ({
      label: item.selection.label,
      probability: item.fairProbability,
      fairOdds: item.fairOdds,
      marketOdds: item.marketOdds,
      decision: item.decision,
    })),
  },

];

export const workspaceById = Object.fromEntries(
  liveWorkspaces.map((workspace) => [workspace.id, workspace]),
) as Record<string, LiveWorkspace>;
