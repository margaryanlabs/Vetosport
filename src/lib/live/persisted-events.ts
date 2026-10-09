import { getPersistence } from "@/lib/persistence/factory";
import type { LiveEventSummary } from "@/lib/live/types";
import {
  buildPersistedSummary,
  isSelfcheckEvent,
  latestByEvent,
} from "@/lib/live/persisted-utils";

export const listPersistedLiveEvents =
  async (): Promise<LiveEventSummary[]> => {
    const persistence = getPersistence();
    const now = Date.now();
    const events = (
      await persistence.listRecentEvents({
        from: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
        to: new Date(now + 36 * 60 * 60 * 1000).toISOString(),
        statuses: ["live", "scheduled", "finished", "suspended"],
        limit: 40,
      })
    ).filter((event) => !isSelfcheckEvent(event));

    if (events.length === 0) return [];

    const eventIds = events.map((event) => event.id);
    const [states, quotes, predictions, decisions] = await Promise.all([
      persistence.listRecentEventStates({ eventIds }),
      persistence.listRecentQuotesForEvents({
        eventIds,
        limit: 4000,
      }),
      persistence.listRecentPredictionsForEvents({
        eventIds,
        limit: 4000,
      }),
      persistence.listDecisionHeads(eventIds),
    ]);

    const statesByEvent = latestByEvent(states);
    const decisionsByEvent = latestByEvent(decisions);
    const shadowCountByEvent = new Map<string, number>();

    for (const eventId of eventIds) {
      const eventPredictions = predictions.filter(
        (prediction) => prediction.eventId === eventId,
      );
      const latestCapturedAt = eventPredictions[0]?.capturedAt;
      shadowCountByEvent.set(
        eventId,
        latestCapturedAt
          ? eventPredictions.filter(
              (prediction) => prediction.capturedAt === latestCapturedAt,
            ).length
          : 0,
      );
    }

    const statusRank = (status: LiveEventSummary["status"]) =>
      status === "live"
        ? 0
        : status === "scheduled"
          ? 1
          : status === "suspended"
            ? 2
            : 3;

    return events
      .map((event) =>
        buildPersistedSummary({
          event,
          state: statesByEvent.get(event.id),
          quotes,
          decision: decisionsByEvent.get(event.id),
          shadowPredictionCount: shadowCountByEvent.get(event.id) ?? 0,
        }),
      )
      .sort(
        (a, b) =>
          statusRank(a.status) - statusRank(b.status) ||
          new Date(a.startsAt ?? 0).getTime() -
            new Date(b.startsAt ?? 0).getTime(),
      );
  };
