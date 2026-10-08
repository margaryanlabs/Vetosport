import { ingestLatestFootballState } from "@/lib/ingestion/live-football-state";
import { settleFootballEvent } from "@/lib/settlement/football-worker";

export const runLiveFootballCycle = async () => {
  const ingestion = await ingestLatestFootballState();

  const rows: Array<{
    eventId: string;
    providerEventId: string;
    decisionsFound: number;
    settled: number;
    voids: number;
    withClosingConsensus: number;
    withoutClosingPrice: number;
  }> = [];
  const errors: Array<{
    eventId: string;
    providerEventId: string;
    error: string;
  }> = [];

  for (const event of ingestion.finishedEvents) {
    try {
      const result = await settleFootballEvent({
        eventId: event.eventId,
        finalScore: event.finalScore,
        settledAt: event.settledAt,
      });

      rows.push({
        eventId: event.eventId,
        providerEventId: event.providerEventId,
        decisionsFound: result.decisionsFound,
        settled: result.settled,
        voids: result.voids,
        withClosingConsensus: result.withClosingConsensus,
        withoutClosingPrice: result.withoutClosingPrice,
      });
    } catch (error) {
      errors.push({
        eventId: event.eventId,
        providerEventId: event.providerEventId,
        error:
          error instanceof Error
            ? error.message
            : "Automatic football settlement failed.",
      });
    }
  }

  return {
    ingestion,
    settlement: {
      finishedEventsSeen: ingestion.finishedEvents.length,
      attempted: rows.length + errors.length,
      settledDecisions: rows.reduce((sum, row) => sum + row.settled, 0),
      withClosingConsensus: rows.reduce(
        (sum, row) => sum + row.withClosingConsensus,
        0,
      ),
      withoutClosingPrice: rows.reduce(
        (sum, row) => sum + row.withoutClosingPrice,
        0,
      ),
      rows,
      errors,
    },
  };
};
