export interface LiveEventCard {
  id: string;
  sport: "football" | "basketball" | "tennis";
  competition: string;
  clock: string;
  home: string;
  away: string;
  scoreHome: string;
  scoreAway: string;
  pulse: "hot" | "stable" | "quiet";
  markets: number;
  repriced: number;
  topEdge: number;
}

export interface StateMetric {
  label: string;
  value: string;
  delta?: string;
  tone?: "up" | "down" | "neutral";
  strength: number;
}

export interface ProbabilityPoint {
  label: string;
  market: number;
  veto: number;
}

export interface ModelView {
  id: string;
  label: string;
  probability: number;
  confidence: number;
  latency: string;
  status: "aligned" | "divergent";
}

export interface ScenarioView {
  label: string;
  probability: number;
  under35: number;
  homeWin: number;
  nextGoal: number;
}

export interface MarketMove {
  time: string;
  label: string;
  from: number;
  to: number;
  reason: string;
  explained: boolean;
}

export interface EvidenceView {
  time: string;
  kind: string;
  title: string;
  impact: string;
  reliability: number;
}

export const liveEvents: LiveEventCard[] = [
  {
    id: "ars-liv",
    sport: "football",
    competition: "Premier League · Sandbox",
    clock: "64:18",
    home: "ARS",
    away: "LIV",
    scoreHome: "1",
    scoreAway: "1",
    pulse: "hot",
    markets: 183,
    repriced: 29,
    topEdge: 11.7,
  },
  {
    id: "bos-nyk",
    sport: "basketball",
    competition: "NBA · Sandbox",
    clock: "Q3 04:21",
    home: "BOS",
    away: "NYK",
    scoreHome: "78",
    scoreAway: "73",
    pulse: "stable",
    markets: 126,
    repriced: 18,
    topEdge: 7.2,
  },
  {
    id: "sin-alc",
    sport: "tennis",
    competition: "ATP · Sandbox",
    clock: "SET 2",
    home: "SIN",
    away: "ALC",
    scoreHome: "4",
    scoreAway: "3",
    pulse: "quiet",
    markets: 48,
    repriced: 7,
    topEdge: 4.6,
  },
];

export const stateMetrics: StateMetric[] = [
  { label: "Ожидаемые голы", value: "2.61", delta: "−0.18 / 10м", tone: "down", strength: 74 },
  { label: "Темп атак", value: "71", delta: "−19%", tone: "down", strength: 71 },
  { label: "Территория ARS", value: "57%", delta: "+6 п.п.", tone: "up", strength: 57 },
  { label: "Опасность LIV", value: "0.82", delta: "−0.31", tone: "down", strength: 49 },
  { label: "Усталость", value: "62", delta: "+8", tone: "up", strength: 62 },
  { label: "Неопределённость", value: "21", delta: "низкая", tone: "neutral", strength: 21 },
];

export const probabilityHistory: ProbabilityPoint[] = [
  { label: "45'", market: 0.64, veto: 0.66 },
  { label: "49'", market: 0.65, veto: 0.69 },
  { label: "53'", market: 0.67, veto: 0.72 },
  { label: "57'", market: 0.68, veto: 0.75 },
  { label: "60'", market: 0.70, veto: 0.77 },
  { label: "62'", market: 0.70, veto: 0.78 },
  { label: "64'", market: 0.699, veto: 0.784 },
];

export const modelViews: ModelView[] = [
  { id: "state", label: "Game State", probability: 0.79, confidence: 0.91, latency: "18ms", status: "aligned" },
  { id: "sim", label: "Monte Carlo", probability: 0.77, confidence: 0.89, latency: "41ms", status: "aligned" },
  { id: "similar", label: "Similarity", probability: 0.80, confidence: 0.80, latency: "63ms", status: "aligned" },
  { id: "market", label: "Market Context", probability: 0.74, confidence: 0.74, latency: "11ms", status: "aligned" },
  { id: "tactical", label: "Tactical State", probability: 0.81, confidence: 0.77, latency: "82ms", status: "aligned" },
];

export const scenarios: ScenarioView[] = [
  { label: "Без гола 10 минут", probability: 0.43, under35: 0.86, homeWin: 0.31, nextGoal: 0.48 },
  { label: "ARS забивает", probability: 0.24, under35: 0.53, homeWin: 0.76, nextGoal: 0.42 },
  { label: "LIV забивает", probability: 0.19, under35: 0.49, homeWin: 0.12, nextGoal: 0.39 },
  { label: "Красная карточка", probability: 0.04, under35: 0.67, homeWin: 0.44, nextGoal: 0.61 },
];

export const marketMoves: MarketMove[] = [
  { time: "64:12", label: "Under 3.5", from: 1.47, to: 1.43, reason: "Tempo decay", explained: true },
  { time: "63:44", label: "ARS win", from: 2.11, to: 2.16, reason: "Possession without threat", explained: true },
  { time: "63:08", label: "Corners O9.5", from: 2.12, to: 2.04, reason: "Wing pressure spike", explained: true },
  { time: "62:51", label: "Saka O1.5 shots", from: 1.91, to: 1.82, reason: "Unexplained market move", explained: false },
];

export const evidence: EvidenceView[] = [
  { time: "64:05", kind: "STATE", title: "Темп атак упал ниже 15-минутной нормы", impact: "UNDER +4.2 п.п.", reliability: 0.94 },
  { time: "63:36", kind: "TACTICAL", title: "ARS перешёл в более низкий блок", impact: "LIV xG −0.09", reliability: 0.83 },
  { time: "62:54", kind: "PLAYER", title: "Правый фланг LIV потерял объём threat", impact: "BTTS −2.7 п.п.", reliability: 0.79 },
  { time: "61:40", kind: "MARKET", title: "Цена Under отстаёт от VETO fair line", impact: "EDGE +11.7%", reliability: 0.91 },
  { time: "60:18", kind: "SIM", title: "10k сценариев: хвост 4+ голов сузился", impact: "RISK ↓", reliability: 0.88 },
];
