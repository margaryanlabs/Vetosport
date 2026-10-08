-- Read model for persisted live events used by MATCHES.
-- The production storage bridge applies SUPABASE_TABLE_PREFIX to this view.

create or replace view live_event_feed as
select
  e.id,
  e.canonical_key,
  e.sport,
  e.competition_name,
  e.starts_at,
  e.status,
  e.home_participant_id,
  e.home_participant_name,
  e.away_participant_id,
  e.away_participant_name,
  e.provider_refs,
  e.updated_at,
  s.captured_at as state_captured_at,
  s.source_provider as state_source_provider,
  s.source_latency_ms,
  s.state as latest_state,
  coalesce(q.quote_count, 0)::bigint as quote_count,
  coalesce(q.market_count, 0)::bigint as market_count,
  q.latest_quote_at,
  coalesce(d.decision_count, 0)::bigint as decision_count,
  d.latest_decision,
  d.latest_decision_at,
  d.latest_opportunity_score
from sports_events e
left join lateral (
  select
    ess.captured_at,
    ess.source_provider,
    ess.source_latency_ms,
    ess.state
  from event_state_snapshots ess
  where ess.event_id = e.id
  order by ess.captured_at desc
  limit 1
) s on true
left join lateral (
  select
    count(*) as quote_count,
    count(distinct (mq.market_key, mq.selection_key)) as market_count,
    max(mq.captured_at) as latest_quote_at
  from market_quotes mq
  where mq.event_id = e.id
) q on true
left join lateral (
  select
    count(*) as decision_count,
    (array_agg(dl.decision order by dl.captured_at desc))[1] as latest_decision,
    max(dl.captured_at) as latest_decision_at,
    (array_agg(dl.opportunity_score order by dl.captured_at desc))[1] as latest_opportunity_score
  from decision_ledger dl
  where dl.event_id = e.id
) d on true;

grant select on live_event_feed to service_role;
revoke all on live_event_feed from anon, authenticated;
