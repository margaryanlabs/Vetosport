-- VETO Sport / 015: independent second barrier for high odds PAPER truth.
-- Complements migration 014 append-only source verification. No real stakes.
create or replace function public.veto_sport_high_odds_deep_integrity()
returns trigger language plpgsql set search_path=public as $$
declare
 leg jsonb;
 proof jsonb;
 matched jsonb;
 fixture_id text;
 source_id text;
 actual_home int;
 actual_away int;
 computed_won boolean;
 expected_band_count int;
begin
 if tg_table_name='veto_sport_paper_high_odds_tickets' then
   expected_band_count:=case new.band
     when 'X10_20' then 2 when 'X20_50' then 3 when 'X50_PLUS' then 4 else -1 end;
   if jsonb_array_length(new.legs)!=expected_band_count then
     raise exception 'HIGH_ODDS_BAND_LEG_COUNT_MISMATCH';
   end if;
   -- A study priced by mixing same-game selections would be a fabricated
   -- product. Immutable source snapshots must represent DISTINCT matches.
   for leg in select value from jsonb_array_elements(new.legs) loop
     if coalesce(leg->>'eventId','')='' then
       raise exception 'HIGH_ODDS_LEG_EVENT_MISSING';
     end if;
     if (select count(*) from jsonb_array_elements(new.legs) j
          where j->>'eventId'=leg->>'eventId')!=1 then
       raise exception 'HIGH_ODDS_LEG_EVENT_COLLISION';
     end if;
   end loop;
   return new;
 end if;
 if tg_table_name='veto_sport_paper_high_odds_settlements' then
   select legs into proof from public.veto_sport_paper_high_odds_tickets where id=new.ticket_id;
   if proof is null or jsonb_array_length(proof)!=jsonb_array_length(new.proven_outcomes)
    then raise exception 'HIGH_ODDS_SETTLEMENT_PROOF_INCOMPLETE'; end if;
   for leg in select value from jsonb_array_elements(proof) loop
     fixture_id:=leg->>'eventId';
     select e.provider_refs->>'the-odds-api' into source_id
       from public.veto_sport_sports_events e where e.id=(fixture_id)::uuid;
     select value into matched from jsonb_array_elements(new.proven_outcomes)
       where value->>'eventId'=fixture_id;
     if matched is null or
       (select count(*) from jsonb_array_elements(new.proven_outcomes)
         where value->>'eventId'=fixture_id)!=1 or
       jsonb_typeof(matched->'score') is distinct from 'object'
       then raise exception 'HIGH_ODDS_PROOF_SHAPE_MISMATCH'; end if;
     if coalesce(source_id,'')='' or source_id !~ '^[a-f0-9]{32}$'
       or matched->>'provider'<>'the-odds-api' then
       raise exception 'HIGH_ODDS_WRONG_SCORE_PROVIDER'; end if;
     if coalesce(matched->'score'->>'home','') !~ '^(0|[1-9][0-9]?)$' or
        coalesce(matched->'score'->>'away','') !~ '^(0|[1-9][0-9]?)$'
       then raise exception 'HIGH_ODDS_INVALID_SCORE'; end if;
     actual_home:=(matched->'score'->>'home')::int;
     actual_away:=(matched->'score'->>'away')::int;
     if actual_home>40 or actual_away>40 then
       raise exception 'HIGH_ODDS_IMPOSSIBLE_SCORE'; end if;
     -- Unlike the minimum barrier, this verifies the EXACT provider event
     -- ID and the immutable source FT certificate, not merely matching score.
     if not exists(
       select 1 from public.veto_sport_event_state_snapshots ss
       where ss.event_id=(fixture_id)::uuid
         and ss.source_provider='the-odds-api'
         and ss.state->>'source'='the-odds-api.scores'
         and ss.state->>'status'='finished'
         and ss.state->>'regulationTimeOnly'='true'
         and ss.state->>'providerEventId'=source_id
         and ss.state->'score'=matched->'score'
         and ss.captured_at=(matched->>'finalAt')::timestamptz)
       then raise exception 'HIGH_ODDS_EXACT_FT_CERTIFICATE_NOT_FOUND'; end if;
     computed_won:=case leg->>'contract'
       when 'FT_HOME' then actual_home>actual_away
       when 'FT_AWAY' then actual_away>actual_home
       when 'FT_DRAW' then actual_home=actual_away
       else null end;
     if computed_won is null or
       jsonb_typeof(matched->'won') is distinct from 'boolean' or
       (matched->>'won')::boolean is distinct from computed_won
      then raise exception 'HIGH_ODDS_INCORRECT_LEG_RESULT'; end if;
   end loop;
   if (new.result='WIN') != (
        select bool_and((x->>'won')::boolean)
        from jsonb_array_elements(new.proven_outcomes) x)
     then raise exception 'HIGH_ODDS_INCORRECT_COMBINED_RESULT'; end if;
   return new;
 end if;
 return new;
end; $$;
revoke all on function public.veto_sport_high_odds_deep_integrity()
 from public,anon,authenticated;
drop trigger if exists veto_sport_high_odds_deep_ticket_check
 on public.veto_sport_paper_high_odds_tickets;
create trigger veto_sport_high_odds_deep_ticket_check
 before insert on public.veto_sport_paper_high_odds_tickets
 for each row execute function public.veto_sport_high_odds_deep_integrity();
drop trigger if exists veto_sport_high_odds_deep_settle_check
 on public.veto_sport_paper_high_odds_settlements;
create trigger veto_sport_high_odds_deep_settle_check
 before insert on public.veto_sport_paper_high_odds_settlements
 for each row execute function public.veto_sport_high_odds_deep_integrity();
