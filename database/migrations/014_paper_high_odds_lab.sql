-- VETO Sport / 014 — separate longshot mathematical paper research account.
-- Financially nominal only. NEVER product-price a same-game combination as
-- an executable sportsbook parlay; this schema forbids duplicate event legs.
create table if not exists public.veto_sport_paper_high_odds_tickets(
 id uuid primary key default gen_random_uuid(),
 protocol text not null check(protocol='veto.paper.high-odds.cross-event.v1'),
 day_utc date not null,
 daily_slot smallint not null check(daily_slot between 1 and 3),
 band text not null check(band in('X10_20','X20_50','X50_PLUS')),
 legs jsonb not null check(jsonb_typeof(legs)='array' and jsonb_array_length(legs) between 2 and 4),
 synthetic_decimal_odds numeric(16,4) not null check(synthetic_decimal_odds between 10 and 10000),
 virtual_stake numeric(12,2) not null check(virtual_stake=1.00),
 captured_at timestamptz not null default now(),
 pricing text not null check(pricing='PRODUCT_OF_SINGLE_MARKET_PRICES_NOT_EXECUTABLE'),
 created_at timestamptz not null default now(),
 unique(protocol,day_utc,daily_slot),
 check(day_utc=(captured_at at time zone 'utc')::date)
);
create index if not exists veto_sport_high_odds_tickets_time_idx
 on public.veto_sport_paper_high_odds_tickets(captured_at desc);
create table if not exists public.veto_sport_paper_high_odds_settlements(
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null unique references public.veto_sport_paper_high_odds_tickets(id) on delete restrict,
 result text not null check(result in('WIN','LOSS')),
 proven_outcomes jsonb not null check(jsonb_typeof(proven_outcomes)='array'),
 settled_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.veto_sport_paper_high_odds_tickets enable row level security;
alter table public.veto_sport_paper_high_odds_settlements enable row level security;
revoke all on public.veto_sport_paper_high_odds_tickets,
 public.veto_sport_paper_high_odds_settlements from anon, authenticated;
grant select,insert on public.veto_sport_paper_high_odds_tickets,
 public.veto_sport_paper_high_odds_settlements to service_role;
create trigger veto_sport_high_odds_tickets_append_only
 before update or delete on public.veto_sport_paper_high_odds_tickets
 for each row execute function public.veto_sport_paper_daily_no_mutation();
create trigger veto_sport_high_odds_settlements_append_only
 before update or delete on public.veto_sport_paper_high_odds_settlements
 for each row execute function public.veto_sport_paper_daily_no_mutation();
-- Atomic and source-locked proof barrier. Prevent duplicate events within
-- one slip; allow repeating an event in a distinct slip only twice per day.
create or replace function public.veto_sport_high_odds_capture_guard()
returns trigger language plpgsql set search_path=public as $$
declare
 leg jsonb; eid uuid; eid_text text; event_status text;
 source_id text; start_at timestamptz; fair_count int:=0;
 price_product numeric:=1;
 previous_count int:=0;
begin
 perform pg_advisory_xact_lock(hashtext('veto_high_odds_'||new.day_utc::text));
 if abs(extract(epoch from(now()-new.captured_at)))>120
    then raise exception 'HIGH_ODDS_BACKDATING_FORBIDDEN'; end if;
 if (select count(*) from public.veto_sport_paper_high_odds_tickets
   where day_utc=new.day_utc)>=3 then raise exception 'HIGH_ODDS_DAILY_TICKET_LIMIT'; end if;
 for leg in select value from jsonb_array_elements(new.legs) loop
  eid_text:=leg->>'eventId';
  if eid_text is null or eid_text !~ '^[0-9a-f-]{36}$'
   then raise exception 'HIGH_ODDS_EVENT_ID_REQUIRED'; end if;
  eid:=eid_text::uuid;
  if (select count(*) from jsonb_array_elements(new.legs) j
      where j->>'eventId'=eid_text)>1
   then raise exception 'HIGH_ODDS_SAME_EVENT_COMBO_HAS_NO_BOOK_PRICE'; end if;
  select e.status,e.starts_at,e.provider_refs->>'the-odds-api'
    into event_status,start_at,source_id
    from public.veto_sport_sports_events e where e.id=eid;
  if event_status is distinct from 'scheduled' or
    source_id is null or source_id !~ '^[a-f0-9]{32}$' or
    start_at<new.captured_at+interval '30 minutes' or
    start_at>new.captured_at+interval '48 hours'
   then raise exception 'HIGH_ODDS_NOT_PREMATCH_NATIVE_EPL'; end if;
  if leg->>'provider'<>'the-odds-api' or
    leg->>'marketKey'<>'soccer_epl.h2h' or
    leg->>'contract' not in('FT_HOME','FT_DRAW','FT_AWAY') or
    length(coalesce(leg->>'bookmaker',''))<2
   then raise exception 'HIGH_ODDS_CONTRACT_NOT_SUPPORTED'; end if;
  if (leg->>'decimalOdds')::numeric <=1.01 or
     (leg->>'decimalOdds')::numeric >20 or
     (leg->>'quoteAt')::timestamptz >new.captured_at or
     (leg->>'quoteAt')::timestamptz <new.captured_at-interval '4 hours' or
     (leg->>'providerUpdatedAt')::timestamptz > (leg->>'quoteAt')::timestamptz or
     (leg->>'providerUpdatedAt')::timestamptz <new.captured_at-interval '4 hours'
   then raise exception 'HIGH_ODDS_QUOTE_PROOF_STALE'; end if;
  if not exists(
   select 1 from public.veto_sport_market_quotes q where
    q.event_id=eid and q.provider='the-odds-api' and
    q.bookmaker=leg->>'bookmaker' and q.market_key='soccer_epl.h2h' and
    q.selection_key=leg->>'selectionKey' and q.selection_label=leg->>'selectionLabel' and
    q.captured_at=(leg->>'quoteAt')::timestamptz and
    q.provider_last_update=(leg->>'providerUpdatedAt')::timestamptz and
    q.decimal_odds=(leg->>'decimalOdds')::numeric and q.suspended is distinct from true
   ) then raise exception 'HIGH_ODDS_SOURCE_QUOTE_NOT_FOUND'; end if;
  select count(*) into previous_count
   from public.veto_sport_paper_high_odds_tickets t,
     jsonb_array_elements(t.legs) existing_leg
    where t.day_utc=new.day_utc and existing_leg->>'eventId'=eid_text;
  if previous_count>=2 then raise exception 'HIGH_ODDS_FIXTURE_EXPOSURE_LIMIT'; end if;
  price_product:=price_product*(leg->>'decimalOdds')::numeric;
  fair_count:=fair_count+1;
 end loop;
 if fair_count!=jsonb_array_length(new.legs) or
    abs(price_product-new.synthetic_decimal_odds) > .000051
   then raise exception 'HIGH_ODDS_PRICE_PRODUCT_MISMATCH'; end if;
 if (new.band='X10_20' and not(new.synthetic_decimal_odds between 10 and 20))
  or (new.band='X20_50' and not(new.synthetic_decimal_odds between 20 and 50))
  or (new.band='X50_PLUS' and new.synthetic_decimal_odds<50)
  then raise exception 'HIGH_ODDS_RISK_CLASS_WRONG'; end if;
 return new;
end; $$;
revoke all on function public.veto_sport_high_odds_capture_guard() from public,anon,authenticated;
create trigger veto_sport_high_odds_capture_guard
 before insert on public.veto_sport_paper_high_odds_tickets
 for each row execute function public.veto_sport_high_odds_capture_guard();
-- Even a privileged client must present already stored exact-provider FT
-- snapshots and a complete 1:1 independent evidence set to write P&L.
create or replace function public.veto_sport_high_odds_settlement_guard()
returns trigger language plpgsql set search_path=public as $$
declare leg jsonb; evidence jsonb; t record; n int:=0; has_loss boolean:=false;
begin
 select legs,captured_at into t from public.veto_sport_paper_high_odds_tickets
 where id=new.ticket_id;
 if t.legs is null or jsonb_array_length(t.legs)!=jsonb_array_length(new.proven_outcomes)
  then raise exception 'HIGH_ODDS_UNVERIFIED_LEGS'; end if;
 for leg in select value from jsonb_array_elements(t.legs) loop
  select value into evidence from jsonb_array_elements(new.proven_outcomes)
    where value->>'eventId'=leg->>'eventId';
  if evidence is null or
     (select count(*) from jsonb_array_elements(new.proven_outcomes)
       where value->>'eventId'=leg->>'eventId')!=1 or
     evidence->>'provider'<>'the-odds-api' or
     (evidence->>'finalAt')::timestamptz<=t.captured_at or
     not exists(select 1 from public.veto_sport_event_state_snapshots ss
       where ss.event_id=(leg->>'eventId')::uuid and
        ss.source_provider='the-odds-api' and
        ss.state->>'source'='the-odds-api.scores' and
        ss.state->>'status'='finished' and
        ss.state->>'regulationTimeOnly'='true' and
        ss.state->'score'=evidence->'score' and
        ss.captured_at=(evidence->>'finalAt')::timestamptz)
    then raise exception 'HIGH_ODDS_PROVIDER_CERTIFICATE_NOT_FOUND'; end if;
  if (leg->>'contract'='FT_HOME' and
     (evidence->'score'->>'home')::int <=(evidence->'score'->>'away')::int)
   or (leg->>'contract'='FT_DRAW' and
     (evidence->'score'->>'home')::int !=(evidence->'score'->>'away')::int)
   or (leg->>'contract'='FT_AWAY' and
     (evidence->'score'->>'home')::int >=(evidence->'score'->>'away')::int)
   then has_loss:=true;
  end if;
  n:=n+1;
 end loop;
 if n!=jsonb_array_length(t.legs) or
   (has_loss and new.result<>'LOSS') or
   (not has_loss and new.result<>'WIN')
   then raise exception 'HIGH_ODDS_OUTCOME_MISMATCH'; end if;
 if abs(extract(epoch from(now()-new.settled_at)))>120
   then raise exception 'HIGH_ODDS_BACKDATED_SETTLEMENT'; end if;
 return new;
end; $$;
revoke all on function public.veto_sport_high_odds_settlement_guard() from public,anon,authenticated;
create trigger veto_sport_high_odds_settlement_guard
 before insert on public.veto_sport_paper_high_odds_settlements
 for each row execute function public.veto_sport_high_odds_settlement_guard();
