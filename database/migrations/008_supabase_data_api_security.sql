-- Supabase 2026 Data API + RLS hardening.
-- VETO Sport runtime persistence is server-side only via service_role/secret key.
-- anon/authenticated must not access intelligence history directly.

-- Explicit grants are required for Data API visibility on newer Supabase projects.
grant usage on schema public to service_role;

grant select, insert, update, delete on table
  providers,
  sports_events,
  event_state_snapshots,
  market_quotes,
  evidence_items,
  feature_snapshots,
  prediction_snapshots,
  decision_ledger,
  decision_outcomes,
  provider_health_samples,
  historical_imports,
  backtest_runs,
  backtest_run_rows
to service_role;

grant usage, select on all sequences in schema public to service_role;

-- No direct browser/client access to intelligence persistence.
revoke all on table
  providers,
  sports_events,
  event_state_snapshots,
  market_quotes,
  evidence_items,
  feature_snapshots,
  prediction_snapshots,
  decision_ledger,
  decision_outcomes,
  provider_health_samples,
  historical_imports,
  backtest_runs,
  backtest_run_rows
from anon, authenticated;

-- RLS as defense in depth on every table in the exposed public schema.
alter table providers enable row level security;
alter table sports_events enable row level security;
alter table event_state_snapshots enable row level security;
alter table market_quotes enable row level security;
alter table evidence_items enable row level security;
alter table feature_snapshots enable row level security;
alter table prediction_snapshots enable row level security;
alter table decision_ledger enable row level security;
alter table decision_outcomes enable row level security;
alter table provider_health_samples enable row level security;
alter table historical_imports enable row level security;
alter table backtest_runs enable row level security;
alter table backtest_run_rows enable row level security;

-- Views should execute using caller permissions on Postgres 15+.
alter view veto_backtest_rows set (security_invoker = true);
alter view veto_unsettled_decisions set (security_invoker = true);

revoke all on veto_backtest_rows, veto_unsettled_decisions
from anon, authenticated;

grant select on veto_backtest_rows, veto_unsettled_decisions
to service_role;
