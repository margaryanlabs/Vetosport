-- Extend full-time research contracts only for independently observed,
-- provider-explicitly defined half-goal Match Goals lines. Never include
-- quarter-goal Asian totals; push/half results need a different settlement.
alter table public.veto_sport_paper_daily_picks
 drop constraint if exists veto_sport_paper_daily_picks_contract_check;
alter table public.veto_sport_paper_daily_picks
 add constraint veto_sport_paper_daily_picks_contract_check
 check (contract in (
  'FT_HOME','FT_AWAY','FT_DRAW','FT_BTTS_YES','FT_BTTS_NO',
  'FT_TOTAL_OVER_1_5','FT_TOTAL_UNDER_1_5',
  'FT_TOTAL_OVER_2_5','FT_TOTAL_UNDER_2_5',
  'FT_TOTAL_OVER_3_5','FT_TOTAL_UNDER_3_5',
  'FT_TOTAL_OVER_4_5','FT_TOTAL_UNDER_4_5'
 ));
