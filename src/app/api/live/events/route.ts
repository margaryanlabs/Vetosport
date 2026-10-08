import { NextResponse } from "next/server";
import { getDataPlaneRuntimeStatus } from "@/lib/data-plane/engine";
import { getPersistence } from "@/lib/persistence/factory";
import { liveWorkspaces } from "@/lib/sandbox/workspaces";
import { sportEngineRegistry } from "@/lib/sports/registry";

export const dynamic = "force-dynamic";

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizedState = (value: Record<string, unknown> | undefined) => {
  const state = value ?? {};
  const score = record(state.score);
  const clock = record(state.clock);

  return {
    score:
      score && number(score.home) != null && number(score.away) != null
        ? { home: number(score.home), away: number(score.away) }
        : null,
    period:
      typeof state.period === "string"
        ? state.period
        : typeof clock?.period === "string"
          ? clock.period
          : null,
    elapsedSeconds: number(clock?.elapsedSeconds),
    remainingSeconds: number(clock?.remainingSeconds),
    status: typeof state.status === "string" ? state.status : null,
  };
};

const freshnessSeconds = (...timestamps: Array<string | undefined>) => {
  const latest = timestamps
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return latest == null
    ? null
    : Math.max(0, Math.round((Date.now() - latest) / 1000));
};

export async function GET() {
  const runtime = getDataPlaneRuntimeStatus();

  if (runtime.persistenceConfigured) {
    try {
      const persistence = getPersistence();
      const rows = await persistence.listLiveFeedEvents({
        statuses: ["live", "scheduled", "suspended"],
        limit: 40,
      });

      const events = rows.map((row) => {
        const state = normalizedState(row.latestState);
        const provider =
          row.stateSourceProvider ??
          Object.keys(row.providerRefs)[0] ??
          "canonical-gateway";

        return {
          id: row.id,
          source: "persisted",
          provider,
          sport: row.sport,
          sportLabel: row.sport.toUpperCase(),
          competition: row.competition,
          status: row.status,
          startsAt: row.startsAt,
          updatedAt: row.updatedAt,
          stateCapturedAt: row.stateCapturedAt ?? null,
          freshnessSeconds: freshnessSeconds(
            row.stateCapturedAt,
            row.latestQuoteAt,
            row.updatedAt,
          ),
          home: {
            id: row.homeParticipantId ?? null,
            name: row.homeParticipantName ?? "Home",
            score: state.score?.home ?? null,
          },
          away: {
            id: row.awayParticipantId ?? null,
            name: row.awayParticipantName ?? "Away",
            score: state.score?.away ?? null,
          },
          state: {
            period: state.period,
            elapsedSeconds: state.elapsedSeconds,
            remainingSeconds: state.remainingSeconds,
          },
          market: {
            quotes: row.quoteCount,
            markets: row.marketCount,
            latestQuoteAt: row.latestQuoteAt ?? null,
          },
          model: {
            status: row.decisionCount > 0 ? "DECISION_READY" : "MODEL_PENDING",
            decisions: row.decisionCount,
            latestDecision: row.latestDecision ?? null,
            latestDecisionAt: row.latestDecisionAt ?? null,
            opportunityScore: row.latestOpportunityScore ?? null,
          },
        };
      });

      return NextResponse.json({
        mode: events.length > 0 ? "live-feed" : "gateway-ready",
        runtimeMode: runtime.mode,
        generatedAt: new Date().toISOString(),
        warning:
          events.length > 0
            ? null
            : "Canonical gateway is ready. Waiting for the first real event push.",
        engines: sportEngineRegistry,
        events,
      });
    } catch (error) {
      return NextResponse.json(
        {
          mode: "gateway-degraded",
          runtimeMode: runtime.mode,
          generatedAt: new Date().toISOString(),
          warning:
            error instanceof Error
              ? error.message
              : "Persisted live feed is unavailable.",
          engines: sportEngineRegistry,
          events: [],
        },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({
    mode: "sandbox",
    runtimeMode: runtime.mode,
    generatedAt: new Date().toISOString(),
    warning:
      "Live persistence is not configured. Synthetic workspaces remain explicit demos.",
    engines: sportEngineRegistry,
    events: liveWorkspaces.map((workspace) => ({
      id: workspace.id,
      source: "sandbox",
      sport: workspace.sport,
      sportLabel: workspace.sportLabel,
      competition: workspace.competition,
      status: "live",
      home: {
        name: workspace.homeName,
        score: Number(workspace.homeScore),
      },
      away: {
        name: workspace.awayName,
        score: Number(workspace.awayScore),
      },
      model: {
        status: "SANDBOX",
        decisions: workspace.opportunities.length,
        latestDecision: workspace.opportunities[0]?.decision ?? null,
      },
    })),
  });
}
