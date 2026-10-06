-- VETO Sport core persistence
-- PostgreSQL / Supabase compatible.
-- Append-only records are preferred for state, quotes, predictions and decisions.

create extension if not exists pgcrypto;

create table if not exists providers (
  id text primary key,
  kind text not null check (kind in ('sports','odds','exchange','news','weather')),
  name text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sports_events (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  sport text not null,
  competition_id text,
  competition_name text not null,
  starts_at timestamptz not null,
  status text not null,
  home_participant_id text,
  home_participant_name text,
  away_participant_id text,
  away_participant_name text,
  provider_refs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sports_events_sport_starts_at_idx
  on sports_events (sport, starts_at desc);

create table if not exists event_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references sports_events(id) on delete cascade,
  captured_at timestamptz not null,
  source_provider text not null,
  state jsonb not null,
  source_latency_ms integer,
  fingerprint text,
  created_at timestamptz not null default now(),
  unique (event_id, captured_at, source_provider)
);

create index if not exists event_state_event_time_idx
  on event_state_snapshots (event_id, captured_at desc);

create table if not exists market_quotes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references sports_events(id) on delete cascade,
  provider text not null,
  bookmaker text not null,
  market_key text not null,
  selection_key text not null,
  selection_label text not null,
  line numeric,
  decimal_odds numeric not null check (decimal_odds > 1),
  captured_at timestamptz not null,
  provider_last_update timestamptz,
  liquidity numeric,
  suspended boolean,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_quotes_lookup_idx
  on market_quotes (event_id, market_key, selection_key, captured_at desc);

create index if not exists market_quotes_bookmaker_time_idx
  on market_quotes (bookmaker, captured_at desc);

create table if not exists evidence_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references sports_events(id) on delete cascade,
  kind text not null,
  title text not null,
  payload jsonb,
  source_provider text not null,
  source_ref text,
  reliability numeric not null check (reliability between 0 and 1),
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists evidence_event_time_idx
  on evidence_items (event_id, captured_at desc);

create table if not exists feature_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references sports_events(id) on delete cascade,
  feature_version text not null,
  features jsonb not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists feature_snapshot_event_time_idx
  on feature_snapshots (event_id, captured_at desc);

create table if not exists prediction_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references sports_events(id) on delete cascade,
  feature_snapshot_id uuid not null references feature_snapshots(id),
  market_key text not null,
  selection_key text not null,
  fair_probability numeric not null check (fair_probability > 0 and fair_probability < 1),
  fair_odds numeric not null check (fair_odds > 1),
  model_agreement numeric not null check (model_agreement between 0 and 100),
  uncertainty numeric not null check (uncertainty between 0 and 1),
  model_signals jsonb not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists prediction_event_market_time_idx
  on prediction_snapshots (event_id, market_key, selection_key, captured_at desc);

create table if not exists decision_ledger (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references sports_events(id) on delete cascade,
  prediction_snapshot_id uuid not null references prediction_snapshots(id),
  market_key text not null,
  selection_key text not null,
  decision text not null check (decision in ('EDGE','WATCH','PASS')),
  decision_mode text not null,
  market_odds numeric not null,
  fair_probability numeric not null,
  opportunity_score numeric not null,
  captured_at timestamptz not null,
  immutable_fingerprint text not null,
  created_at timestamptz not null default now()
);

create index if not exists decision_ledger_event_time_idx
  on decision_ledger (event_id, captured_at desc);

create table if not exists decision_outcomes (
  decision_id uuid primary key references decision_ledger(id) on delete cascade,
  result text not null check (result in ('win','loss','push','void')),
  closing_odds numeric,
  settled_at timestamptz not null,
  raw_outcome jsonb,
  created_at timestamptz not null default now()
);

create table if not exists provider_health_samples (
  id bigserial primary key,
  provider_id text not null,
  status text not null check (status in ('healthy','degraded','offline')),
  checked_at timestamptz not null,
  latency_ms integer,
  freshness_seconds integer,
  quota_remaining bigint,
  message text,
  metadata jsonb
);

create index if not exists provider_health_time_idx
  on provider_health_samples (provider_id, checked_at desc);

-- Ledger protection: UPDATE / DELETE should be denied at the application role level.
-- In Supabase, add RLS policies so ordinary runtime roles can INSERT/SELECT only.
