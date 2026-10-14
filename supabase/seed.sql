-- Synthetic seed for LOCAL development only (`pnpm db:reset`).
--
-- Every value here is invented: names from a fixed fictional list, phone
-- numbers from Ofcom's drama-reserved ranges (07700 900xxx, 01632 960xxx),
-- emails at example.com / synthetic.invalid, postcodes in the non-existent
-- "ZZ" area, and placeholder bank details. No real customer data, password
-- hashes or secrets from any hosted project.
--
-- Deterministic: fixed UUIDs, md5-derived ids and modular arithmetic instead of
-- random(). Timestamps are relative to the moment of the reset so the Stats
-- Board's "this week / this month" views always have data.
--
-- Status changes go through the same triggers production uses, so audit_logs
-- and the performance_events ledger are written exactly as the app would.
--
-- Staff sign in at http://localhost:3000 with password: local-dev-only
-- (see docs/LOCAL_DEVELOPMENT.md for the account list).

-- ─── Guard ──────────────────────────────────────────────────────────────────
-- Seeding is only for an empty database. Staging and Production always have a
-- tenant, so this aborts there before anything is written.
do $$
begin
  if exists (select 1 from app.tenants) then
    raise exception 'seed.sql refuses to run: app.tenants is not empty (this is not a fresh local database)';
  end if;
end
$$;

-- ─── Tenants ────────────────────────────────────────────────────────────────
insert into app.tenants (id, name, slug, database_url, plan) values
  ('00000000-0000-4000-8000-000000000001', 'Roaring Local (synthetic)', 'synthetic-local', 'synthetic', 'internal'),
  ('00000000-0000-4000-8000-000000000002', 'Other Tenant (synthetic)', 'synthetic-other', 'synthetic', 'internal');

-- ─── Teams ──────────────────────────────────────────────────────────────────
insert into app.teams (id, tenant_id, name) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'Sales North'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'Sales South'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001', 'Provisioning');
insert into app.teams (id, tenant_id, name, is_active) values
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-000000000001', 'Retired Team', false);

-- ─── Staff ──────────────────────────────────────────────────────────────────
-- app.users.id must equal the Supabase Auth user id (there is no FK).
create temporary table seed_staff (
  id uuid, tenant_id uuid, email text, full_name text, role app.user_role,
  approval app.approval_status, active boolean, team_id uuid, department text
);

insert into seed_staff values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'admin@synthetic.invalid',      'Ada Admin',        'admin',       'approved', true,  null,                                   'Operations'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'director@synthetic.invalid',   'Dee Director',     'director',    'approved', true,  null,                                   'Management'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'manager@synthetic.invalid',    'Morgan Manager',   'manager',     'approved', true,  null,                                   'Sales'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'lead.north@synthetic.invalid', 'Tara Lead',        'team_leader', 'approved', true,  '00000000-0000-4000-8000-0000000000a1', 'Sales'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'lead.south@synthetic.invalid', 'Theo Lead',        'team_leader', 'approved', true,  '00000000-0000-4000-8000-0000000000a2', 'Sales'),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', 'alice@synthetic.invalid',      'Alice Agent',      'agent',       'approved', true,  '00000000-0000-4000-8000-0000000000a1', 'Sales'),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', 'bob@synthetic.invalid',        'Bob Agent',        'agent',       'approved', true,  '00000000-0000-4000-8000-0000000000a2', 'Sales'),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000001', 'cara@synthetic.invalid',       'Cara Agent',       'agent',       'approved', true,  '00000000-0000-4000-8000-0000000000a1', 'Sales'),
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000001', 'dan@synthetic.invalid',        'Dan Agent',        'agent',       'approved', true,  '00000000-0000-4000-8000-0000000000a2', 'Sales'),
  ('00000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000001', 'eve@synthetic.invalid',        'Eve Agent',        'agent',       'approved', true,  '00000000-0000-4000-8000-0000000000a2', 'Sales'),
  ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000001', 'sam@synthetic.invalid',        'Sam Sales',        'sales',       'approved', true,  '00000000-0000-4000-8000-0000000000a1', 'Sales'),
  ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000001', 'pia@synthetic.invalid',        'Pia Provisioner',  'agent',       'approved', true,  '00000000-0000-4000-8000-0000000000a3', 'Provisioning'),
  ('00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000001', 'pete@synthetic.invalid',       'Pete Provisioner', 'agent',       'approved', true,  '00000000-0000-4000-8000-0000000000a3', 'Provisioning'),
  -- Edge cases for requireUser(): pending, rejected and suspended accounts.
  ('00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000001', 'pending@synthetic.invalid',    'Paula Pending',    'agent',       'pending',  true,  null,                                   null),
  ('00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000001', 'rejected@synthetic.invalid',   'Rita Rejected',    'agent',       'rejected', true,  null,                                   null),
  ('00000000-0000-4000-8000-000000000116', '00000000-0000-4000-8000-000000000001', 'inactive@synthetic.invalid',   'Ivan Inactive',    'agent',       'approved', false, '00000000-0000-4000-8000-0000000000a2', 'Sales'),
  -- A second tenant, to exercise tenant isolation.
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000002', 'outsider@synthetic.invalid',   'Olly Outsider',    'admin',       'approved', true,  null,                                   null);

-- Supabase Auth users (local only). Token columns are '' rather than NULL,
-- which GoTrue requires. The password hash is computed here, never copied.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select '00000000-0000-0000-0000-000000000000', s.id, 'authenticated', 'authenticated', s.email,
       extensions.crypt('local-dev-only', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', s.full_name), now(), now(), '', '', '', ''
  from seed_staff s;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select s.id::text, s.id, jsonb_build_object('sub', s.id::text, 'email', s.email, 'email_verified', true),
       'email', now(), now(), now()
  from seed_staff s;

insert into app.users (id, tenant_id, email, full_name, role, approval_status, is_active, team_id, department, phone, created_at)
select s.id, s.tenant_id, s.email, s.full_name, s.role, s.approval, s.active, s.team_id, s.department,
       '07700900' || lpad((row_number() over (order by s.id))::text, 3, '0'),
       now() - interval '120 days'
  from seed_staff s;

drop table seed_staff;

-- Membership history: everyone has been in their team for 120 days, except
-- Bob, who moved from Sales North to Sales South 20 days ago — so his older
-- deals count for North and his recent ones for South.
update app.user_team_memberships set valid_from = now() - interval '120 days';
update app.user_team_memberships
   set valid_from = now() - interval '20 days'
 where user_id = '00000000-0000-4000-8000-000000000107';
insert into app.user_team_memberships (tenant_id, user_id, team_id, valid_from, valid_to)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000107',
        '00000000-0000-4000-8000-0000000000a1', now() - interval '120 days', now() - interval '20 days');

-- ─── Customers ──────────────────────────────────────────────────────────────
-- 120 customers. Inputs are deliberately messy (spaces in postcodes and
-- mobiles, mixed case, placeholder email) so normalise_customer() is exercised.
insert into app.customers (
  id, tenant_id, account_number, type, title, company_name, first_name, last_name,
  mobile, landline, email, address_line_1, address_line_2, address_line_3, postcode,
  status, assigned_to, created_by, created_at
)
select md5('syn-customer-' || i)::uuid,
       '00000000-0000-4000-8000-000000000001',
       'DFB' || (20000 + i),
       case when i % 3 = 0 then 'residential' else 'business' end::app.customer_type,
       (array['Mr','Mrs','Ms','Dr','Mx','Miss'])[1 + i % 6]::app.title,
       case when i % 3 = 0 then null
            else (array['acme widgets','northwind trading','globex supplies','initech services','umbrella logistics',
                        'stark fabrication','wayne holdings','tyrell systems','cyberdyne parts','soylent foods'])[1 + i % 10]
                 || ' ' || (array['ltd','limited','& co','group'])[1 + i % 4] end,
       (array['jamie','alex','sam','charlie','robin','morgan','casey','riley','jordan','taylor','avery','quinn'])[1 + i % 12],
       (array['fictional','sampleton','testwood','exampleby','mockridge','placeholder','dummington','synthetica'])[1 + (i * 7) % 8],
       '07700 900' || lpad((100 + i)::text, 3, '0'),
       case when i % 4 = 0 then '01632 960' || lpad(i::text, 3, '0') end,
       case when i % 5 = 0 then 'customer' || i || '@example.com'
            when i % 17 = 0 then 'noemail@noemail.com' end,
       i || ' ' || (array['imaginary road','nowhere street','make believe lane','fable close','pretend avenue'])[1 + i % 5],
       case when i % 2 = 0 then 'unit ' || (1 + i % 9) end,
       (array['testford','sampleham','mockbury','exampleton'])[1 + i % 4],
       'zz' || (1 + i % 9) || ' ' || (1 + i % 9) || (array['aa','ab','ba','bb'])[1 + i % 4],
       (array['prospect','active','active','active','at_risk','churned'])[1 + i % 6]::app.customer_status,
       case when i % 4 <> 0 then (array['00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000107',
                                         '00000000-0000-4000-8000-000000000108','00000000-0000-4000-8000-000000000109',
                                         '00000000-0000-4000-8000-000000000110'])[1 + i % 5]::uuid end,
       '00000000-0000-4000-8000-000000000103',
       now() - interval '150 days' + make_interval(hours => i)
  from generate_series(1, 120) as i;

insert into app.customers (id, tenant_id, account_number, type, first_name, last_name, status, created_by)
values ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000002', 'OTH20001',
        'business', 'Other', 'Tenantcustomer', 'active', '00000000-0000-4000-8000-000000000201');

-- ─── Deals, services and provisioning ──────────────────────────────────────
-- 72 deals over the last 90 days. Each walks through the provisioning
-- lifecycle according to a scenario chosen by its number:
--   0 bb + whc, both live              4 bb applied, delayed, then live
--   1 bb + nfon, live                  5 bb cancelled, retried (attempt 2) → live
--   2 mpf broadband + mpf voice, live  6 cant_provision, deal cancelled
--   3 bb + whc still applied           7 live then corrected back (reversal)
--   8 nfon only, not yet applied       9 bb live, router dispatch reversed
-- A few deals are legacy rows with only free-text agent names (no ids).
do $$
declare
  t_id     constant uuid := '00000000-0000-4000-8000-000000000001';
  agents   constant uuid[] := array['00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000107',
                                    '00000000-0000-4000-8000-000000000108','00000000-0000-4000-8000-000000000109',
                                    '00000000-0000-4000-8000-000000000110','00000000-0000-4000-8000-000000000111']::uuid[];
  names    constant text[] := array['Alice Agent','Bob Agent','Cara Agent','Dan Agent','Eve Agent','Sam Sales'];
  closers  constant uuid[] := array['00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000105',
                                    '00000000-0000-4000-8000-000000000103']::uuid[];
  closer_names constant text[] := array['Tara Lead','Theo Lead','Morgan Manager'];
  provs    constant uuid[] := array['00000000-0000-4000-8000-000000000112','00000000-0000-4000-8000-000000000113']::uuid[];
  i        int;
  sc       int;
  d_id     uuid;
  p_id     uuid;
  c_id     uuid;
  s_bb     uuid;
  s_voice  uuid;
  s_retry  uuid;
  sales    uuid;
  closer   uuid;
  prov     uuid;
  created  timestamptz;
  legacy   boolean;
  bb_type  app.service_type;
  v_type   app.service_type;
begin
  for i in 1..72 loop
    sc      := i % 10;
    legacy  := i % 23 = 0;
    c_id    := md5('syn-customer-' || (1 + (i * 5) % 120))::uuid;
    d_id    := md5('syn-deal-' || i)::uuid;
    p_id    := md5('syn-prov-' || i)::uuid;
    sales   := agents[1 + i % 6];
    closer  := case when i % 4 = 0 then sales else closers[1 + i % 3] end;
    prov    := case when i % 7 = 0 then null else provs[1 + i % 2] end;
    created := date_trunc('hour', now()) - make_interval(days => 90 - (i * 5) / 4, hours => i % 9);

    perform set_config('app.current_user_id', '00000000-0000-4000-8000-000000000103', false);
    insert into app.deals (id, tenant_id, customer_id, sales_agent, closing_agent, sales_agent_id, closing_agent_id,
                           deal_type, status, trading_address, soft_facts, deal_date, welcome_call,
                           created_by, created_at, submission_key)
    values (d_id, t_id, c_id, names[1 + i % 6],
            case when i % 4 = 0 then names[1 + i % 6] else closer_names[1 + i % 3] end,
            case when legacy then null else sales end,
            case when legacy then null else closer end,
            case when i % 3 = 0 then 'residential' else 'business' end::app.deal_type,
            case sc when 6 then 'cancelled' when 8 then 'pending' when 3 then 'pending' else 'live' end::app.deal_status,
            case when i % 3 <> 0 then i || ' Imaginary Road, Testford' end,
            'Synthetic deal ' || i || ': scenario ' || sc,
            created::date,
            (array['am','pm'])[1 + i % 2]::app.welcome_call,
            '00000000-0000-4000-8000-000000000103', created, md5('syn-submission-' || i)::uuid);

    bb_type := case when sc = 2 then 'mpf_broadband' else 'bb' end;
    v_type  := case sc when 1 then 'nfon' when 2 then 'mpf_voice' when 8 then 'nfon' else 'whc' end;

    insert into app.deal_services (deal_id, line_checked, broadband_type, install_type, normal_speed, min_speed, max_speed,
                                   voice_required, line_configuration, num_licenses, voice_option, call_tariff, equipment)
    values (d_id, i % 5 <> 0,
            case when sc = 8 then null when sc = 2 then 'MPF Broadband' else 'FTTP' end,
            (array['new_install','migration'])[1 + i % 2]::app.install_type,
            '500', '150', '900', sc in (0, 1, 2, 3, 8),
            (array['single','multi','mpf'])[1 + i % 3]::app.line_configuration,
            case when sc in (1, 8) then 1 + i % 6 end,
            case sc when 1 then 'nfon' when 8 then 'nfon' when 2 then 'mpf' else 'whc' end::app.voice_option_type,
            'Synthetic tariff ' || (1 + i % 3),
            -- Same shape the deal sheet writes: [{item, qty, wholesale}], or null when none.
            case when i % 3 = 0 then null
                 else jsonb_build_array(jsonb_build_object(
                        'item', 'Synthetic Handset X' || (1 + i % 2), 'qty', i % 3, 'wholesale', 25)) end);

    insert into app.deal_pricing (deal_id, bundle_price, wholesale_cost, monthly_gp, connection_fee,
                                  bill_amount_losing_supplier, contract_length)
    values (d_id, 30 + (i % 8) * 5, 12 + (i % 5) * 2, (30 + (i % 8) * 5) - (12 + (i % 5) * 2),
            case when i % 2 = 0 then 49.99 end, 40 + i % 30,
            (array['24_months','36_months','48_months'])[1 + i % 3]::app.contract_length);

    -- Placeholder bank details only (sort code 00-00-00 does not exist).
    insert into app.deal_billing (deal_id, billing_type, payment_method, phone_provider, broadband_provider,
                                  invoice_name, sort_code, account_number, bank_checked)
    values (d_id, (array['email','paper'])[1 + i % 2]::app.billing_type,
            (array['dd','mandate','card_bacs'])[1 + i % 3]::app.payment_method,
            'Previous Telco ' || (1 + i % 4), 'Previous ISP ' || (1 + i % 3),
            'Synthetic Invoice ' || i,
            case when i % 3 = 0 then '00-00-00' end, case when i % 3 = 0 then '00000000' end, i % 3 = 0);

    -- Provisioning record and first-attempt services, as the deal sheet creates them.
    insert into app.provisioning (id, tenant_id, deal_id, customer_id, status, provisioner, provisioner_user_id,
                                  router_assigned_user_id, date_ordered, proposed_live_date, created_at)
    values (p_id, t_id, d_id, c_id, 'not_started',
            case when prov = provs[1] then 'Pia Provisioner' when prov = provs[2] then 'Pete Provisioner' end,
            prov, case when sc in (0, 1, 9) then provs[1 + (i + 1) % 2] end,
            created::date + 2, created::date + 21, created);

    s_bb := null;
    if sc <> 8 then
      insert into app.provisioning_services (provisioning_id, service_type, status, attempt)
      values (p_id, bb_type, 'not_applied', 1) returning id into s_bb;
    end if;
    s_voice := null;
    if sc in (0, 1, 2, 3, 8) then
      insert into app.provisioning_services (provisioning_id, service_type, status, attempt)
      values (p_id, v_type, 'not_applied', 1) returning id into s_voice;
    end if;

    -- The provisioner works the order.
    perform set_config('app.current_user_id', coalesce(prov, '00000000-0000-4000-8000-000000000112')::text, false);

    if sc = 8 then
      continue; -- not started yet
    end if;

    update app.provisioning_services set status = 'applied', date_ordered = created::date + 2, reference = 'SYN-REF-' || i
     where id in (s_bb, s_voice);

    if sc = 4 then
      update app.provisioning_services set status = 'delayed', delayed_date = created::date + 10,
             delay_reason = 'Synthetic: Openreach engineer rebooked', presumed_solve_date = created::date + 24
       where id = s_bb;
    elsif sc = 5 then
      update app.provisioning_services set status = 'cancelled', cancelled_date = created::date + 6,
             cancelled_by = 'openreach', cancellation_reason = 'Synthetic: address not found'
       where id = s_bb;
      insert into app.provisioning_services (provisioning_id, service_type, status, attempt, date_ordered, reference)
      values (p_id, bb_type, 'not_applied', 2, created::date + 7, 'SYN-REF-' || i || '-2') returning id into s_retry;
      update app.provisioning_services set status = 'applied' where id = s_retry;
      s_bb := s_retry;
    elsif sc = 6 then
      update app.provisioning_services set status = 'cant_provision', notes = 'Synthetic: no capacity at cabinet'
       where id = s_bb;
      update app.provisioning set status = 'failed' where id = p_id;
      continue;
    end if;

    if sc = 3 then
      update app.provisioning set status = 'broadband_and_whc_applied' where id = p_id;
      continue; -- still waiting
    end if;

    update app.provisioning_services set status = 'live', live_date = created::date + 18 where id in (s_bb, s_voice);
    update app.provisioning set status = 'live', router_ordered_date = created::date + 3 where id = p_id;

    if sc = 7 then
      -- Marked live by mistake, corrected back: the live credit is reversed.
      update app.provisioning_services set status = 'applied', live_date = null where id = s_bb;
      update app.provisioning set status = 'in_progress' where id = p_id;
    end if;

    if sc in (0, 1, 9) then
      update app.provisioning set router_dispatched = 'yes', router_dispatch_ref = 'SYN-DISP-' || i,
             router_tracking_number = 'SYNTRACK' || lpad(i::text, 6, '0')
       where id = p_id;
      if sc = 9 then
        update app.provisioning set router_dispatched = 'no' where id = p_id; -- courier returned it
      end if;
    elsif sc = 2 then
      update app.provisioning set router_dispatched = 'not_needed' where id = p_id;
    end if;

    -- Welcome calls: some answered first time, some after retries.
    if i % 2 = 0 then
      update app.provisioning set wc1_outcome = 'answered', wc1_comments = 'Synthetic: happy with install' where id = p_id;
    elsif i % 3 = 0 then
      update app.provisioning set wc1_outcome = 'no_answer' where id = p_id;
      update app.provisioning set wc2_outcome = 'call_back', wc2_comments = 'Synthetic: call after 5pm' where id = p_id;
      update app.provisioning set wc3_outcome = 'answered' where id = p_id;
    end if;
  end loop;

  perform set_config('app.current_user_id', '', false);
end
$$;

-- A deal in the other tenant, for isolation checks.
insert into app.deals (tenant_id, customer_id, sales_agent, closing_agent, sales_agent_id, closing_agent_id,
                       deal_type, deal_date, created_by)
values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000301', 'Olly Outsider',
        'Olly Outsider', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000201',
        'business', current_date, '00000000-0000-4000-8000-000000000201');

-- ─── Case workflows ─────────────────────────────────────────────────────────
-- Faults, complaints, debts, transfers/ceases and to-dos in every state,
-- including items completed and then reopened (their credit is reversed).
do $$
declare
  t_id  constant uuid := '00000000-0000-4000-8000-000000000001';
  staff constant uuid[] := array['00000000-0000-4000-8000-000000000112','00000000-0000-4000-8000-000000000113',
                                 '00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000105']::uuid[];
  i     int;
  x_id  uuid;
  who   uuid;
begin
  perform set_config('app.current_user_id', '00000000-0000-4000-8000-000000000103', false);

  for i in 1..10 loop
    who  := staff[1 + i % 4];
    x_id := md5('syn-fault-' || i)::uuid;
    insert into app.faults (id, tenant_id, provisioning_id, assigned_to, title, type, status, ticket_ref,
                            ticket_raised_at, opened_at, created_by)
    values (x_id, t_id, md5('syn-prov-' || (i * 6))::uuid, who, 'Synthetic fault ' || i,
            (array['bb','line','upgrade','dfb','provisioning','mobile','ticket'])[1 + i % 7]::app.fault_type,
            'outstanding', 'SYN-FLT-' || i, now() - make_interval(days => 30 - i), now() - make_interval(days => 30 - i),
            '00000000-0000-4000-8000-000000000103');
    insert into app.fault_comments (fault_id, author_id, body)
    values (x_id, who, 'Synthetic note: customer reports intermittent drop-outs.');
    if i % 3 = 0 then
      update app.faults set status = 'in_progress' where id = x_id;
    elsif i % 3 = 1 then
      update app.faults set status = 'resolved', resolved_at = now() - make_interval(days => 20 - i) where id = x_id;
      if i = 4 then -- fix did not hold
        update app.faults set status = 'in_progress', resolved_at = null where id = x_id;
      end if;
    end if;
  end loop;

  for i in 1..8 loop
    who  := staff[1 + (i + 1) % 4];
    x_id := md5('syn-complaint-' || i)::uuid;
    insert into app.complaints (id, tenant_id, provisioning_id, assigned_to, title, type, status, opened_at, created_by)
    values (x_id, t_id, md5('syn-prov-' || (i * 8))::uuid, who, 'Synthetic complaint ' || i,
            (array['bb','line','billing','service','provisioning','other'])[1 + i % 6]::app.complaint_type,
            'open', now() - make_interval(days => 40 - i), '00000000-0000-4000-8000-000000000103');
    insert into app.complaint_comments (complaint_id, author_id, body)
    values (x_id, who, 'Synthetic note: called customer, awaiting response.');
    update app.complaints
       set status = (array['investigating','pending_customer','pending_tech','closed','ofcom','closed','scheduled_call_back','closed'])[i]::app.complaint_status,
           closed_at = case when i in (4, 6, 8) then now() - make_interval(days => 10 - i) end
     where id = x_id;
  end loop;

  for i in 1..7 loop
    who  := staff[1 + i % 4];
    x_id := md5('syn-debt-' || i)::uuid;
    insert into app.debts (id, tenant_id, provisioning_id, assigned_to, title, total_owed, payment_tried, payment_type,
                           opened_at, created_by)
    values (x_id, t_id, md5('syn-prov-' || (i * 9))::uuid, who, 'Synthetic arrears ' || i, 25 * i, i % 2 = 0,
            (array['bacs','card','dd','cheque','eft'])[1 + i % 5]::app.debt_payment_type,
            now() - make_interval(days => 45 - i), '00000000-0000-4000-8000-000000000103');
    insert into app.debt_comments (debt_id, author_id, body) values (x_id, who, 'Synthetic note: reminder sent.');
    update app.debts
       set outcome = (array['payment','payment_plan','no_answer','refused','promised_payment','uncollectable','part_payment'])[i]::app.debt_outcome,
           closed_at = case when i in (1, 2, 6) then now() - make_interval(days => 15 - i) end,
           date_of_payment = case when i in (1, 7) then current_date - (15 - i) end
     where id = x_id;
  end loop;

  for i in 1..6 loop
    who  := staff[1 + i % 4];
    x_id := md5('syn-transfer-cease-' || i)::uuid;
    insert into app.transfer_ceases (id, tenant_id, provisioning_id, assigned_to, type, status, opened_at, created_by)
    values (x_id, t_id, md5('syn-prov-' || (i * 11))::uuid, who,
            (array['cease','transfer','historical_transfer','standard_cease','standard_transfer','transfer'])[i]::app.transfer_cease_type,
            'open', now() - make_interval(days => 25 - i), '00000000-0000-4000-8000-000000000103');
    insert into app.transfer_cease_comments (transfer_cease_id, author_id, body)
    values (x_id, who, 'Synthetic note: losing provider notified.');
    if i <> 6 then
      update app.transfer_ceases
         set status = (array['completed','in_progress','completed','cancelled','completed'])[i]::app.transfer_cease_status,
             completed_at = case when i in (1, 3, 5) then now() - make_interval(days => 12 - i) end
       where id = x_id;
    end if;
  end loop;

  for i in 1..14 loop
    who  := (array['00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000107',
                   '00000000-0000-4000-8000-000000000108','00000000-0000-4000-8000-000000000112'])[1 + i % 4]::uuid;
    x_id := md5('syn-todo-' || i)::uuid;
    insert into app.todos (id, tenant_id, assigned_to, assigned_by, title, description, priority, link_type, link_id,
                           link_label, created_by)
    values (x_id, t_id, who, '00000000-0000-4000-8000-000000000104', 'Synthetic follow-up ' || i,
            'Synthetic task generated by seed.sql',
            (array['asap','today','tomorrow','this_week','no_rush','in_progress'])[1 + i % 6]::app.todo_priority,
            case when i % 2 = 0 then 'customer' else 'provisioning' end::app.todo_link_type,
            case when i % 2 = 0 then md5('syn-customer-' || i)::uuid else md5('syn-prov-' || i)::uuid end,
            case when i % 2 = 0 then 'DFB' || (20000 + i) else 'Provisioning ' || i end,
            '00000000-0000-4000-8000-000000000104');
    insert into app.todo_comments (todo_id, author_id, body) values (x_id, who, 'Synthetic note: on it.');
    if i % 3 = 0 then
      update app.todos set status = 'completed' where id = x_id;
      if i = 9 then
        update app.todos set status = 'in_progress' where id = x_id; -- reopened
      end if;
    elsif i % 3 = 1 then
      update app.todos set status = 'in_progress' where id = x_id;
    end if;
  end loop;

  perform set_config('app.current_user_id', '', false);
end
$$;

-- ─── Invitations ────────────────────────────────────────────────────────────
insert into app.user_invitations (tenant_id, invited_by, invited_by_email, invited_by_name, email, role, token, status, expires_at)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'admin@synthetic.invalid', 'Ada Admin',
   'new.starter@synthetic.invalid', 'agent', md5('syn-invite-1'), 'pending', now() + interval '7 days'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'admin@synthetic.invalid', 'Ada Admin',
   'late.starter@synthetic.invalid', 'sales', md5('syn-invite-2'), 'expired', now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'admin@synthetic.invalid', 'Ada Admin',
   'cara@synthetic.invalid', 'agent', md5('syn-invite-3'), 'accepted', now() - interval '100 days');

-- ─── Platform settings ──────────────────────────────────────────────────────
update app.platform_settings set settings = '{}'::jsonb, updated_by = '00000000-0000-4000-8000-000000000101';
