-- PARALLAX IX / Production Data Plane
-- Append-only bitemporal journal + versioned provider rulebooks.
-- This migration is committed but must be applied only to the dedicated
-- VETO Sport Supabase project once that project is selected.

create table if not exists truth_journal (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references sports_events(id) on delete restrict,
  source_provider text not null,
  source_record_id text not null,
  stream text not null check (
    stream in (
      'EVENT_STATE',
      'MARKET_QUOTE',
      'EVIDENCE',
      'RULEBOOK',
      'PROVIDER_HEALTH'
    )
  ),
  schema_version text not null,
  provider_sequence text,
  semantic_key text,

  event_occurred_at timestamptz not null,
  source_emitted_at timestamptz not null,
  gateway_received_at timestamptz not null,
  normalized_at timestamptz not null,
  knowledge_available_at timestamptz not null,
  acquisition_mode text not null default 'LIVE'
    check (acquisition_mode in ('LIVE','HISTORICAL_BACKFILL')),
  committed_at timestamptz not null default clock_timestamp(),

  source_clock_offset_ms integer not null default 0,
  source_time_uncertainty_ms integer not null default 0
    check (source_time_uncertainty_ms >= 0),
  late_arrival boolean not null default false,

  correction_of_record_hash text,
  payload jsonb not null,
  payload_hash text not null,
  dedupe_key text not null unique,
  record_hash text not null unique,

  created_at timestamptz not null default clock_timestamp(),

  check (source_emitted_at <= gateway_received_at + make_interval(secs => 10)),
  check (normalized_at >= gateway_received_at)
);

create index if not exists truth_journal_event_receive_idx
  on truth_journal (event_id, gateway_received_at desc);

create index if not exists truth_journal_event_knowledge_idx
  on truth_journal (event_id, knowledge_available_at desc);

create index if not exists truth_journal_provider_receive_idx
  on truth_journal (source_provider, gateway_received_at desc);

create index if not exists truth_journal_stream_receive_idx
  on truth_journal (stream, gateway_received_at desc);

create index if not exists truth_journal_semantic_receive_idx
  on truth_journal (semantic_key, gateway_received_at desc)
  where semantic_key is not null;

create index if not exists truth_journal_correction_hash_idx
  on truth_journal (correction_of_record_hash)
  where correction_of_record_hash is not null;

create table if not exists provider_rulebook_versions (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  version_id text not null,
  sport text,
  effective_from timestamptz not null,
  effective_to timestamptz,
  captured_at timestamptz not null,
  source_ref text,
  content_hash text not null,
  rules jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (provider_id, version_id),
  unique (provider_id, content_hash),
  check (effective_to is null or effective_to > effective_from)
);

create index if not exists provider_rulebook_effective_idx
  on provider_rulebook_versions (
    provider_id,
    effective_from desc,
    effective_to
  );

-- Reuse the append-only guard introduced in migration 002.
drop trigger if exists truth_journal_no_update on truth_journal;
create trigger truth_journal_no_update
before update or delete on truth_journal
for each row execute function veto_prevent_history_mutation();

drop trigger if exists provider_rulebook_versions_no_update
  on provider_rulebook_versions;
create trigger provider_rulebook_versions_no_update
before update or delete on provider_rulebook_versions
for each row execute function veto_prevent_history_mutation();

-- Server-side only Data API exposure.
grant usage on schema public to service_role;

grant select, insert on table
  truth_journal,
  provider_rulebook_versions
to service_role;

revoke all on table
  truth_journal,
  provider_rulebook_versions
from anon, authenticated;

alter table truth_journal enable row level security;
alter table provider_rulebook_versions enable row level security;

-- Explicitly avoid browser access. Service role bypasses RLS server-side.
-- No anon/authenticated policies are intentionally created.
