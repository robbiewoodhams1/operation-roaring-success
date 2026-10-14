-- Checks for a freshly reset LOCAL database (migrations + supabase/seed.sql).
-- Each block raises on failure. Runners wrap this file in a transaction that
-- is rolled back, so the write probes below leave nothing behind.
--   pnpm db:replay --seed    (PGlite, no Docker)
--   pnpm db:check            (the local Supabase stack)
-- Not pgTAP: kept out of supabase/tests so `supabase test db` ignores it.

-- Schema invariants ----------------------------------------------------------
do $$
declare v text;
begin
  select string_agg(c.relname, ', ') into v
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relkind = 'r' and not c.relrowsecurity;
  if v is not null then raise exception 'RLS disabled on: %', v; end if;

  select string_agg(c.relname, ', ') into v
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relkind = 'r'
     and c.relname not in ('audit_logs', 'tenants', 'user_invitations', 'platform_settings', 'teams',
                           'user_team_memberships', 'performance_events', 'performance_tracking')
     and not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname = 'audit_' || c.relname);
  if v is not null then raise exception 'audit trigger missing on: %', v; end if;
end $$;

-- Seed shape -------------------------------------------------------------------
do $$
declare
  local_t constant uuid := '00000000-0000-4000-8000-000000000001';
  n int;
begin
  select count(*) into n from app.tenants;
  if n <> 2 then raise exception 'expected 2 tenants, got %', n; end if;

  select count(*) into n from app.users u join auth.users a on a.id = u.id and a.email = u.email;
  if n <> 17 or n <> (select count(*) from app.users) then
    raise exception 'every app.users row needs a matching auth.users row (matched %)', n;
  end if;

  select count(*) into n from app.customers where tenant_id = local_t;
  if n <> 120 then raise exception 'expected 120 customers, got %', n; end if;
  select count(*) into n from app.deals where tenant_id = local_t;
  if n <> 72 then raise exception 'expected 72 deals, got %', n; end if;
  select count(*) into n from app.provisioning where tenant_id = local_t;
  if n <> 72 then raise exception 'expected 72 provisioning records, got %', n; end if;
  select count(*) into n from app.provisioning_services where attempt = 2;
  if n <> 7 then raise exception 'expected 7 retry attempts, got %', n; end if;

  -- Only placeholder bank details exist.
  if exists (select 1 from app.deal_billing where sort_code is not null and sort_code <> '00-00-00') then
    raise exception 'non-placeholder sort code in seed data';
  end if;
end $$;

-- Customer normalisation trigger ----------------------------------------------
do $$
begin
  if exists (select 1 from app.customers where postcode ~ '\s' or postcode <> upper(postcode)) then
    raise exception 'postcodes were not normalised';
  end if;
  if exists (select 1 from app.customers where mobile !~ '^[0-9]+$') then
    raise exception 'mobiles were not normalised';
  end if;
  if exists (select 1 from app.customers where email = 'noemail@noemail.com') then
    raise exception 'placeholder email was not nulled';
  end if;
end $$;

-- Audit trail: writes made with app.current_user_id set are attributed ------
do $$
declare n int;
begin
  select count(*) into n from app.audit_logs
   where table_name = 'deals' and action = 'INSERT'
     and changed_by = '00000000-0000-4000-8000-000000000103';
  if n < 72 then raise exception 'deal inserts not audited with changed_by (got %)', n; end if;
end $$;

-- Stats Board ledger -----------------------------------------------------------
do $$
declare
  local_t constant uuid := '00000000-0000-4000-8000-000000000001';
  n int;
begin
  select count(*) into n from app.performance_events
   where tenant_id = local_t and event_type = 'deal_opened' and kind = 'award';
  if n <> 72 then raise exception 'expected 72 deal_opened awards, got %', n; end if;

  select count(*) into n from app.performance_events
   where tenant_id = local_t and event_type = 'deal_opened' and attribution = 'unattributed';
  if n <> 3 then raise exception 'expected 3 unattributed legacy deals, got %', n; end if;

  -- Retries share a subject: never more than one standing credit per service.
  if exists (select 1 from app.performance_events
              where event_type in ('service_applied', 'service_live')
              group by tenant_id, event_type, subject_key having sum(delta) not in (0, 1)) then
    raise exception 'a service subject has a net credit other than 0 or 1';
  end if;

  select count(*) into n from app.performance_events
   where event_type = 'service_live' and kind = 'reversal' and reason = 'status_changed_from_live';
  if n <> 7 then raise exception 'expected 7 live reversals, got %', n; end if;

  select sum(delta) into n from app.performance_events where event_type = 'router_dispatched';
  if n <> 15 then raise exception 'expected net 15 router dispatches, got %', n; end if;

  select count(*) into n from app.performance_events where reason = 'reopened';
  if n <> 2 then raise exception 'expected 2 reopen reversals (fault + to-do), got %', n; end if;

  -- Bob moved North → South 20 days ago; his credit follows the team he was in.
  if exists (select 1 from app.performance_events e
              where e.credited_user_id = '00000000-0000-4000-8000-000000000107'
                and e.team_id is distinct from case when e.occurred_at < now() - interval '20 days'
                                                    then '00000000-0000-4000-8000-0000000000a1'::uuid
                                                    else '00000000-0000-4000-8000-0000000000a2'::uuid end) then
    raise exception 'team attribution does not follow membership history';
  end if;
end $$;

-- Guard rails (rolled back) ----------------------------------------------------
do $$
begin
  begin
    update app.performance_events set reason = 'tampered' where true;
    raise exception 'performance_events accepted an UPDATE';
  exception when raise_exception then
    if sqlerrm not like '%append-only%' then raise; end if;
  end;

  begin
    insert into app.deals (tenant_id, customer_id, sales_agent, closing_agent, sales_agent_id, deal_type, deal_date, created_by)
    values ('00000000-0000-4000-8000-000000000001', md5('syn-customer-1')::uuid, 'x', 'x',
            '00000000-0000-4000-8000-000000000201', 'business', current_date, '00000000-0000-4000-8000-000000000101');
    raise exception 'a deal was credited to a user from another tenant';
  exception when raise_exception then
    if sqlerrm not like '%does not belong to tenant%' then raise; end if;
  end;

  -- The seed must refuse to run again on a database that has tenants.
  if not exists (select 1 from app.tenants) then
    raise exception 'seed guard precondition broken';
  end if;
end $$;
