-- VETO Sport / 011 / server-only, forward-only, shared research paper account
-- The values are simulated USD, never financial assets or a betting account.
-- This project's tables use prefix veto_sport_ (check exact destination).
-- Capture only after deployment of read/write code and from the actual cron.
create table if not exists public.veto_sport_paper_daily_picks (
 id uuid primary key default gen_random_uuid(),
 protocol text not null check (protocol = 'veto.paper.forward-observed.v1'),
 event_id uuid not null references public.veto_sport_sports_events(id) on delete restrict,
 event_starts_at timestamptz not null,
 day_utc date not null,
 daily_slot smallint not null check (daily_slot between 1 and 3),
 match text not null check (length(match) between 3 and 240),
 competition text not null check (length(competition) between 1 and 180),
 contract text not null check (contract in ('FT_HOME','FT_AWAY','FT_DRAW','FT_BTTS_YES','FT_BTTS_NO')),
 market_key text not null,
 selection_key text not null,
 decimal_odds numeric(12,4) not null check (decimal_odds > 1 and decimal_odds <= 20),
 virtual_stake numeric(12,2) not null check (virtual_stake = 4.00),
 model_probability numeric(10,7) not null check (model_probability > 0 and model_probability < 1),
 model_version text not null check (length(model_version) between 1 and 90),
 quote_provider text not null,
 bookmaker text not null,
 quote_at timestamptz not null,
 provider_updated_at timestamptz not null,
 state_at timestamptz not null,
 model_at timestamptz not null,
 picked_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique (protocol,event_id),
 unique (protocol,day_utc,daily_slot),
 check (quote_at <= picked_at and provider_updated_at <= quote_at
   and state_at <= picked_at and model_at <= quote_at),
 check (day_utc = (picked_at at time zone 'utc')::date)
);
create index if not exists veto_sport_paper_daily_picks_when_idx
 on public.veto_sport_paper_daily_picks (picked_at desc);
create table if not exists public.veto_sport_paper_daily_settlements (
 id uuid primary key default gen_random_uuid(),
 pick_id uuid not null unique references public.veto_sport_paper_daily_picks(id) on delete restrict,
 event_id uuid not null references public.veto_sport_sports_events(id) on delete restrict,
 result text not null check (result in ('WIN','LOSS')),
 home_goals smallint not null check (home_goals between 0 and 40),
 away_goals smallint not null check (away_goals between 0 and 40),
 provider text not null check (provider = 'api-football'),
 final_at timestamptz not null,
 settled_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 check (settled_at >= final_at)
);
create index if not exists veto_sport_paper_daily_settlements_event_idx
 on public.veto_sport_paper_daily_settlements (event_id, settled_at desc);
-- Explicit server-side-only Data API permission and RLS.
alter table public.veto_sport_paper_daily_picks enable row level security;
alter table public.veto_sport_paper_daily_settlements enable row level security;
revoke all on public.veto_sport_paper_daily_picks,
 public.veto_sport_paper_daily_settlements from anon, authenticated;
grant select, insert on public.veto_sport_paper_daily_picks,
 public.veto_sport_paper_daily_settlements to service_role;
-- Preserve research history permanently: never rewrite a past choice or outcome.
create or replace function public.veto_sport_paper_daily_no_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
 raise exception 'FORWARD_PAPER_APPEND_ONLY';
end; $$;
revoke all on function public.veto_sport_paper_daily_no_mutation() from public,anon,authenticated;
drop trigger if exists veto_sport_paper_picks_append_only on public.veto_sport_paper_daily_picks;
create trigger veto_sport_paper_picks_append_only
 before update or delete on public.veto_sport_paper_daily_picks
 for each row execute function public.veto_sport_paper_daily_no_mutation();
drop trigger if exists veto_sport_paper_settlements_append_only on public.veto_sport_paper_daily_settlements;
create trigger veto_sport_paper_settlements_append_only
 before update or delete on public.veto_sport_paper_daily_settlements
 for each row execute function public.veto_sport_paper_daily_no_mutation();
-- Reject backdated research entries even from a privileged writer. The public
-- PostgREST facade has no write routes. Also reject any already-finished event.
create or replace function public.veto_sport_paper_daily_capture_guard()
returns trigger language plpgsql set search_path=public as $$
declare event_status text; begin
 if abs(extract(epoch from (now()-new.picked_at))) > 120 then
  raise exception 'PAPER_PICK_TIMESTAMP_NOT_CURRENT';
 end if;
 if new.quote_at < new.picked_at-interval '120 seconds'
   or new.state_at < new.picked_at-interval '120 seconds'
   or new.model_at < new.picked_at-interval '120 seconds'
   or new.provider_updated_at < new.picked_at-interval '120 seconds' then
  raise exception 'PAPER_PICK_EVIDENCE_STALE';
 end if;
 select status into event_status from public.veto_sport_sports_events where id=new.event_id;
 if event_status is distinct from 'live' then
  raise exception 'PAPER_PICK_NOT_LIVE';
 end if;
 return new;
end; $$;
revoke all on function public.veto_sport_paper_daily_capture_guard() from public,anon,authenticated;
drop trigger if exists veto_sport_paper_capture_guard on public.veto_sport_paper_daily_picks;
create trigger veto_sport_paper_capture_guard
 before insert on public.veto_sport_paper_daily_picks
 for each row execute function public.veto_sport_paper_daily_capture_guard();
