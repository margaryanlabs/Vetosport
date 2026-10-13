import { getPersistence } from "@/lib/persistence/factory";
import {liveFeedWindows,selectFeedCandidates,prioritizeLiveFeed} from "@/lib/live/feed-priority";
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
    // The storage adapter sorts by starts_at ASC. One 12h+ query with
    // limit=40 returned only the *oldest* matches, hiding real active games.
    // Search non-overlapping kickoff windows and prioritize current fixtures.
    const windows=liveFeedWindows(now);
    const batches=await Promise.all(windows.map(window=>
      persistence.listRecentEvents({
        from:window.from,to:window.to,
        statuses:["live","scheduled","finished","suspended"],
        limit:window.limit,
      })
    ));
    const events=selectFeedCandidates(
      batches.flat().filter(event=>!isSelfcheckEvent(event)),now,60,
    );

    if (events.length === 0) return [];

    const eventIds = events.map((event) => event.id);
    const [states, quotes, predictions, decisions] = await Promise.all([
      Promise.all(Array.from({length:Math.ceil(eventIds.length/20)},(_,index)=>
        persistence.listRecentEventStates({
          eventIds:eventIds.slice(index*20,(index+1)*20),
          limit:550,
        })
      )).then(chunks=>chunks.flat()),
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

    return prioritizeLiveFeed(events
      .map((event) =>
        buildPersistedSummary({
          event,
          state: statesByEvent.get(event.id),
          quotes,
          decision: decisionsByEvent.get(event.id),
          shadowPredictionCount: shadowCountByEvent.get(event.id) ?? 0,
        }),
      )
      ,now,40);
  };
