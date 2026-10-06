import type {
  DecisionLedgerEntry,
  Evidence,
  MarketQuote,
  SportEvent,
} from "@/lib/domain/types";
import type {
  DecisionOutcomeRecord,
  EventStateSnapshot,
  HistoricalImportRecord,
  PersistedEvent,
  PredictionRecord,
  ProviderHealthSample,
  UnsettledDecision,
  VetoPersistence,
} from "./contracts";

interface SupabaseRestOptions {
  url: string;
  serviceRoleKey: string;
}

export class SupabaseRestPersistence implements VetoPersistence {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;

  constructor(options: SupabaseRestOptions) {
    this.baseUrl = `${options.url.replace(/\/$/, "")}/rest/v1`;
    this.serviceRoleKey = options.serviceRoleKey;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    prefer?: string,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...(prefer ? { Prefer: prefer } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Supabase REST ${response.status}: ${body.slice(0, 500)}`);
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  async upsertEvent(
    event: SportEvent,
    canonicalKey: string,
    providerRef?: { provider: string; id: string },
  ): Promise<PersistedEvent> {
    const body = {
      canonical_key: canonicalKey,
      sport: event.sport,
      competition_name: event.competition,
      starts_at: event.startsAt,
      status: event.status,
      home_participant_id: event.home?.id,
      home_participant_name: event.home?.name,
      away_participant_id: event.away?.id,
      away_participant_name: event.away?.name,
      provider_refs: providerRef
        ? { [providerRef.provider]: providerRef.id }
        : {},
      updated_at: new Date().toISOString(),
    };

    const rows = await this.request<Array<{ id: string; canonical_key: string }>>(
      "/sports_events?on_conflict=canonical_key",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "resolution=merge-duplicates,return=representation",
    );

    const row = rows[0];
    if (!row) throw new Error("Supabase did not return the upserted event.");

    return {
      id: row.id,
      canonicalKey: row.canonical_key,
      event,
    };
  }

  async findEventsAround(input: {
    sport: SportEvent["sport"];
    startsAt: string;
    toleranceMinutes?: number;
  }): Promise<PersistedEvent[]> {
    const toleranceMinutes = input.toleranceMinutes ?? 20;
    const center = new Date(input.startsAt).getTime();
    const from = new Date(center - toleranceMinutes * 60000).toISOString();
    const to = new Date(center + toleranceMinutes * 60000).toISOString();

    const query = new URLSearchParams();
    query.set("sport", `eq.${input.sport}`);
    query.set("starts_at", `gte.${from}`);
    query.append("starts_at", `lte.${to}`);
    query.set(
      "select",
      "id,canonical_key,sport,competition_name,starts_at,status,home_participant_id,home_participant_name,away_participant_id,away_participant_name",
    );

    const rows = await this.request<Array<{
      id: string;
      canonical_key: string;
      sport: SportEvent["sport"];
      competition_name: string;
      starts_at: string;
      status: SportEvent["status"];
      home_participant_id?: string | null;
      home_participant_name?: string | null;
      away_participant_id?: string | null;
      away_participant_name?: string | null;
    }>>(
      `/sports_events?${query.toString()}`,
      { method: "GET" },
    );

    return rows.map((row) => ({
      id: row.id,
      canonicalKey: row.canonical_key,
      event: {
        id: row.id,
        sport: row.sport,
        competition: row.competition_name,
        startsAt: row.starts_at,
        status: row.status,
        home: row.home_participant_name
          ? {
              id: row.home_participant_id ?? row.home_participant_name,
              name: row.home_participant_name,
            }
          : undefined,
        away: row.away_participant_name
          ? {
              id: row.away_participant_id ?? row.away_participant_name,
              name: row.away_participant_name,
            }
          : undefined,
      },
    }));
  }

  async appendEventState(snapshot: EventStateSnapshot): Promise<void> {
    await this.request(
      "/event_state_snapshots",
      {
        method: "POST",
        body: JSON.stringify({
          event_id: snapshot.eventId,
          captured_at: snapshot.capturedAt,
          source_provider: snapshot.sourceProvider,
          source_latency_ms: snapshot.sourceLatencyMs,
          state: snapshot.state,
          fingerprint: snapshot.fingerprint,
        }),
      },
      "return=minimal",
    );
  }

  async appendQuotes(eventId: string, quotes: MarketQuote[]): Promise<number> {
    if (quotes.length === 0) return 0;

    const rows = quotes.map((quote) => ({
      event_id: eventId,
      provider: quote.sourceProvider ?? "normalized",
      bookmaker: quote.bookmaker,
      market_key: quote.marketId,
      selection_key: quote.selection.id,
      selection_label: quote.selection.label,
      line: quote.selection.line,
      decimal_odds: quote.decimalOdds,
      captured_at: quote.capturedAt,
      provider_last_update: quote.providerLastUpdate,
      liquidity: quote.liquidity,
      suspended: quote.suspended,
      raw: quote.raw,
    }));

    await this.request(
      "/market_quotes",
      { method: "POST", body: JSON.stringify(rows) },
      "return=minimal",
    );
    return rows.length;
  }

  async appendEvidence(eventId: string, evidence: Evidence[]): Promise<number> {
    if (evidence.length === 0) return 0;

    const rows = evidence.map((item) => ({
      event_id: eventId,
      kind: item.kind,
      title: item.title,
      payload: item.value == null ? null : { value: item.value },
      source_provider: item.source,
      reliability: item.reliability,
      captured_at: item.capturedAt,
    }));

    await this.request(
      "/evidence_items",
      { method: "POST", body: JSON.stringify(rows) },
      "return=minimal",
    );
    return rows.length;
  }

  async appendFeatureSnapshot(input: {
    eventId: string;
    version: string;
    features: Record<string, unknown>;
    capturedAt: string;
  }): Promise<string> {
    const rows = await this.request<Array<{ id: string }>>(
      "/feature_snapshots",
      {
        method: "POST",
        body: JSON.stringify({
          event_id: input.eventId,
          feature_version: input.version,
          features: input.features,
          captured_at: input.capturedAt,
        }),
      },
      "return=representation",
    );

    if (!rows[0]?.id) throw new Error("Feature snapshot insert returned no id.");
    return rows[0].id;
  }

  async appendPrediction(input: PredictionRecord): Promise<string> {
    const rows = await this.request<Array<{ id: string }>>(
      "/prediction_snapshots",
      {
        method: "POST",
        body: JSON.stringify({
          event_id: input.eventId,
          feature_snapshot_id: input.featureSnapshotId,
          market_key: input.marketKey,
          selection_key: input.selectionKey,
          fair_probability: input.fairProbability,
          fair_odds: input.fairOdds,
          model_agreement: input.modelAgreement,
          uncertainty: input.uncertainty,
          model_signals: input.modelSignals,
          captured_at: input.capturedAt,
        }),
      },
      "return=representation",
    );

    if (!rows[0]?.id) throw new Error("Prediction insert returned no id.");
    return rows[0].id;
  }

  async appendDecision(
    entry: DecisionLedgerEntry & {
      predictionSnapshotId: string;
      decisionMode: string;
      immutableFingerprint: string;
    },
  ): Promise<void> {
    await this.request(
      "/decision_ledger",
      {
        method: "POST",
        body: JSON.stringify({
          event_id: entry.eventId,
          prediction_snapshot_id: entry.predictionSnapshotId,
          market_key: entry.marketId,
          selection_key: entry.selectionId,
          selection_line: entry.selectionLine,
          selection_side: entry.selectionSide,
          decision: entry.decision,
          decision_mode: entry.decisionMode,
          market_odds: entry.marketOdds,
          fair_probability: entry.fairProbability,
          opportunity_score: entry.opportunityScore,
          captured_at: entry.capturedAt,
          immutable_fingerprint: entry.immutableFingerprint,
          model_version_set: entry.modelVersionSet,
        }),
      },
      "return=minimal",
    );
  }

  async findUnsettledDecisions(eventId: string): Promise<UnsettledDecision[]> {
    const query = new URLSearchParams();
    query.set("event_id", `eq.${eventId}`);
    query.set(
      "select",
      "decision_id,event_id,sport,market_key,selection_key,selection_line,selection_side,captured_at,market_odds,fair_probability",
    );

    const rows = await this.request<Array<{
      decision_id: string;
      event_id: string;
      sport: UnsettledDecision["sport"];
      market_key: string;
      selection_key: string;
      selection_line?: number | null;
      selection_side?: UnsettledDecision["selectionSide"] | null;
      captured_at: string;
      market_odds: number;
      fair_probability: number;
    }>>(
      `/veto_unsettled_decisions?${query.toString()}`,
      { method: "GET" },
    );

    return rows.map((row) => ({
      decisionId: row.decision_id,
      eventId: row.event_id,
      sport: row.sport,
      marketKey: row.market_key,
      selectionKey: row.selection_key,
      selectionLine: row.selection_line ?? undefined,
      selectionSide: row.selection_side ?? undefined,
      capturedAt: row.captured_at,
      marketOdds: Number(row.market_odds),
      fairProbability: Number(row.fair_probability),
    }));
  }

  async appendDecisionOutcome(outcome: DecisionOutcomeRecord): Promise<void> {
    await this.request(
      "/decision_outcomes",
      {
        method: "POST",
        body: JSON.stringify({
          decision_id: outcome.decisionId,
          result: outcome.result,
          closing_odds: outcome.closingOdds,
          settled_at: outcome.settledAt,
          raw_outcome: outcome.rawOutcome,
        }),
      },
      "return=minimal",
    );
  }

  async recordHistoricalImport(record: HistoricalImportRecord): Promise<void> {
    await this.request(
      "/historical_imports",
      {
        method: "POST",
        body: JSON.stringify({
          provider: record.provider,
          dataset_kind: record.datasetKind,
          sport: record.sport,
          competition: record.competition,
          from_at: record.fromAt,
          to_at: record.toAt,
          rows_imported: record.rowsImported,
          checksum: record.checksum,
          metadata: record.metadata,
        }),
      },
      "return=minimal",
    );
  }

  async appendProviderHealth(sample: ProviderHealthSample): Promise<void> {
    await this.request(
      "/provider_health_samples",
      {
        method: "POST",
        body: JSON.stringify({
          provider_id: sample.providerId,
          status: sample.status,
          checked_at: sample.checkedAt,
          latency_ms: sample.latencyMs,
          freshness_seconds: sample.freshnessSeconds,
          quota_remaining: sample.quotaRemaining,
          message: sample.message,
          metadata: sample.metadata,
        }),
      },
      "return=minimal",
    );
  }
}
