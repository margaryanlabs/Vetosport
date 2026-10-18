import { canonicalEventKey } from "@/lib/canonical/id";
import { journalizeEventState } from "@/lib/data-plane/journalize";
import { getPersistence } from "@/lib/persistence/factory";
import { getSportmonksClient } from "@/lib/providers/factory";

export const ingestLatestFootballState = async () => {
  const client = getSportmonksClient();
  const persistence = getPersistence();
  const envelope = await client.getActiveLivescores();

  let eventsSeen = 0;
  let eventsPersisted = 0;
  let statesPersisted = 0;
  let journalRows = 0;
  let verifiedLiveStates=0;
  let liveWithoutExactClockOrScore=0;
  const finishedEvents: Array<{
    eventId: string;
    providerEventId: string;
    finalScore: { home: number; away: number };
    settledAt: string;
  }> = [];

  for (const raw of envelope.data.data) {
    eventsSeen += 1;

    const event = client.normalizeFixture(raw);
    const canonicalKey = canonicalEventKey({
      sport: event.sport,
      competition: event.competition,
      startsAt: event.startsAt,
      home: event.home?.name,
      away: event.away?.name,
    });

    const persisted = await persistence.upsertEvent(event, canonicalKey, {
      provider: client.id,
      id: event.id,
    });
    eventsPersisted += 1;

    const verifiedLive=event.status==="live"?client.getLiveState(raw):null;
    const finalScore=event.status==="finished"?client.extractFinalScore(raw):null;
    // A public regulation clock must never be inferred from wall-clock
    // time since kickoff; use Sportmonks ticking periods only.
    const score=verifiedLive?.score??finalScore;
    if(event.status==="live"){
      if(verifiedLive)verifiedLiveStates++;
      else liveWithoutExactClockOrScore++;
    }
    const state = {
      status: event.status,
      score,
      ...(verifiedLive?{
       period:verifiedLive.period,
       elapsedSeconds:verifiedLive.minute*60,
       clock:verifiedLive.minute+"′",
       clockResolution:"MINUTES_NOT_SECONDS",
       providerSnapshotTimeUnknown:true,
      }:{}),
      providerEventId: event.id,
      home: event.home,
      away: event.away,
      source: "sportmonks.livescores",
    };

    await persistence.appendEventState({
      eventId: persisted.id,
      sourceProvider: client.id,
      capturedAt: envelope.receivedAt,
      sourceLatencyMs: envelope.latencyMs,
      state,
    });
    statesPersisted += 1;

    journalRows += await persistence.appendTruthJournal([
      journalizeEventState({
        canonicalEventId: persisted.id,
        sourceProvider: client.id,
        sourceRecordId: `${event.id}:${envelope.receivedAt}`,
        gatewayReceivedAt: envelope.receivedAt,
        sourceEmittedAt: envelope.receivedAt,
        eventOccurredAt: envelope.receivedAt,
        payload: state,
      }),
    ]);

    if (event.status === "finished" && finalScore) {
      finishedEvents.push({
        eventId: persisted.id,
        providerEventId: event.id,
        finalScore: finalScore!,
        settledAt: envelope.receivedAt,
      });
    }
  }

  await persistence.appendProviderHealth({
    providerId: client.id,
    status: "healthy",
    checkedAt: envelope.receivedAt,
    latencyMs: envelope.latencyMs,
    message: "Latest football state ingestion succeeded.",
    metadata: {
      eventsSeen,
      eventsPersisted,
      statesPersisted,
      journalRows,
      finishedEvents: finishedEvents.length,
      verifiedLiveStates,liveWithoutExactClockOrScore,
      liveWindow:"SPORTMONKS_LIVESCORES_ALL_NOT_LATEST_10_SECONDS",
    },
  });

  return {
    provider: client.id,
    receivedAt: envelope.receivedAt,
    latencyMs: envelope.latencyMs,
    eventsSeen,
    eventsPersisted,
    statesPersisted,
    journalRows,
    finishedEvents,verifiedLiveStates,liveWithoutExactClockOrScore,
  };
};
