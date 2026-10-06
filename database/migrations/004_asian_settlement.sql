-- Extend decision settlement for Asian quarter-line outcomes.

alter table decision_outcomes
  drop constraint if exists decision_outcomes_result_check;

alter table decision_outcomes
  add constraint decision_outcomes_result_check
  check (result in ('win','half_win','push','half_loss','loss','void'));
