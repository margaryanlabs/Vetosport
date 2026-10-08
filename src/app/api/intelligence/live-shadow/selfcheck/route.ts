import { NextResponse } from "next/server";
import { buildFootballShadowPredictionPlan } from "@/lib/live/shadow-football";
import type {
  PersistedEvent,
  PersistedEventStateRecord,
  PersistedMarketQuoteRecord,
} from "@/lib/persistence/contracts";

export const dynamic = "force-dynamic";

export function GET() {
  const eventId = "33333333-3333-4333-8333-333333333333";
  const event: PersistedEvent = {
    id: eventId,
    canonicalKey: "shadow-selfcheck",
    event: {
      id: eventId,
      sport: "football",
      competition: "VETO Shadow Selfcheck",
      startsAt: "2026-10-08T11:00:00.000Z",
      status: "live",
      home: { id: "ars", name: "Arsenal" },
      away: { id: "liv", name: "Liverpool" },
    },
  };
  const state: PersistedEventStateRecord = {
    eventId,
    sourceProvider: "selfcheck",
    capturedAt: "2026-10-08T12:00:00.000Z",
    state: {
      score: { home: 1, away: 0 },
      clock: { elapsedSeconds: 3600 },
      baseline: {
        prematchExpectedHomeGoals: 1.65,
        prematchExpectedAwayGoals: 1.30,
      },
      xg_home: 1.10,
      xg_away: 0.72,
      tempo_index: 0.92,
    },
  };
  const quotes: PersistedMarketQuoteRecord[] = [
    {
      eventId,
      provider: "selfcheck",
      bookmaker: "book-a",
      marketKey: "soccer_epl.h2h",
      selectionKey: "arsenal",
      selectionLabel: "Arsenal",
      decimalOdds: 1.88,
      capturedAt: state.capturedAt,
    },
    {
      eventId,
      provider: "selfcheck",
      bookmaker: "book-a",
      marketKey: "soccer_epl.totals",
      selectionKey: "under",
      selectionLabel: "Under",
      line: 2.5,
      decimalOdds: 1.95,
      capturedAt: state.capturedAt,
    },
  ];

  const plan = buildFootballShadowPredictionPlan({
    event,
    state,
    quotes,
  });

  const keys = new Set(
    plan.predictions.map(
      (prediction) =>
        `${prediction.marketKey}::${prediction.selectionKey}`,
    ),
  );

  const checks = [
    {
      id: "h2h-mapped",
      passed: keys.has("football.1x2::home"),
    },
    {
      id: "total-mapped",
      passed: keys.has("football.total_goals::under-2.5"),
    },
    {
      id: "predictions-exist",
      passed: plan.predictions.length >= 2,
    },
    {
      id: "shadow-warning",
      passed: plan.warnings.some((warning) =>
        warning.includes("SHADOW ONLY"),
      ),
    },
  ];

  return NextResponse.json({
    model: "veto.shadow-football.selfcheck.v1",
    passed: checks.every((check) => check.passed),
    generatedAt: new Date().toISOString(),
    checks,
    plan: {
      modelVersion: plan.modelVersion,
      featureVersion: plan.featureVersion,
      predictions: plan.predictions.length,
      decisionWrites: 0,
    },
  });
}
