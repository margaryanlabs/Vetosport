-- Preserve exact market semantics required for deterministic settlement.

alter table decision_ledger
  add column if not exists selection_line numeric,
  add column if not exists selection_side text;

alter table decision_ledger
  drop constraint if exists decision_ledger_selection_side_check;

alter table decision_ledger
  add constraint decision_ledger_selection_side_check
  check (
    selection_side is null or
    selection_side in ('home','away','yes','no','over','under','draw')
  );

create or replace view veto_backtest_rows as
select
  dl.id as decision_id,
  dl.event_id,
  se.sport,
  se.competition_name as competition,
  dl.market_key,
  dl.selection_key,
  dl.selection_line,
  dl.selection_side,
  dl.captured_at as prediction_at,
  se.starts_at as event_starts_at,
  do.settled_at,
  dl.model_version_set,
  dl.decision_mode,
  dl.decision,
  dl.fair_probability,
  dl.market_odds as entry_odds,
  do.closing_odds,
  do.result,
  ps.model_agreement,
  ps.uncertainty
from decision_ledger dl
join sports_events se on se.id = dl.event_id
join prediction_snapshots ps on ps.id = dl.prediction_snapshot_id
join decision_outcomes do on do.decision_id = dl.id;
