-- Protect historical intelligence records from accidental rewriting.
-- Outcomes are stored in separate append/settlement tables, so old predictions
-- and decisions should never be edited after capture.

create or replace function veto_prevent_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'VETO history is append-only: % on % is not allowed', tg_op, tg_table_name;
end;
$$;

drop trigger if exists event_state_snapshots_no_update on event_state_snapshots;
create trigger event_state_snapshots_no_update
before update or delete on event_state_snapshots
for each row execute function veto_prevent_history_mutation();

drop trigger if exists market_quotes_no_update on market_quotes;
create trigger market_quotes_no_update
before update or delete on market_quotes
for each row execute function veto_prevent_history_mutation();

drop trigger if exists evidence_items_no_update on evidence_items;
create trigger evidence_items_no_update
before update or delete on evidence_items
for each row execute function veto_prevent_history_mutation();

drop trigger if exists feature_snapshots_no_update on feature_snapshots;
create trigger feature_snapshots_no_update
before update or delete on feature_snapshots
for each row execute function veto_prevent_history_mutation();

drop trigger if exists prediction_snapshots_no_update on prediction_snapshots;
create trigger prediction_snapshots_no_update
before update or delete on prediction_snapshots
for each row execute function veto_prevent_history_mutation();

drop trigger if exists decision_ledger_no_update on decision_ledger;
create trigger decision_ledger_no_update
before update or delete on decision_ledger
for each row execute function veto_prevent_history_mutation();
