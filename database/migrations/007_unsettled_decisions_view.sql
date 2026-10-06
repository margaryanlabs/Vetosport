-- Expose unsettled decisions for deterministic settlement workers.

create or replace view veto_unsettled_decisions as
select
  dl.id as decision_id,
  dl.event_id,
  se.sport,
  dl.market_key,
  dl.selection_key,
  dl.selection_line,
  dl.selection_side,
  dl.captured_at,
  dl.market_odds,
  dl.fair_probability
from decision_ledger dl
join sports_events se on se.id = dl.event_id
where not exists (
  select 1
  from decision_outcomes do
  where do.decision_id = dl.id
);
