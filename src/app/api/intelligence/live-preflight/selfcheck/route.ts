import { NextResponse } from "next/server";
import { evaluateLiveDecisionReadiness } from "@/lib/live/decision-readiness";
import type {
  DecisionHistoryRecord,
  PersistedEvent,
  PersistedEventStateRecord,
  PersistedMarketQuoteRecord,
} from "@/lib/persistence/contracts";

export const dynamic = "force-dynamic";

const eventId = "11111111-1111-4111-8111-111111111111";
const capturedAt = "2026-10-08T12:00:00.000Z";

const footballEvent: PersistedEvent = {
  id: eventId,
  canonicalKey: "selfcheck-football",
  event: {
    id: eventId,
    sport: "football",
    competition: "VETO Preflight Selfcheck",
    startsAt: "2026-10-08T11:00:00.000Z",
    status: "live",
    home: { id: "home", name: "Home" },
    away: { id: "away", name: "Away" },
  },
};

const completeState: PersistedEventStateRecord = {
  eventId,
  sourceProvider: "selfcheck",
  capturedAt,
  state: {
    score: { home: 1, away: 0 },
    clock: { elapsedSeconds: 3600 },
    baseline: {
      prematchExpectedHomeGoals: 1.62,
      prematchExpectedAwayGoals: 1.08,
    },
  },
};

const incompleteState: PersistedEventStateRecord = {
  ...completeState,
  state: {
    score: { home: 1, away: 0 },
    clock: { elapsedSeconds: 3600 },
  },
};

const quote: PersistedMarketQuoteRecord = {
  eventId,
  provider: "selfcheck",
  bookmaker: "selfcheck-book",
  marketKey: "football.total_goals",
  selectionKey: "under-2.5",
  selectionLabel: "Under 2.5",
  line: 2.5,
  decimalOdds: 1.91,
  capturedAt,
  suspended: false,
};

const existingDecision: DecisionHistoryRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  eventId,
  marketKey: "football.total_goals",
  selectionKey: "under-2.5",
  decision: "WATCH",
  decisionMode: "BALANCED",
  marketOdds: 1.91,
  fairProbability: 0.57,
  opportunityScore: 68,
  capturedAt,
  immutableFingerprint: "selfcheck",
  modelVersionSet: ["football.goal-state.v1"],
};

export function GET() {
  const dataPending = evaluateLiveDecisionReadiness({
    event: footballEvent,
    quotes: [],
  });

  const inputIncomplete = evaluateLiveDecisionReadiness({
    event: footballEvent,
    state: incompleteState,
    quotes: [quote],
  });

  const complete = evaluateLiveDecisionReadiness({
    event: footballEvent,
    state: completeState,
    quotes: [quote],
  });

  const basketballEvent: PersistedEvent = {
    ...footballEvent,
    canonicalKey: "selfcheck-basketball",
    event: {
      ...footballEvent.event,
      sport: "basketball",
    },
  };

  const adapterMissing = evaluateLiveDecisionReadiness({
    event: basketballEvent,
    state: completeState,
    quotes: [quote],
  });

  const decisionPresent = evaluateLiveDecisionReadiness({
    event: footballEvent,
    state: completeState,
    quotes: [quote],
    decision: existingDecision,
  });

  const checks = [
    {
      id: "data-pending",
      passed: dataPending.status === "DATA_PENDING",
      actual: dataPending.status,
    },
    {
      id: "model-input-incomplete",
      passed: inputIncomplete.status === "MODEL_INPUT_INCOMPLETE",
      actual: inputIncomplete.status,
    },
    {
      id: "complete-football-preflight",
      passed:
        complete.status === "GOVERNANCE_BLOCKED" ||
        complete.status === "DECISION_READY",
      actual: complete.status,
    },
    {
      id: "adapter-missing",
      passed: adapterMissing.status === "MODEL_ADAPTER_MISSING",
      actual: adapterMissing.status,
    },
    {
      id: "decision-present",
      passed: decisionPresent.status === "DECISION_PRESENT",
      actual: decisionPresent.status,
    },
  ];

  return NextResponse.json({
    model: "veto.live-decision-preflight.selfcheck.v1",
    passed: checks.every((check) => check.passed),
    generatedAt: new Date().toISOString(),
    checks,
    productionAuthorized:
      complete.status === "DECISION_READY",
  });
}
