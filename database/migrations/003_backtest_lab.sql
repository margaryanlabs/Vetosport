-- VETO Sport historical validation persistence

create table if not exists historical_imports (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  dataset_kind text not null,
  sport text not null,
  competition text,
  from_at timestamptz,
  to_at timestamptz,
  rows_imported bigint not null default 0,
  checksum text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists backtest_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model_version text not null,
  sport text,
  decision_mode text,
  filters jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb,
  input_rows integer not null,
  excluded_for_leakage integer not null default 0,
  metrics jsonb not null,
  segments jsonb,
  walk_forward jsonb,
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists backtest_runs_model_time_idx
  on backtest_runs (model_version, generated_at desc);

create table if not exists backtest_run_rows (
  backtest_run_id uuid not null references backtest_runs(id) on delete cascade,
  decision_id uuid references decision_ledger(id),
  event_id uuid references sports_events(id),
  market_key text not null,
  selection_key text not null,
  prediction_at timestamptz not null,
  event_starts_at timestamptz not null,
  settled_at timestamptz not null,
  fair_probability numeric not null,
  entry_odds numeric not null,
  closing_odds numeric,
  result text not null,
  row_metrics jsonb,
  primary key (backtest_run_id, market_key, selection_key, prediction_at)
);

create index if not exists backtest_rows_event_time_idx
  on backtest_run_rows (event_id, prediction_at desc);

-- Backtest results are evidence. Preserve them exactly as generated.
drop trigger if exists backtest_runs_no_update on backtest_runs;
create trigger backtest_runs_no_update
before update or delete on backtest_runs
for each row execute function veto_prevent_history_mutation();

drop trigger if exists historical_imports_no_update on historical_imports;
create trigger historical_imports_no_update
before update or delete on historical_imports
for each row execute function veto_prevent_history_mutation();
