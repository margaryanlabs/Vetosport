import type { Opportunity, RiskBand, Sport } from "@/lib/domain/types";
import type {
  EvidenceView,
  MarketMove,
  ModelView,
  ProbabilityPoint,
} from "@/lib/sandbox/live";
import { sandboxOpportunities } from "@/lib/sandbox/sample";
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
  return {
    eventId: input.eventId,
    marketId: input.marketId,
    selection: { id: input.selectionId, label: input.label },
    decision: input.decision,
    marketOdds: input.odds,
    marketImpliedProbability: implied,
    fairProbability: input.probability,
    fairOdds: 1 / input.probability,
    expectedValue: input.probability * input.odds - 1,
    probabilityEdge: input.probability - implied,
    opportunityScore: input.score,
    risk: input.risk ?? "MEDIUM",
    dataConfidence: "HIGH",
    modelAgreement: input.agreement,
    freshnessSeconds: 8,
    rationale: input.rationale,
  };
};

const basketballOpportunities: Opportunity[] = [
  opportunity({
    eventId: "sandbox-bos-nyk",
    marketId: "basketball.total_points",
    selectionId: "under-229.5",
    label: "Тотал меньше 229.5",
    probability: 0.682,
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
    probability: 0.596,
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
    probability: 0.641,
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
    probability: 0.612,
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
    probability: 0.781,
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
      { label: "Under 229.5", probability: 0.682, fairOdds: 1 / 0.682, marketOdds: 1.72, decision: "EDGE" },
      { label: "NYK U111.5", probability: 0.641, fairOdds: 1 / 0.641, marketOdds: 1.79, decision: "EDGE" },
      { label: "Boston −4.5", probability: 0.596, fairOdds: 1 / 0.596, marketOdds: 1.91, decision: "WATCH" },
      { label: "Tatum O28.5", probability: 0.557, fairOdds: 1 / 0.557, marketOdds: 1.92, decision: "WATCH" },
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
      { label: "Sinner ML", probability: 0.612, fairOdds: 1 / 0.612, marketOdds: 1.78, decision: "EDGE" },
      { label: "Over 22.5", probability: 0.587, fairOdds: 1 / 0.587, marketOdds: 1.88, decision: "WATCH" },
      { label: "Sinner next hold", probability: 0.781, fairOdds: 1 / 0.781, marketOdds: 1.34, decision: "WATCH" },
      { label: "Alcaraz set 2", probability: 0.438, fairOdds: 1 / 0.438, marketOdds: 2.12, decision: "PASS" },
    ],
  },
];

export const workspaceById = Object.fromEntries(
  liveWorkspaces.map((workspace) => [workspace.id, workspace]),
) as Record<string, LiveWorkspace>;
