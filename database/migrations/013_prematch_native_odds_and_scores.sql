-- VETO Sport / 013 / Forward-only pre-kickoff market control lane and second
-- native-ID FT certifier. No bookmaker execution and no real funds.
alter table public.veto_sport_paper_daily_picks
 add column if not exists lane text not null default 'LIVE_OBSERVED'
 check (lane in ('LIVE_OBSERVED','PREMATCH_ODDS_CONTROL'));
alter table public.veto_sport_paper_daily_picks
 alter column state_at drop not null,
 alter column model_at drop not null;
alter table public.veto_sport_paper_daily_picks
 drop constraint if exists veto_sport_paper_daily_picks_lane_proof_check;
alter table public.veto_sport_paper_daily_picks
 add constraint veto_sport_paper_daily_picks_lane_proof_check check(
 (lane='LIVE_OBSERVED' and state_at is not null and model_at is not null)
 or (lane='PREMATCH_ODDS_CONTROL' and state_at is null and model_at is null)
 );
alter table public.veto_sport_paper_daily_settlements
 drop constraint if exists veto_sport_paper_daily_settlements_provider_check;
alter table public.veto_sport_paper_daily_settlements
 add constraint veto_sport_paper_daily_settlements_provider_check
 check (provider in ('api-football','the-odds-api'));
-- Replace source-only insert guard with separate, explicit LIVE and PREMATCH
-- proof rules. Do not derive live state from a pre-match quoted price.
create or replace function public.veto_sport_paper_daily_capture_guard()
returns trigger language plpgsql set search_path=public as $$
declare event_status text;
        kickoff timestamptz;
        external_fixture text;
begin
 if abs(extract(epoch from (now()-new.picked_at))) > 120 then
  raise exception 'PAPER_PICK_TIMESTAMP_NOT_CURRENT';
 end if;
 if new.quote_at > new.picked_at or new.provider_updated_at > new.quote_at then
  raise exception 'PAPER_PICK_POSTHOC_PRICE';
 end if;
 select status,starts_at,provider_refs->>'the-odds-api'
  into event_status,kickoff,external_fixture
  from public.veto_sport_sports_events where id=new.event_id;
 if new.lane='PREMATCH_ODDS_CONTROL' then
  if event_status is distinct from 'scheduled'
   or external_fixture is null or external_fixture !~ '^[a-f0-9]{32}$'
   or new.quote_provider<>'the-odds-api'
   or new.market_key<>'soccer_epl.h2h'
   or new.model_version<>'ODDS_PREMATCH_DEVIG_CONTROL_V1'
   or new.state_at is not null or new.model_at is not null then
    raise exception 'PAPER_PREMATCH_NATIVE_SOURCE_NOT_VALID';
  end if;
  if new.quote_at < new.picked_at-interval '4 hours'
    or new.provider_updated_at < new.picked_at-interval '4 hours'
    or kickoff<new.picked_at+interval '30 minutes'
    or kickoff>new.picked_at+interval '48 hours' then
    raise exception 'PAPER_PREMATCH_PROOF_STALE_OR_KICKOFF';
  end if;
 elsif new.lane='LIVE_OBSERVED' then
  if event_status is distinct from 'live'
   or new.state_at is null or new.model_at is null then
    raise exception 'PAPER_PICK_NOT_LIVE';
  end if;
  if new.quote_at < new.picked_at-interval '120 seconds'
    or new.state_at < new.picked_at-interval '120 seconds'
    or new.model_at < new.picked_at-interval '120 seconds'
    or new.provider_updated_at < new.picked_at-interval '120 seconds' then
    raise exception 'PAPER_PICK_EVIDENCE_STALE';
  end if;
 else
  raise exception 'PAPER_LANE_UNKNOWN';
 end if;
 return new;
end; $$;
revoke all on function public.veto_sport_paper_daily_capture_guard()
 from public,anon,authenticated;
