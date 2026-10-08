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
    const [states, quotes, decisions] = await Promise.all([
      persistence.listRecentEventStates({ eventIds }),
      persistence.listRecentQuotesForEvents({
        eventIds,
        limit: 4000,
      }),
      persistence.listDecisionHeads(eventIds),
    ]);

    const statesByEvent = latestByEvent(states);
    const decisionsByEvent = latestByEvent(decisions);

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
        }),
      )
      .sort(
        (a, b) =>
          statusRank(a.status) - statusRank(b.status) ||
          new Date(a.startsAt ?? 0).getTime() -
            new Date(b.startsAt ?? 0).getTime(),
      );
  };
