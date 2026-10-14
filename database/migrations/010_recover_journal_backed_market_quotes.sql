-- VETO Sport / 010 / Recover historical normalized market snapshots from the
-- immutable, source-attributed journal. This is an explicit one-time DML repair,
-- not a scheduler, synthetic market generator, forecast, or settlement.
--
-- Readiness verified on 2026-10-14:
--   provider 'api-football-live-odds', MARKET_QUOTE: 408 immutable rows
--   exact rows already in market_quotes: 83
--   missing journal-backed quote rows: 325
--   all 408 journal entries have a canonical event, numeric >1 quote,
--   source capturedAt, bookmaker, selection and real original payload.
--
-- Only replay *real observed* API-Football values with the original timestamps.
-- Never copy records from third-party datasets outside the governed journal.
-- Never rewrite, update, delete, or convert source timestamps to "now".
-- A replayed quote is HISTORICAL. It does not certify execution or edge.
--
-- This SQL is idempotent: exact existing quotes are skipped.
WITH source_entries AS (
  SELECT
    j.event_id,
    j.source_provider AS provider,
    j.payload ->> 'bookmaker' AS bookmaker,
    j.payload ->> 'marketId' AS market_key,
    j.payload #>> '{selection,id}' AS selection_key,
    j.payload #>> '{selection,label}' AS selection_label,
    CASE WHEN jsonb_typeof(j.payload #> '{selection,line}') = 'number'
      THEN (j.payload #>> '{selection,line}')::numeric
      ELSE NULL END AS line,
    (j.payload ->> 'decimalOdds')::numeric AS decimal_odds,
    (j.payload ->> 'capturedAt')::timestamptz AS captured_at,
    NULLIF(j.payload ->> 'providerLastUpdate','')::timestamptz
      AS provider_last_update,
    CASE WHEN jsonb_typeof(j.payload -> 'liquidity') = 'number'
      THEN (j.payload ->> 'liquidity')::numeric
      ELSE NULL END AS liquidity,
    CASE WHEN jsonb_typeof(j.payload -> 'suspended') = 'boolean'
      THEN (j.payload ->> 'suspended')::boolean
      ELSE NULL END AS suspended,
    j.payload -> 'raw' AS raw,
    j.record_hash
  FROM public.veto_sport_truth_journal AS j
  JOIN public.veto_sport_sports_events AS e ON e.id = j.event_id
  WHERE j.stream = 'MARKET_QUOTE'
    AND j.source_provider = 'api-football-live-odds'
    AND j.event_id IS NOT NULL
    AND j.payload ->> 'eventId' = j.event_id::text
    AND j.payload ->> 'bookmaker' IS NOT NULL
    AND j.payload ->> 'marketId' IS NOT NULL
    AND j.payload #>> '{selection,id}' IS NOT NULL
    AND j.payload #>> '{selection,label}' IS NOT NULL
    AND j.payload ->> 'capturedAt' IS NOT NULL
    AND jsonb_typeof(j.payload -> 'decimalOdds') = 'number'
    AND (j.payload ->> 'decimalOdds')::numeric > 1
),
unique_source AS (
  SELECT DISTINCT ON (
    event_id, provider, bookmaker, market_key,
    selection_key, decimal_odds, captured_at
  ) *
  FROM source_entries
  ORDER BY event_id, provider, bookmaker, market_key,
    selection_key, decimal_odds, captured_at, record_hash
),
recovered AS (
  INSERT INTO public.veto_sport_market_quotes (
    event_id, provider, bookmaker, market_key, selection_key,
    selection_label, line, decimal_odds, captured_at,
    provider_last_update, liquidity, suspended, raw
  )
  SELECT
    j.event_id, j.provider, j.bookmaker, j.market_key,
    j.selection_key, j.selection_label, j.line, j.decimal_odds,
    j.captured_at, j.provider_last_update, j.liquidity,
    j.suspended, j.raw
  FROM unique_source AS j
  WHERE NOT EXISTS (
    SELECT 1 FROM public.veto_sport_market_quotes AS q
    WHERE q.event_id = j.event_id
      AND q.provider = j.provider
      AND q.bookmaker = j.bookmaker
      AND q.market_key = j.market_key
      AND q.selection_key = j.selection_key
      AND q.decimal_odds = j.decimal_odds
      AND q.captured_at = j.captured_at
  )
  RETURNING event_id
)
SELECT count(*)::int AS journal_backfilled_quotes,
       count(DISTINCT event_id)::int AS recovered_event_count
FROM recovered;
