-- 0002 — Performance statistics: stable attribution, teams, append-only events.
--
-- Formerly packages/db/migrations/0002_performance_stats.sql. Applied manually
-- to Staging (gqkugpjmguufavbladxt) on 2026-10-13, before this history existed;
-- NOT applied to Production. See docs/STATS.md for the metric definitions and
-- docs/decisions/003-*.md for why credit events are written by triggers.
--
-- Every object is created with IF NOT EXISTS / OR REPLACE, so it is safe on a
-- database that already has it. The original explicit BEGIN/COMMIT was removed:
-- the Supabase CLI applies each migration file atomically together with its
-- schema_migrations row, and an inner COMMIT would split that transaction.
--
-- Nothing here rewrites existing business data. Legacy free-text agent names
-- stay as they are; the new *_id columns start NULL and historical credit is
-- backfilled as "unattributed" unless a stable id already exists.

-- ─── Actor ──────────────────────────────────────────────────────────────────
-- The user the app declared for this transaction via setAuditUser(). Returns
-- NULL for direct SQL / imports, and for ids that are not real users, so a
-- bad setting can never break a business write through a foreign key.
create or replace function app.current_actor() returns uuid
  language plpgsql stable
  set search_path = app, pg_temp
as $$
declare
  v uuid;
begin
  begin
    v := nullif(current_setting('app.current_user_id', true), '')::uuid;
  exception when others then
    return null;
  end;
  if v is null or not exists (select 1 from app.users where id = v) then
    return null;
  end if;
  return v;
end
$$;

-- ─── Teams ──────────────────────────────────────────────────────────────────
create table if not exists app.teams (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references app.tenants (id) on delete restrict,
  name       text not null check (length(btrim(name)) between 1 and 80),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists teams_tenant_name_key on app.teams (tenant_id, lower(btrim(name)));

-- Membership history. users.team_id is the current pointer; this table is the
-- record of which team someone was in at any moment, so moving a person never
-- rewrites a team's past results.
create table if not exists app.user_team_memberships (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references app.tenants (id),
  user_id    uuid not null references app.users (id) on delete cascade,
  team_id    uuid not null references app.teams (id),
  valid_from timestamptz not null default now(),
  valid_to   timestamptz,
  changed_by uuid references app.users (id),
  constraint user_team_memberships_period check (valid_to is null or valid_to > valid_from)
);
create unique index if not exists user_team_memberships_one_open
  on app.user_team_memberships (user_id) where valid_to is null;
create index if not exists user_team_memberships_user_from on app.user_team_memberships (user_id, valid_from);
create index if not exists user_team_memberships_team_from on app.user_team_memberships (team_id, valid_from);

alter table app.users add column if not exists team_id uuid references app.teams (id);
create index if not exists users_team_id_idx on app.users (team_id);

create or replace function app.sync_team_membership() returns trigger
  language plpgsql security definer
  set search_path = app, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.team_id is not distinct from old.team_id then
    return new;
  end if;
  if new.team_id is not null
     and not exists (select 1 from app.teams t where t.id = new.team_id and t.tenant_id = new.tenant_id) then
    raise exception 'team % does not belong to tenant %', new.team_id, new.tenant_id;
  end if;

  -- A membership opened earlier in this same transaction never became visible;
  -- drop it rather than closing it with a zero-length period.
  delete from app.user_team_memberships
   where user_id = new.id and valid_to is null and valid_from = now();
  update app.user_team_memberships
     set valid_to = now()
   where user_id = new.id and valid_to is null;

  if new.team_id is not null then
    insert into app.user_team_memberships (tenant_id, user_id, team_id, valid_from, changed_by)
    values (new.tenant_id, new.id, new.team_id, now(), app.current_actor());
  end if;
  return new;
end
$$;

drop trigger if exists sync_team_membership on app.users;
create trigger sync_team_membership
  after insert or update of team_id on app.users
  for each row execute function app.sync_team_membership();

create or replace function app.team_at(p_user uuid, p_at timestamptz) returns uuid
  language sql stable
  set search_path = app, pg_temp
as $$
  select m.team_id
    from app.user_team_memberships m
   where m.user_id = p_user
     and m.valid_from <= p_at
     and (m.valid_to is null or m.valid_to > p_at)
   order by m.valid_from desc
   limit 1
$$;

-- ─── Stable attribution columns ─────────────────────────────────────────────
alter table app.deals
  add column if not exists sales_agent_id   uuid references app.users (id),
  add column if not exists closing_agent_id uuid references app.users (id),
  add column if not exists submission_key   uuid;

-- One deal per deal-sheet submission: a double-click or network retry reuses
-- the same key and is rejected here even if two requests race.
create unique index if not exists deals_tenant_submission_key
  on app.deals (tenant_id, submission_key) where submission_key is not null;
create index if not exists deals_tenant_deal_date on app.deals (tenant_id, deal_date);
create index if not exists deals_sales_agent_id_idx on app.deals (sales_agent_id);
create index if not exists deals_closing_agent_id_idx on app.deals (closing_agent_id);

alter table app.provisioning
  add column if not exists provisioner_user_id     uuid references app.users (id),
  add column if not exists router_assigned_user_id uuid references app.users (id),
  add column if not exists updated_by              uuid references app.users (id);
create index if not exists provisioning_provisioner_user_id_idx on app.provisioning (provisioner_user_id);
create index if not exists provisioning_router_assigned_user_id_idx on app.provisioning (router_assigned_user_id);

alter table app.provisioning_services
  add column if not exists updated_by uuid references app.users (id);
create index if not exists provisioning_services_prov_type_idx
  on app.provisioning_services (provisioning_id, service_type);

-- Referenced users must belong to the row's tenant, and the recorded editor /
-- deal creator always comes from the session the app declared — a client
-- payload can't put someone else's id there.
create or replace function app.enforce_attribution() returns trigger
  language plpgsql
  set search_path = app, pg_temp
as $$
declare
  v_actor uuid := app.current_actor();
  v_ids   uuid[];
  v_id    uuid;
begin
  if tg_table_name = 'deals' then
    v_ids := array[new.sales_agent_id, new.closing_agent_id];
    if tg_op = 'INSERT' and v_actor is not null then
      new.created_by := v_actor;
    end if;
  elsif tg_table_name = 'provisioning' then
    v_ids := array[new.provisioner_user_id, new.router_assigned_user_id];
    new.updated_by := v_actor;
  else
    new.updated_by := v_actor;
    return new;
  end if;

  foreach v_id in array v_ids loop
    if v_id is not null
       and not exists (select 1 from app.users u where u.id = v_id and u.tenant_id = new.tenant_id) then
      raise exception 'user % does not belong to tenant %', v_id, new.tenant_id;
    end if;
  end loop;
  return new;
end
$$;

drop trigger if exists enforce_attribution on app.deals;
create trigger enforce_attribution before insert or update on app.deals
  for each row execute function app.enforce_attribution();
drop trigger if exists enforce_attribution on app.provisioning;
create trigger enforce_attribution before insert or update on app.provisioning
  for each row execute function app.enforce_attribution();
drop trigger if exists enforce_attribution on app.provisioning_services;
create trigger enforce_attribution before insert or update on app.provisioning_services
  for each row execute function app.enforce_attribution();

-- ─── Performance events ─────────────────────────────────────────────────────
create table if not exists app.performance_events (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references app.tenants (id),
  event_type        text not null check (event_type in (
                      'deal_opened', 'deal_closed',
                      'service_applied', 'service_live',
                      'router_dispatched', 'welcome_call_logged',
                      'fault_resolved', 'complaint_closed', 'debt_closed',
                      'transfer_completed', 'cease_completed', 'todo_completed')),
  kind              text not null check (kind in ('award', 'reversal')),
  delta             smallint generated always as (case when kind = 'award' then 1 else -1 end) stored,
  sequence          integer not null check (sequence >= 1),
  source_type       text not null,
  source_id         uuid not null,
  -- What the credit is for. Retries of a service share one subject, so a
  -- second attempt can never earn a second "applied" or "live" credit.
  subject_key       text not null,
  service_type      text,
  service_group     text check (service_group in ('broadband', 'voice', 'mobile')),
  detail            jsonb not null default '{}'::jsonb,
  credited_user_id  uuid references app.users (id),
  actor_user_id     uuid references app.users (id),
  team_id           uuid references app.teams (id),
  attribution       text not null check (attribution in ('recorded', 'unattributed')),
  origin            text not null default 'live' check (origin in ('live', 'backfill')),
  -- When it happened, and which reporting period the +1/-1 counts in. They
  -- differ only for reversals, which net against the period of the award.
  occurred_at       timestamptz not null,
  effective_at      timestamptz not null,
  -- Wall-clock insertion time (not transaction time), so an award and its
  -- reversal written in one transaction keep their real order.
  recorded_at       timestamptz not null default clock_timestamp(),
  idempotency_key   text not null,
  reverses_event_id uuid references app.performance_events (id),
  reason            text,
  constraint performance_events_idempotency unique (tenant_id, idempotency_key),
  constraint performance_events_reversal_target check ((kind = 'reversal') = (reverses_event_id is not null))
);

create index if not exists performance_events_tenant_effective
  on app.performance_events (tenant_id, effective_at);
create index if not exists performance_events_credited_effective
  on app.performance_events (tenant_id, credited_user_id, effective_at);
create index if not exists performance_events_team_effective
  on app.performance_events (tenant_id, team_id, effective_at);
create index if not exists performance_events_subject
  on app.performance_events (tenant_id, event_type, subject_key);
create index if not exists performance_events_source
  on app.performance_events (source_type, source_id);
alter table app.performance_events alter column recorded_at set default clock_timestamp();

-- Activity feed: newest first, keyset-paginated on (occurred_at, recorded_at, id).
drop index if exists app.performance_events_tenant_occurred;
create index if not exists performance_events_feed
  on app.performance_events (tenant_id, occurred_at desc, recorded_at desc, id desc);
create index if not exists performance_events_actor on app.performance_events (actor_user_id);
create index if not exists performance_events_reverses on app.performance_events (reverses_event_id);

create or replace function app.performance_events_append_only() returns trigger
  language plpgsql
as $$
begin
  raise exception 'app.performance_events is append-only; record a reversal instead';
end
$$;

drop trigger if exists append_only on app.performance_events;
create trigger append_only before update or delete on app.performance_events
  for each row execute function app.performance_events_append_only();
drop trigger if exists append_only_truncate on app.performance_events;
create trigger append_only_truncate before truncate on app.performance_events
  for each statement execute function app.performance_events_append_only();

-- Tracking coverage per tenant: live recording is complete from live_from;
-- anything earlier is backfilled history with the gaps the report describes.
create table if not exists app.performance_tracking (
  tenant_id       uuid primary key references app.tenants (id),
  live_from       timestamptz not null default now(),
  backfilled_at   timestamptz,
  backfill_report jsonb
);

create or replace function app.service_group(p_service_type text) returns text
  language sql immutable
as $$
  select case p_service_type
           when 'bb' then 'broadband'
           when 'mpf_broadband' then 'broadband'
           when 'whc' then 'voice'
           when 'mpf_voice' then 'voice'
           when 'nfon' then 'voice'
           when 'mobile' then 'mobile'
         end
$$;

-- The only way events are written. Award only when the subject has no
-- standing credit; reverse only when it does. The reversal copies the award's
-- credited user and team, so personal and team totals both net to zero.
-- Returns the new event id, or NULL when nothing needed recording.
create or replace function app.record_performance_event(
  p_tenant       uuid,
  p_event_type   text,
  p_kind         text,
  p_source_type  text,
  p_source_id    uuid,
  p_subject_key  text,
  p_credited     uuid,
  p_occurred_at  timestamptz,
  p_service_type text default null,
  p_detail       jsonb default '{}'::jsonb,
  p_origin       text default 'live',
  p_actor        uuid default null,
  p_reason       text default null,
  p_effective_at timestamptz default null
) returns uuid
  language plpgsql security definer
  set search_path = app, pg_temp
as $$
declare
  v_net       integer;
  v_seq       integer;
  v_award     app.performance_events%rowtype;
  v_credited  uuid;
  v_team      uuid;
  v_effective timestamptz;
  v_id        uuid;
begin
  if p_tenant is null then
    return null;
  end if;

  -- Serialise concurrent writers on the same subject inside their transactions.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant::text || '|' || p_event_type || '|' || p_subject_key, 0));

  select coalesce(sum(delta), 0) into v_net
    from app.performance_events
   where tenant_id = p_tenant and event_type = p_event_type and subject_key = p_subject_key;

  if p_kind = 'award' then
    if v_net >= 1 then
      return null;
    end if;
    v_credited  := p_credited;
    v_team      := case when p_credited is null then null else app.team_at(p_credited, p_occurred_at) end;
    v_effective := coalesce(p_effective_at, p_occurred_at);
  elsif p_kind = 'reversal' then
    if v_net <= 0 then
      return null;
    end if;
    select * into v_award
      from app.performance_events
     where tenant_id = p_tenant and event_type = p_event_type and subject_key = p_subject_key and kind = 'award'
     order by sequence desc
     limit 1;
    v_credited  := v_award.credited_user_id;
    v_team      := v_award.team_id;
    v_effective := coalesce(p_effective_at, v_award.effective_at);
  else
    raise exception 'unknown event kind %', p_kind;
  end if;

  select count(*) + 1 into v_seq
    from app.performance_events
   where tenant_id = p_tenant and event_type = p_event_type and subject_key = p_subject_key and kind = p_kind;

  insert into app.performance_events (
    tenant_id, event_type, kind, sequence, source_type, source_id, subject_key,
    service_type, service_group, detail, credited_user_id, actor_user_id, team_id,
    attribution, origin, occurred_at, effective_at, idempotency_key, reverses_event_id, reason
  ) values (
    p_tenant, p_event_type, p_kind, v_seq, p_source_type, p_source_id, p_subject_key,
    p_service_type, app.service_group(p_service_type), coalesce(p_detail, '{}'::jsonb),
    v_credited, case when p_origin = 'live' then app.current_actor() else p_actor end, v_team,
    case when v_credited is null then 'unattributed' else 'recorded' end,
    p_origin, p_occurred_at, v_effective,
    p_event_type || ':' || p_subject_key || ':' || p_kind || ':' || v_seq,
    case when p_kind = 'reversal' then v_award.id end,
    p_reason
  )
  on conflict (tenant_id, idempotency_key) do nothing
  returning id into v_id;

  return v_id;
end
$$;

-- ─── Event triggers ─────────────────────────────────────────────────────────

-- Deals: opened (sales agent) and closed (closing agent) are both credited at
-- submission. Edits never add credit; changing an agent later keeps the
-- original attribution (reassignment policy not yet approved).
create or replace function app.pe_deals() returns trigger
  language plpgsql security definer
  set search_path = app, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform app.record_performance_event(new.tenant_id, 'deal_opened', 'award', 'deal', new.id,
      'deal:' || new.id, new.sales_agent_id, new.created_at);
    perform app.record_performance_event(new.tenant_id, 'deal_closed', 'award', 'deal', new.id,
      'deal:' || new.id, new.closing_agent_id, new.created_at);
    return new;
  end if;
  -- DELETE: the record no longer exists, so its credit is withdrawn.
  perform app.record_performance_event(old.tenant_id, 'deal_opened', 'reversal', 'deal', old.id,
    'deal:' || old.id, null, now(), p_reason => 'source_deleted');
  perform app.record_performance_event(old.tenant_id, 'deal_closed', 'reversal', 'deal', old.id,
    'deal:' || old.id, null, now(), p_reason => 'source_deleted');
  return old;
end
$$;

drop trigger if exists performance_events on app.deals;
create trigger performance_events after insert or delete on app.deals
  for each row execute function app.pe_deals();

-- Services: one subject per (provisioning, service type) so retries share it.
-- Applied is credited when a row first reaches 'applied'; it is reversed only
-- if the status is corrected back to 'not_applied' and no other attempt shows
-- the service was applied. Live is credited on reaching 'live' and reversed
-- when no attempt of that service is live any more. Credit goes to the
-- provisioner assigned at that moment.
create or replace function app.pe_provisioning_services() returns trigger
  language plpgsql security definer
  set search_path = app, pg_temp
as $$
declare
  r          app.provisioning_services%rowtype;
  v_old      text;
  v_new      text;
  v_tenant   uuid;
  v_credited uuid;
  v_subject  text;
  v_detail   jsonb;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  select p.tenant_id, p.provisioner_user_id into v_tenant, v_credited
    from app.provisioning p where p.id = r.provisioning_id;
  if v_tenant is null then
    return r;
  end if;
  v_subject := 'service:' || r.provisioning_id || ':' || r.service_type;
  v_detail  := jsonb_build_object('attempt', r.attempt);

  if tg_op = 'DELETE' then
    if not exists (select 1 from app.provisioning_services s
                    where s.provisioning_id = old.provisioning_id and s.service_type = old.service_type
                      and s.id <> old.id and s.status = 'live') then
      perform app.record_performance_event(v_tenant, 'service_live', 'reversal', 'provisioning_service', old.id,
        v_subject, null, now(), old.service_type::text, v_detail, p_reason => 'source_deleted');
    end if;
    if not exists (select 1 from app.provisioning_services s
                    where s.provisioning_id = old.provisioning_id and s.service_type = old.service_type
                      and s.id <> old.id and s.status <> 'not_applied') then
      perform app.record_performance_event(v_tenant, 'service_applied', 'reversal', 'provisioning_service', old.id,
        v_subject, null, now(), old.service_type::text, v_detail, p_reason => 'source_deleted');
    end if;
    return old;
  end if;

  v_new := new.status::text;
  v_old := case when tg_op = 'INSERT' then 'not_applied' else old.status::text end;
  if v_new = v_old then
    return new;
  end if;

  if v_new = 'applied' then
    perform app.record_performance_event(v_tenant, 'service_applied', 'award', 'provisioning_service', new.id,
      v_subject, v_credited, now(), new.service_type::text, v_detail);
  elsif v_new = 'not_applied'
        and not exists (select 1 from app.provisioning_services s
                         where s.provisioning_id = new.provisioning_id and s.service_type = new.service_type
                           and s.id <> new.id and s.status <> 'not_applied') then
    perform app.record_performance_event(v_tenant, 'service_applied', 'reversal', 'provisioning_service', new.id,
      v_subject, null, now(), new.service_type::text, v_detail, p_reason => 'status_corrected');
  end if;

  if v_new = 'live' then
    perform app.record_performance_event(v_tenant, 'service_live', 'award', 'provisioning_service', new.id,
      v_subject, v_credited, now(), new.service_type::text, v_detail);
  elsif v_old = 'live'
        and not exists (select 1 from app.provisioning_services s
                         where s.provisioning_id = new.provisioning_id and s.service_type = new.service_type
                           and s.id <> new.id and s.status = 'live') then
    perform app.record_performance_event(v_tenant, 'service_live', 'reversal', 'provisioning_service', new.id,
      v_subject, null, now(), new.service_type::text, v_detail, p_reason => 'status_changed_from_live');
  end if;
  return new;
end
$$;

drop trigger if exists performance_events on app.provisioning_services;
create trigger performance_events after insert or update of status or delete on app.provisioning_services
  for each row execute function app.pe_provisioning_services();

-- Provisioning: router dispatch (credited to the router assignee — the
-- metric stays hidden until that rule is approved) and welcome calls
-- (recorded unattributed — there is no assigned caller).
create or replace function app.pe_provisioning() returns trigger
  language plpgsql security definer
  set search_path = app, pg_temp
as $$
declare
  r     app.provisioning%rowtype;
  v_old jsonb;
  v_new jsonb;
  n     integer;
  s     record;
begin
  if tg_op = 'DELETE' then
    -- Its services are cascade-deleted after this row is gone, when their own
    -- trigger can no longer find the tenant — so withdraw their credit here.
    for s in
      select distinct e.event_type, e.subject_key, e.service_type
        from app.performance_events e
       where e.tenant_id = old.tenant_id and e.subject_key like 'service:' || old.id || ':%'
    loop
      perform app.record_performance_event(old.tenant_id, s.event_type, 'reversal', 'provisioning', old.id,
        s.subject_key, null, now(), s.service_type, p_reason => 'source_deleted');
    end loop;
    perform app.record_performance_event(old.tenant_id, 'router_dispatched', 'reversal', 'provisioning', old.id,
      'router:' || old.id, null, now(), p_reason => 'source_deleted');
    for n in 1..3 loop
      perform app.record_performance_event(old.tenant_id, 'welcome_call_logged', 'reversal', 'provisioning', old.id,
        'wc:' || old.id || ':' || n, null, now(), p_reason => 'source_deleted');
    end loop;
    return old;
  end if;

  r := new;
  v_new := to_jsonb(new);
  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;

  if new.router_dispatched = 'yes' and (v_old ->> 'router_dispatched') is distinct from 'yes' then
    perform app.record_performance_event(new.tenant_id, 'router_dispatched', 'award', 'provisioning', new.id,
      'router:' || new.id, new.router_assigned_user_id, now());
  elsif (v_old ->> 'router_dispatched') = 'yes' and new.router_dispatched <> 'yes' then
    perform app.record_performance_event(new.tenant_id, 'router_dispatched', 'reversal', 'provisioning', new.id,
      'router:' || new.id, null, now(), p_reason => 'dispatch_reversed');
  end if;

  for n in 1..3 loop
    if (v_new ->> ('wc' || n || '_outcome')) is not null and (v_old ->> ('wc' || n || '_outcome')) is null then
      perform app.record_performance_event(new.tenant_id, 'welcome_call_logged', 'award', 'provisioning', new.id,
        'wc:' || new.id || ':' || n, null, now(),
        p_detail => jsonb_build_object('call', n, 'outcome', v_new ->> ('wc' || n || '_outcome')));
    elsif (v_new ->> ('wc' || n || '_outcome')) is null and (v_old ->> ('wc' || n || '_outcome')) is not null then
      perform app.record_performance_event(new.tenant_id, 'welcome_call_logged', 'reversal', 'provisioning', new.id,
        'wc:' || new.id || ':' || n, null, now(), p_reason => 'outcome_cleared');
    end if;
  end loop;
  return r;
end
$$;

drop trigger if exists performance_events on app.provisioning;
create trigger performance_events after insert or update or delete on app.provisioning
  for each row execute function app.pe_provisioning();

-- Case-style workflows: a completion transition earns an award, leaving the
-- completed state reverses it. Credit is recorded against the assignee at
-- that moment; the metrics stay hidden until the credit rule is approved.
create or replace function app.pe_completion() returns trigger
  language plpgsql security definer
  set search_path = app, pg_temp
as $$
declare
  v_row        jsonb;
  v_old        jsonb;
  v_event      text;
  v_done_now   boolean;
  v_done_old   boolean;
  v_when       timestamptz;
  v_detail     jsonb := '{}'::jsonb;
  v_tenant     uuid;
  v_id         uuid;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_tenant := (v_row ->> 'tenant_id')::uuid;
  v_id := (v_row ->> 'id')::uuid;

  if tg_table_name = 'faults' then
    v_event := 'fault_resolved';
    v_done_now := v_row ->> 'status' = 'resolved';
    v_done_old := v_old ->> 'status' = 'resolved';
    v_when := (v_row ->> 'resolved_at')::timestamptz;
  elsif tg_table_name = 'complaints' then
    v_event := 'complaint_closed';
    v_done_now := v_row ->> 'status' = 'closed';
    v_done_old := v_old ->> 'status' = 'closed';
    v_when := (v_row ->> 'closed_at')::timestamptz;
  elsif tg_table_name = 'transfer_ceases' then
    v_event := case when v_row ->> 'type' in ('cease', 'standard_cease') then 'cease_completed' else 'transfer_completed' end;
    v_done_now := v_row ->> 'status' = 'completed';
    v_done_old := v_old ->> 'status' = 'completed';
    v_when := (v_row ->> 'completed_at')::timestamptz;
    v_detail := jsonb_build_object('type', v_row ->> 'type');
  elsif tg_table_name = 'todos' then
    v_event := 'todo_completed';
    v_done_now := v_row ->> 'status' = 'completed';
    v_done_old := v_old ->> 'status' = 'completed';
  elsif tg_table_name = 'debts' then
    v_event := 'debt_closed';
    v_done_now := (v_row ->> 'closed_at') is not null;
    v_done_old := (v_old ->> 'closed_at') is not null;
    v_when := (v_row ->> 'closed_at')::timestamptz;
    v_detail := jsonb_build_object('outcome', v_row ->> 'outcome');
  else
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    perform app.record_performance_event(v_tenant, v_event, 'reversal', tg_table_name, v_id,
      tg_table_name || ':' || v_id, null, now(), p_reason => 'source_deleted');
    return old;
  end if;

  if v_done_now and not coalesce(v_done_old, false) then
    perform app.record_performance_event(v_tenant, v_event, 'award', tg_table_name, v_id,
      tg_table_name || ':' || v_id, (v_row ->> 'assigned_to')::uuid, coalesce(v_when, now()), p_detail => v_detail);
  elsif not v_done_now and coalesce(v_done_old, false) then
    perform app.record_performance_event(v_tenant, v_event, 'reversal', tg_table_name, v_id,
      tg_table_name || ':' || v_id, null, now(), p_reason => 'reopened');
  end if;
  return new;
end
$$;

drop trigger if exists performance_events on app.faults;
create trigger performance_events after insert or update or delete on app.faults
  for each row execute function app.pe_completion();
drop trigger if exists performance_events on app.complaints;
create trigger performance_events after insert or update or delete on app.complaints
  for each row execute function app.pe_completion();
drop trigger if exists performance_events on app.transfer_ceases;
create trigger performance_events after insert or update or delete on app.transfer_ceases
  for each row execute function app.pe_completion();
drop trigger if exists performance_events on app.todos;
create trigger performance_events after insert or update or delete on app.todos
  for each row execute function app.pe_completion();
drop trigger if exists performance_events on app.debts;
create trigger performance_events after insert or update or delete on app.debts
  for each row execute function app.pe_completion();

-- ─── Historical backfill ────────────────────────────────────────────────────
-- Rebuilds credit only from evidence with a trustworthy timestamp:
--   * deals          — record creation time (deals.created_at)
--   * services       — status transitions captured in app.audit_logs
--   * router         — router_dispatched transitions in app.audit_logs
--   * welcome calls  — outcome transitions in app.audit_logs
--   * faults/complaints/transfers/ceases/debts — their server-set completion timestamps
--   * todos          — status transitions in app.audit_logs
-- Credit is only attributed where a stable user id already exists on the row
-- (deals.*_agent_id). Everything else is recorded unattributed. Names are
-- never matched to accounts here. Safe to re-run: awards are idempotent.
create or replace function app.backfill_performance_events(p_tenant uuid) returns jsonb
  language plpgsql security definer
  set search_path = app, pg_temp
as $$
declare
  d record;
  a record;
  v_before jsonb;
  v_after  jsonb;
  v_live_from timestamptz;
begin
  select live_from into v_live_from from app.performance_tracking where tenant_id = p_tenant;

  select coalesce(jsonb_object_agg(event_type, n), '{}'::jsonb) into v_before
    from (select event_type, count(*) n from app.performance_events where tenant_id = p_tenant group by 1) x;

  for d in select * from app.deals where tenant_id = p_tenant and created_at < coalesce(v_live_from, now()) order by created_at loop
    perform app.record_performance_event(p_tenant, 'deal_opened', 'award', 'deal', d.id, 'deal:' || d.id,
      d.sales_agent_id, d.created_at, p_origin => 'backfill', p_actor => null);
    perform app.record_performance_event(p_tenant, 'deal_closed', 'award', 'deal', d.id, 'deal:' || d.id,
      d.closing_agent_id, d.created_at, p_origin => 'backfill', p_actor => null);
  end loop;

  -- Service transitions, oldest first, applying the same rules as the trigger.
  for a in
    select l.record_id, l.changed_at, l.action,
           coalesce(l.new_data, l.old_data) ->> 'provisioning_id' as provisioning_id,
           coalesce(l.new_data, l.old_data) ->> 'service_type'    as service_type,
           case when l.action = 'INSERT' then 'not_applied' else l.old_data ->> 'status' end as old_status,
           l.new_data ->> 'status' as new_status,
           (select u.id from app.users u where u.id = l.changed_by) as actor
      from app.audit_logs l
      join app.provisioning p on p.id = (coalesce(l.new_data, l.old_data) ->> 'provisioning_id')::uuid
     where l.table_name = 'provisioning_services' and l.action in ('INSERT', 'UPDATE')
       and p.tenant_id = p_tenant and l.changed_at < coalesce(v_live_from, now())
     order by l.changed_at, l.id
  loop
    if a.new_status is not distinct from a.old_status then
      continue;
    end if;
    if a.new_status = 'applied' then
      perform app.record_performance_event(p_tenant, 'service_applied', 'award', 'provisioning_service', a.record_id,
        'service:' || a.provisioning_id || ':' || a.service_type, null, a.changed_at, a.service_type,
        p_origin => 'backfill', p_actor => a.actor);
    elsif a.new_status = 'not_applied' then
      perform app.record_performance_event(p_tenant, 'service_applied', 'reversal', 'provisioning_service', a.record_id,
        'service:' || a.provisioning_id || ':' || a.service_type, null, a.changed_at, a.service_type,
        p_origin => 'backfill', p_actor => a.actor, p_reason => 'status_corrected');
    end if;
    if a.new_status = 'live' then
      perform app.record_performance_event(p_tenant, 'service_live', 'award', 'provisioning_service', a.record_id,
        'service:' || a.provisioning_id || ':' || a.service_type, null, a.changed_at, a.service_type,
        p_origin => 'backfill', p_actor => a.actor);
    elsif a.old_status = 'live' then
      perform app.record_performance_event(p_tenant, 'service_live', 'reversal', 'provisioning_service', a.record_id,
        'service:' || a.provisioning_id || ':' || a.service_type, null, a.changed_at, a.service_type,
        p_origin => 'backfill', p_actor => a.actor, p_reason => 'status_changed_from_live');
    end if;
  end loop;

  -- Router dispatch and welcome-call transitions.
  for a in
    select l.record_id, l.changed_at, l.action, l.old_data, l.new_data,
           (select u.id from app.users u where u.id = l.changed_by) as actor
      from app.audit_logs l
      join app.provisioning p on p.id = l.record_id
     where l.table_name = 'provisioning' and l.action in ('INSERT', 'UPDATE')
       and p.tenant_id = p_tenant and l.changed_at < coalesce(v_live_from, now())
     order by l.changed_at, l.id
  loop
    if a.new_data ->> 'router_dispatched' = 'yes' and (a.old_data ->> 'router_dispatched') is distinct from 'yes' then
      perform app.record_performance_event(p_tenant, 'router_dispatched', 'award', 'provisioning', a.record_id,
        'router:' || a.record_id, null, a.changed_at, p_origin => 'backfill', p_actor => a.actor);
    elsif a.old_data ->> 'router_dispatched' = 'yes' and (a.new_data ->> 'router_dispatched') <> 'yes' then
      perform app.record_performance_event(p_tenant, 'router_dispatched', 'reversal', 'provisioning', a.record_id,
        'router:' || a.record_id, null, a.changed_at, p_origin => 'backfill', p_actor => a.actor,
        p_reason => 'dispatch_reversed');
    end if;
    for n in 1..3 loop
      if (a.new_data ->> ('wc' || n || '_outcome')) is not null and (a.old_data ->> ('wc' || n || '_outcome')) is null then
        perform app.record_performance_event(p_tenant, 'welcome_call_logged', 'award', 'provisioning', a.record_id,
          'wc:' || a.record_id || ':' || n, null, a.changed_at,
          p_detail => jsonb_build_object('call', n, 'outcome', a.new_data ->> ('wc' || n || '_outcome')),
          p_origin => 'backfill', p_actor => a.actor);
      end if;
    end loop;
  end loop;

  -- Case workflows with server-set completion timestamps (current state only).
  for d in select id, resolved_at as at from app.faults
            where tenant_id = p_tenant and status = 'resolved' and resolved_at is not null loop
    perform app.record_performance_event(p_tenant, 'fault_resolved', 'award', 'faults', d.id, 'faults:' || d.id,
      null, d.at, p_origin => 'backfill');
  end loop;
  for d in select id, closed_at as at from app.complaints
            where tenant_id = p_tenant and status = 'closed' and closed_at is not null loop
    perform app.record_performance_event(p_tenant, 'complaint_closed', 'award', 'complaints', d.id, 'complaints:' || d.id,
      null, d.at, p_origin => 'backfill');
  end loop;
  for d in select id, type::text as type, completed_at as at from app.transfer_ceases
            where tenant_id = p_tenant and status = 'completed' and completed_at is not null loop
    perform app.record_performance_event(p_tenant,
      case when d.type in ('cease', 'standard_cease') then 'cease_completed' else 'transfer_completed' end,
      'award', 'transfer_ceases', d.id, 'transfer_ceases:' || d.id, null, d.at,
      p_detail => jsonb_build_object('type', d.type), p_origin => 'backfill');
  end loop;
  for d in select id, outcome::text as outcome, closed_at as at from app.debts
            where tenant_id = p_tenant and closed_at is not null loop
    perform app.record_performance_event(p_tenant, 'debt_closed', 'award', 'debts', d.id, 'debts:' || d.id,
      null, d.at, p_detail => jsonb_build_object('outcome', d.outcome), p_origin => 'backfill');
  end loop;
  for a in
    select l.record_id, l.changed_at,
           (select u.id from app.users u where u.id = l.changed_by) as actor
      from app.audit_logs l
      join app.todos t on t.id = l.record_id
     where l.table_name = 'todos' and l.action = 'UPDATE' and t.tenant_id = p_tenant
       and l.new_data ->> 'status' = 'completed' and (l.old_data ->> 'status') is distinct from 'completed'
       and l.changed_at < coalesce(v_live_from, now())
     order by l.changed_at, l.id
  loop
    perform app.record_performance_event(p_tenant, 'todo_completed', 'award', 'todos', a.record_id,
      'todos:' || a.record_id, null, a.changed_at, p_origin => 'backfill', p_actor => a.actor);
  end loop;

  select coalesce(jsonb_object_agg(event_type, jsonb_build_object(
           'events', n, 'net', net, 'unattributed', unattributed, 'from', first_at, 'to', last_at)), '{}'::jsonb)
    into v_after
    from (select event_type, count(*) n, sum(delta) net,
                 count(*) filter (where attribution = 'unattributed') unattributed,
                 min(effective_at) first_at, max(effective_at) last_at
            from app.performance_events where tenant_id = p_tenant and origin = 'backfill' group by 1) x;

  update app.performance_tracking
     set backfilled_at = now(),
         backfill_report = jsonb_build_object('before', v_before, 'backfilled', v_after)
   where tenant_id = p_tenant;

  return v_after;
end
$$;

-- ─── Access control ─────────────────────────────────────────────────────────
-- Authorization is enforced in app code (ADR 001). These tables are closed to
-- the Supabase API roles entirely, and only triggers may record events.
alter table app.teams enable row level security;
alter table app.user_team_memberships enable row level security;
alter table app.performance_events enable row level security;
alter table app.performance_tracking enable row level security;

revoke all on app.teams, app.user_team_memberships, app.performance_events, app.performance_tracking
  from public, anon, authenticated;
revoke all on function app.record_performance_event(uuid, text, text, text, uuid, text, uuid, timestamptz, text, jsonb, text, uuid, text, timestamptz)
  from public, anon, authenticated;
revoke all on function app.backfill_performance_events(uuid) from public, anon, authenticated;
revoke all on function app.current_actor() from public, anon, authenticated;

-- ─── Start tracking ─────────────────────────────────────────────────────────
insert into app.performance_tracking (tenant_id, live_from)
select id, now() from app.tenants
on conflict (tenant_id) do nothing;

create or replace function app.start_performance_tracking() returns trigger
  language plpgsql security definer
  set search_path = app, pg_temp
as $$
begin
  insert into app.performance_tracking (tenant_id, live_from) values (new.id, now())
  on conflict (tenant_id) do nothing;
  return new;
end
$$;

drop trigger if exists start_performance_tracking on app.tenants;
create trigger start_performance_tracking after insert on app.tenants
  for each row execute function app.start_performance_tracking();
