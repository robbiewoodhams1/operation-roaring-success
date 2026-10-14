-- Baseline — the `app` schema as it existed before 0001_platform_settings.
--
-- The original 19 tables, their enums, functions, triggers and RLS policies
-- were created directly against the live database with no migration history
-- (docs/decisions/002-*.md). This file reconstructs that pre-0001 state from
-- the Staging catalog (gqkugpjmguufavbladxt, Postgres 17.6) on 2026-10-14,
-- minus every object that 0001 and 0002 create. Replaying
--   baseline → platform_settings → performance_stats
-- must reproduce Staging's schema exactly; `pnpm db:fingerprint` checks that.
--
-- Hosted databases that already contain this schema (Staging, and Production
-- once verified read-only) record it as applied with `migration repair`; it is
-- never executed against them. See docs/MIGRATIONS.md.
--
-- Schema only. No data, no grants to the Supabase API roles (the `app` schema
-- is not exposed through PostgREST), and function bodies are kept as found —
-- including known advisor findings — so the baseline stays faithful. Fixes
-- belong in new migrations.

create schema if not exists app;

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type app.approval_status as enum ('pending', 'approved', 'rejected');
create type app.billing_type as enum ('paper', 'email');
create type app.cancelled_by as enum ('customer', 'bt_wholesale', 'openreach', 'us');
create type app.cancelled_by_type as enum ('customer', 'bt_wholesale', 'openreach', 'us');
create type app.complaint_status as enum ('open', 'investigating', 'pending_customer', 'pending_chess', 'pending_tech', 'pending_recorded_call', 'ofcom', 'cisas', 'scheduled_call_back', 'closed');
create type app.complaint_type as enum ('bb', 'line', 'upgrade', 'dfb', 'provisioning', 'mobile', 'billing', 'service', 'other');
create type app.contract_length as enum ('24_months', '36_months', '48_months', 'other');
create type app.customer_status as enum ('prospect', 'active', 'at_risk', 'churned');
create type app.customer_type as enum ('residential', 'business');
create type app.deal_status as enum ('pending', 'live', 'cancelled');
create type app.deal_type as enum ('business', 'residential');
create type app.debt_outcome as enum ('payment', 'payment_plan', 'no_answer', 'invalid_contact_details', 'refused', 'call_back', 'left_voicemail', 'promised_payment', 'free_bill', 'taken_by_dd_already', 'deceased', 'not_in_live_list', 'needs_investigating', 'active_dd', 'part_payment', 'take_on_dd', 'uncollectable');
create type app.debt_payment_type as enum ('bacs', 'card', 'dd', 'cheque', 'eft');
create type app.fault_status as enum ('outstanding', 'in_progress', 'resolved');
create type app.fault_type as enum ('bb', 'line', 'upgrade', 'dfb', 'provisioning', 'mobile', 'ticket');
create type app.install_type as enum ('new_install', 'migration');
create type app.invitation_status as enum ('pending', 'accepted', 'expired');
create type app.line_configuration as enum ('single', 'multi', 'mpf');
create type app.payment_method as enum ('dd', 'mandate', 'card_bacs');
create type app.provisioning_install_type as enum ('new_install', 'migration');
create type app.provisioning_status as enum ('not_started', 'broadband_applied', 'whc_applied', 'broadband_and_whc_applied', 'live', 'failed', 'in_progress', 'mpf_broadband_applied', 'mpf_voice_applied');
create type app.router_dispatched as enum ('yes', 'no', 'not_needed');
create type app.service_status as enum ('not_applied', 'applied', 'delayed', 'cancelled', 'live', 'cant_provision');
create type app.service_type as enum ('bb', 'whc', 'nfon', 'mpf_broadband', 'mpf_voice', 'mobile');
create type app.title as enum ('Mr', 'Mrs', 'Miss', 'Dr', 'Prof', 'Ms', 'Mx', 'Rev');
create type app.todo_link_type as enum ('customer', 'provisioning', 'fault', 'complaint', 'debt', 'deal');
create type app.todo_priority as enum ('asap', 'today', 'tomorrow', 'this_week', 'no_rush', 'in_progress');
create type app.todo_status as enum ('not_started', 'in_progress', 'completed', 'cancelled');
create type app.transfer_cease_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type app.transfer_cease_type as enum ('cease', 'transfer', 'historical_transfer', 'standard_cease', 'standard_transfer');
create type app.user_role as enum ('agent', 'team_leader', 'manager', 'director', 'admin', 'sales');
create type app.voice_option_type as enum ('whc', 'nfon', 'mpf');
create type app.wc_outcome as enum ('call_back', 'answered', 'no_answer', 'cancelled');
create type app.welcome_call as enum ('am', 'pm');

-- ─── Tables ─────────────────────────────────────────────────────────────────
-- Column order matches Staging (later additions such as customers.landline sit
-- where `alter table … add column` put them).

create table app.tenants (
  id                 uuid not null default gen_random_uuid(),
  name               text not null,
  slug               text not null,
  database_url       text not null,
  plan               text not null default 'internal'::text,
  stripe_customer_id text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint tenants_pkey primary key (id),
  constraint tenants_slug_key unique (slug)
);

-- users.id is the Supabase Auth user id. There is deliberately no foreign key
-- to auth.users (as found live); getUser() matches them by id.
create table app.users (
  id              uuid not null,
  tenant_id       uuid not null,
  email           text not null,
  full_name       text not null,
  role            app.user_role not null default 'agent'::app.user_role,
  approval_status app.approval_status not null default 'pending'::app.approval_status,
  is_active       boolean not null default true,
  phone           text,
  department      text,
  team            text,
  avatar_url      text,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint users_pkey primary key (id)
);

create table app.customers (
  id             uuid not null default gen_random_uuid(),
  tenant_id      uuid not null,
  account_number text not null,
  type           app.customer_type not null default 'business'::app.customer_type,
  company_name   text,
  first_name     text not null,
  last_name      text not null,
  mobile         text,
  email          text,
  address_line_1 text,
  address_line_2 text,
  address_line_3 text,
  address_line_4 text,
  postcode       text,
  status         app.customer_status not null default 'prospect'::app.customer_status,
  assigned_to    uuid,
  created_by     uuid not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  landline       text,
  title          app.title,
  constraint customers_pkey primary key (id),
  constraint customers_account_number_key unique (account_number)
);

create table app.deals (
  id            uuid not null default gen_random_uuid(),
  tenant_id     uuid not null,
  customer_id   uuid not null,
  sales_agent   text not null,
  closing_agent text not null,
  deal_type     app.deal_type not null,
  status        app.deal_status not null default 'pending'::app.deal_status,
  trading_address text,
  soft_facts    text,
  deal_date     date not null,
  welcome_call  app.welcome_call,
  created_by    uuid not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint deals_pkey primary key (id)
);

create table app.deal_billing (
  id                 uuid not null default gen_random_uuid(),
  deal_id            uuid not null,
  billing_type       app.billing_type,
  payment_method     app.payment_method,
  phone_provider     text,
  broadband_provider text,
  invoice_name       text,
  bank_branch        text,
  sort_code          text,
  account_number     text,
  bank_checked       boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint deal_billing_pkey primary key (id)
);

create table app.deal_pricing (
  id                          uuid not null default gen_random_uuid(),
  deal_id                     uuid not null,
  bundle_price                numeric(10,2) not null,
  wholesale_cost              numeric(10,2) not null,
  monthly_gp                  numeric(10,2) not null,
  connection_fee              numeric(10,2),
  bill_amount_losing_supplier numeric(10,2),
  contract_length             app.contract_length,
  contract_length_other       text,
  created_at                  timestamptz not null default now(),
  constraint deal_pricing_pkey primary key (id)
);

create table app.deal_services (
  id                 uuid not null default gen_random_uuid(),
  deal_id            uuid not null,
  line_checked       boolean not null default false,
  connection_fee     numeric(10,2),
  broadband_type     text,
  install_type       app.install_type,
  ont_serial_number  text,
  normal_speed       text,
  min_speed          text,
  max_speed          text,
  voice_required     boolean not null default false,
  current_voice_type text,
  line_configuration app.line_configuration,
  num_licenses       integer,
  voice_option       app.voice_option_type,
  call_tariff        text,
  existing_handsets  text,
  intl_package       text,
  intl_location      text,
  premium_package    text,
  equipment          jsonb,
  created_at         timestamptz not null default now(),
  constraint deal_services_pkey primary key (id)
);

create table app.provisioning (
  id                     uuid not null default gen_random_uuid(),
  tenant_id              uuid not null,
  deal_id                uuid,
  status                 app.provisioning_status not null default 'not_started'::app.provisioning_status,
  wc1_outcome            app.wc_outcome,
  wc1_comments           text,
  wc2_outcome            app.wc_outcome,
  wc2_comments           text,
  router_dispatch_ref    text,
  router_tracking_number text,
  proposed_live_date     date,
  date_ordered           date,
  order_comments         text,
  order_fault_ref        text,
  provisioner            text,
  last_checked_at        timestamptz,
  last_checked_by        text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  wc3_outcome            app.wc_outcome,
  wc3_comments           text,
  router_ordered_date    date,
  router_dispatched      app.router_dispatched not null default 'no'::app.router_dispatched,
  customer_id            uuid,
  constraint provisioning_pkey primary key (id)
);

create table app.provisioning_services (
  id                  uuid not null default gen_random_uuid(),
  provisioning_id     uuid not null,
  status              app.service_status not null default 'not_applied'::app.service_status,
  attempt             integer not null default 1,
  date_ordered        date,
  live_date           date,
  last_checked_at     date,
  reference           text,
  cancelled_date      date,
  cancelled_by        app.cancelled_by_type,
  cancellation_reason text,
  delayed_date        date,
  presumed_solve_date date,
  delay_reason        text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  service_type        app.service_type not null,
  constraint provisioning_services_pkey primary key (id)
);

create table app.faults (
  id               uuid not null default gen_random_uuid(),
  tenant_id        uuid not null,
  provisioning_id  uuid,
  assigned_to      uuid,
  title            text not null,
  type             app.fault_type not null,
  status           app.fault_status not null default 'outstanding'::app.fault_status,
  ticket_ref       text,
  ticket_raised_at timestamptz,
  opened_at        timestamptz not null default now(),
  resolved_at      timestamptz,
  created_by       uuid not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint faults_pkey primary key (id)
);

create table app.fault_comments (
  id         uuid not null default gen_random_uuid(),
  fault_id   uuid not null,
  author_id  uuid not null,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint fault_comments_pkey primary key (id)
);

create table app.complaints (
  id               uuid not null default gen_random_uuid(),
  tenant_id        uuid not null,
  provisioning_id  uuid,
  assigned_to      uuid,
  title            text not null,
  type             app.complaint_type not null,
  status           app.complaint_status not null default 'open'::app.complaint_status,
  ticket_ref       text,
  ticket_raised_at timestamptz,
  opened_at        timestamptz not null default now(),
  closed_at        timestamptz,
  created_by       uuid not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint complaints_pkey primary key (id)
);

create table app.complaint_comments (
  id           uuid not null default gen_random_uuid(),
  complaint_id uuid not null,
  author_id    uuid not null,
  body         text not null,
  created_at   timestamptz not null default now(),
  constraint complaint_comments_pkey primary key (id)
);

create table app.debts (
  id              uuid not null default gen_random_uuid(),
  tenant_id       uuid not null,
  provisioning_id uuid,
  assigned_to     uuid,
  title           text not null,
  outcome         app.debt_outcome,
  total_owed      numeric(10,2) not null default 0,
  payment_tried   boolean not null default false,
  payment_type    app.debt_payment_type,
  date_of_payment date,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  created_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint debts_pkey primary key (id)
);

create table app.debt_comments (
  id         uuid not null default gen_random_uuid(),
  debt_id    uuid not null,
  author_id  uuid not null,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint debt_comments_pkey primary key (id)
);

create table app.transfer_ceases (
  id              uuid not null default gen_random_uuid(),
  tenant_id       uuid not null,
  provisioning_id uuid,
  assigned_to     uuid,
  type            app.transfer_cease_type not null,
  status          app.transfer_cease_status not null default 'open'::app.transfer_cease_status,
  opened_at       timestamptz not null default now(),
  completed_at    timestamptz,
  created_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint transfer_ceases_pkey primary key (id)
);

create table app.transfer_cease_comments (
  id                uuid not null default gen_random_uuid(),
  transfer_cease_id uuid not null,
  author_id         uuid not null,
  body              text not null,
  created_at        timestamptz not null default now(),
  constraint transfer_cease_comments_pkey primary key (id)
);

create table app.todos (
  id          uuid not null default gen_random_uuid(),
  tenant_id   uuid not null,
  assigned_to uuid not null,
  assigned_by uuid,
  title       text not null,
  description text,
  priority    app.todo_priority not null default 'today'::app.todo_priority,
  link_type   app.todo_link_type,
  link_id     uuid,
  link_label  text,
  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  status      app.todo_status not null default 'not_started'::app.todo_status,
  constraint todos_pkey primary key (id)
);

create table app.todo_comments (
  id         uuid not null default gen_random_uuid(),
  todo_id    uuid not null,
  author_id  uuid not null,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint todo_comments_pkey primary key (id)
);

create table app.user_invitations (
  id               uuid not null default gen_random_uuid(),
  tenant_id        uuid not null,
  invited_by       uuid not null,
  invited_by_email text not null,
  invited_by_name  text not null,
  email            text not null,
  role             app.user_role not null,
  token            text not null,
  status           app.invitation_status not null default 'pending'::app.invitation_status,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint user_invitations_pkey primary key (id),
  constraint user_invitations_token_key unique (token)
);

create table app.audit_logs (
  id         uuid not null default gen_random_uuid(),
  table_name text not null,
  record_id  uuid not null,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  constraint audit_logs_pkey primary key (id)
);

-- ─── Foreign keys ───────────────────────────────────────────────────────────
alter table app.users
  add constraint users_tenant_id_fkey foreign key (tenant_id) references app.tenants(id) on delete restrict;

alter table app.customers
  add constraint customers_tenant_id_fkey foreign key (tenant_id) references app.tenants(id) on delete restrict,
  add constraint customers_assigned_to_fkey foreign key (assigned_to) references app.users(id) on delete set null;

alter table app.deals
  add constraint deals_tenant_id_fkey foreign key (tenant_id) references app.tenants(id) on delete restrict,
  add constraint deals_customer_id_fkey foreign key (customer_id) references app.customers(id) on delete restrict;

alter table app.deal_billing
  add constraint deal_billing_deal_id_fkey foreign key (deal_id) references app.deals(id) on delete cascade;
alter table app.deal_pricing
  add constraint deal_pricing_deal_id_fkey foreign key (deal_id) references app.deals(id) on delete cascade;
alter table app.deal_services
  add constraint deal_services_deal_id_fkey foreign key (deal_id) references app.deals(id) on delete cascade;

alter table app.provisioning
  add constraint provisioning_tenant_id_fkey foreign key (tenant_id) references app.tenants(id) on delete restrict,
  add constraint provisioning_deal_id_fkey foreign key (deal_id) references app.deals(id) on delete restrict,
  add constraint provisioning_customer_id_fkey foreign key (customer_id) references app.customers(id) on delete set null;

alter table app.provisioning_services
  add constraint provisioning_services_provisioning_id_fkey foreign key (provisioning_id) references app.provisioning(id) on delete cascade;

alter table app.faults
  add constraint faults_tenant_id_fkey foreign key (tenant_id) references app.tenants(id),
  add constraint faults_provisioning_id_fkey foreign key (provisioning_id) references app.provisioning(id) on delete set null,
  add constraint faults_assigned_to_fkey foreign key (assigned_to) references app.users(id) on delete set null,
  add constraint faults_created_by_fkey foreign key (created_by) references app.users(id);
alter table app.fault_comments
  add constraint fault_comments_fault_id_fkey foreign key (fault_id) references app.faults(id) on delete cascade,
  add constraint fault_comments_author_id_fkey foreign key (author_id) references app.users(id);

alter table app.complaints
  add constraint complaints_tenant_id_fkey foreign key (tenant_id) references app.tenants(id),
  add constraint complaints_provisioning_id_fkey foreign key (provisioning_id) references app.provisioning(id) on delete set null,
  add constraint complaints_assigned_to_fkey foreign key (assigned_to) references app.users(id) on delete set null,
  add constraint complaints_created_by_fkey foreign key (created_by) references app.users(id);
alter table app.complaint_comments
  add constraint complaint_comments_complaint_id_fkey foreign key (complaint_id) references app.complaints(id) on delete cascade,
  add constraint complaint_comments_author_id_fkey foreign key (author_id) references app.users(id);

alter table app.debts
  add constraint debts_tenant_id_fkey foreign key (tenant_id) references app.tenants(id),
  add constraint debts_provisioning_id_fkey foreign key (provisioning_id) references app.provisioning(id) on delete set null,
  add constraint debts_assigned_to_fkey foreign key (assigned_to) references app.users(id) on delete set null,
  add constraint debts_created_by_fkey foreign key (created_by) references app.users(id);
alter table app.debt_comments
  add constraint debt_comments_debt_id_fkey foreign key (debt_id) references app.debts(id) on delete cascade,
  add constraint debt_comments_author_id_fkey foreign key (author_id) references app.users(id);

alter table app.transfer_ceases
  add constraint transfer_ceases_tenant_id_fkey foreign key (tenant_id) references app.tenants(id),
  add constraint transfer_ceases_provisioning_id_fkey foreign key (provisioning_id) references app.provisioning(id) on delete set null,
  add constraint transfer_ceases_assigned_to_fkey foreign key (assigned_to) references app.users(id) on delete set null,
  add constraint transfer_ceases_created_by_fkey foreign key (created_by) references app.users(id);
alter table app.transfer_cease_comments
  add constraint transfer_cease_comments_transfer_cease_id_fkey foreign key (transfer_cease_id) references app.transfer_ceases(id) on delete cascade,
  add constraint transfer_cease_comments_author_id_fkey foreign key (author_id) references app.users(id);

alter table app.todos
  add constraint todos_tenant_id_fkey foreign key (tenant_id) references app.tenants(id),
  add constraint todos_assigned_to_fkey foreign key (assigned_to) references app.users(id),
  add constraint todos_assigned_by_fkey foreign key (assigned_by) references app.users(id),
  add constraint todos_created_by_fkey foreign key (created_by) references app.users(id);
alter table app.todo_comments
  add constraint todo_comments_todo_id_fkey foreign key (todo_id) references app.todos(id) on delete cascade,
  add constraint todo_comments_author_id_fkey foreign key (author_id) references app.users(id);

alter table app.user_invitations
  add constraint user_invitations_tenant_id_fkey foreign key (tenant_id) references app.tenants(id) on delete restrict;

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index idx_provisioning_customer_id on app.provisioning using btree (customer_id);

-- ─── Functions ──────────────────────────────────────────────────────────────
create or replace function app.audit_trigger()
 returns trigger
 language plpgsql
 security definer
as $function$
DECLARE
  record_id uuid;
  current_user_id uuid;
BEGIN
  -- Read user ID from session config set by the app
  BEGIN
    current_user_id := current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    record_id := OLD.id;
  ELSE
    record_id := NEW.id;
  END IF;

  INSERT INTO app.audit_logs (
    table_name, record_id, action,
    old_data, new_data, changed_by
  ) VALUES (
    TG_TABLE_NAME,
    record_id,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    current_user_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD;
  ELSE RETURN NEW;
  END IF;
END;
$function$;

create or replace function app.normalise_customer()
 returns trigger
 language plpgsql
as $function$
BEGIN
  -- Postcode: remove all spaces, uppercase
  IF NEW.postcode IS NOT NULL THEN
    NEW.postcode = UPPER(REGEXP_REPLACE(NEW.postcode, '\s+', '', 'g'));
  END IF;

  -- Company name: title case
  IF NEW.company_name IS NOT NULL THEN
    NEW.company_name = INITCAP(TRIM(NEW.company_name));
  END IF;

  -- First name: title case
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name = INITCAP(TRIM(NEW.first_name));
  END IF;

  -- Last name: title case
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name = INITCAP(TRIM(NEW.last_name));
  END IF;

  -- Address lines: title case
  IF NEW.address_line_1 IS NOT NULL THEN
    NEW.address_line_1 = INITCAP(TRIM(NEW.address_line_1));
  END IF;
  IF NEW.address_line_2 IS NOT NULL THEN
    NEW.address_line_2 = INITCAP(TRIM(NEW.address_line_2));
  END IF;
  IF NEW.address_line_3 IS NOT NULL THEN
    NEW.address_line_3 = INITCAP(TRIM(NEW.address_line_3));
  END IF;
  IF NEW.address_line_4 IS NOT NULL THEN
    NEW.address_line_4 = INITCAP(TRIM(NEW.address_line_4));
  END IF;

  -- Email: lowercase, trim, null if empty or placeholder
  IF NEW.email IS NOT NULL THEN
    NEW.email = LOWER(TRIM(NEW.email));
    IF NEW.email = '' OR NEW.email = 'noemail@noemail.com' THEN
      NEW.email = NULL;
    END IF;
  END IF;

  -- Mobile: strip all non-numeric characters, null if empty or 0
  IF NEW.mobile IS NOT NULL THEN
    NEW.mobile = REGEXP_REPLACE(TRIM(NEW.mobile), '[^0-9]', '', 'g');
    IF NEW.mobile = '' OR NEW.mobile = '0' THEN
      NEW.mobile = NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ─── Triggers ───────────────────────────────────────────────────────────────
-- Audit trail on 18 tables (not audit_logs, tenants or user_invitations).
create trigger audit_complaint_comments after insert or delete or update on app.complaint_comments for each row execute function app.audit_trigger();
create trigger audit_complaints after insert or delete or update on app.complaints for each row execute function app.audit_trigger();
create trigger audit_customers after insert or delete or update on app.customers for each row execute function app.audit_trigger();
create trigger audit_deal_billing after insert or delete or update on app.deal_billing for each row execute function app.audit_trigger();
create trigger audit_deal_pricing after insert or delete or update on app.deal_pricing for each row execute function app.audit_trigger();
create trigger audit_deal_services after insert or delete or update on app.deal_services for each row execute function app.audit_trigger();
create trigger audit_deals after insert or delete or update on app.deals for each row execute function app.audit_trigger();
create trigger audit_debt_comments after insert or delete or update on app.debt_comments for each row execute function app.audit_trigger();
create trigger audit_debts after insert or delete or update on app.debts for each row execute function app.audit_trigger();
create trigger audit_fault_comments after insert or delete or update on app.fault_comments for each row execute function app.audit_trigger();
create trigger audit_faults after insert or delete or update on app.faults for each row execute function app.audit_trigger();
create trigger audit_provisioning after insert or delete or update on app.provisioning for each row execute function app.audit_trigger();
create trigger audit_provisioning_services after insert or delete or update on app.provisioning_services for each row execute function app.audit_trigger();
create trigger audit_todo_comments after insert or delete or update on app.todo_comments for each row execute function app.audit_trigger();
create trigger audit_todos after insert or delete or update on app.todos for each row execute function app.audit_trigger();
create trigger audit_transfer_cease_comments after insert or delete or update on app.transfer_cease_comments for each row execute function app.audit_trigger();
create trigger audit_transfer_ceases after insert or delete or update on app.transfer_ceases for each row execute function app.audit_trigger();
create trigger audit_users after insert or delete or update on app.users for each row execute function app.audit_trigger();

create trigger normalise_customer_data before insert or update on app.customers for each row execute function app.normalise_customer();

-- ─── Row-level security ─────────────────────────────────────────────────────
-- Not an enforcement layer for the app's own connection (ADR 001); kept
-- exactly as found. Do not weaken.
alter table app.audit_logs enable row level security;
alter table app.complaint_comments enable row level security;
alter table app.complaints enable row level security;
alter table app.customers enable row level security;
alter table app.deal_billing enable row level security;
alter table app.deal_pricing enable row level security;
alter table app.deal_services enable row level security;
alter table app.deals enable row level security;
alter table app.debt_comments enable row level security;
alter table app.debts enable row level security;
alter table app.fault_comments enable row level security;
alter table app.faults enable row level security;
alter table app.provisioning enable row level security;
alter table app.provisioning_services enable row level security;
alter table app.tenants enable row level security;
alter table app.todo_comments enable row level security;
alter table app.todos enable row level security;
alter table app.transfer_cease_comments enable row level security;
alter table app.transfer_ceases enable row level security;
alter table app.user_invitations enable row level security;
alter table app.users enable row level security;

create policy admin_only on app.audit_logs for all
  using (exists (select 1 from app.users u where u.id = auth.uid() and u.role = 'admin'::app.user_role));

create policy authenticated on app.complaint_comments for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.complaints for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.customers for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.deal_billing for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.deal_pricing for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.deal_services for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.deals for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.debt_comments for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.debts for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.fault_comments for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.faults for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.provisioning for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.provisioning_services for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.tenants for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.todo_comments for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.todos for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.transfer_cease_comments for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.transfer_ceases for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.user_invitations for all using (auth.role() = 'authenticated'::text);
create policy authenticated on app.users for all using (auth.role() = 'authenticated'::text);
